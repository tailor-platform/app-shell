import { afterEach, describe, expect, expectTypeOf, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { StrictMode, useState } from "react";
import { createAppShellWrapper } from "../../../tests/test-utils";
import { DataTable } from "./data-table";
import { useDataTable } from "./use-data-table";
import { createColumnHelper } from "./field-helpers";
import type { CellEditState, Column, UseDataTableOptions } from "./types";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

type Line = {
  id: string;
  sku: string;
  status?: string;
  expected?: string | null;
  ordered: number;
  received: number | null;
  price: number;
  currency: string;
  note: string | null;
  supplier: string;
};

const LINES: Line[] = [
  {
    id: "1",
    sku: "TS-M",
    ordered: 24,
    received: 12,
    price: 9.5,
    currency: "USD",
    note: "Box 1",
    supplier: "Acme",
  },
  {
    id: "2",
    sku: "TS-L",
    ordered: 24,
    received: null,
    price: 1200,
    currency: "JPY",
    note: null,
    supplier: "Globex",
  },
  {
    id: "3",
    sku: "TS-XL",
    ordered: 12,
    received: 10,
    price: 4,
    currency: "USD",
    note: "",
    supplier: "Acme",
  },
];

const noop = () => {};

type Update = (id: string, patch: Partial<Line>) => void;

function Harness({
  columns,
  rows: initialRows = LINES,
  options,
}: {
  columns: (update: Update) => Column<Line>[];
  rows?: Line[];
  options?: Partial<UseDataTableOptions<Line>>;
}) {
  const [rows, setRows] = useState(initialRows);
  const update: Update = (id, patch) =>
    setRows((prev) => prev.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  const table = useDataTable<Line>({ columns: columns(update), data: { rows }, ...options });
  return (
    <DataTable.Root value={table}>
      <DataTable.Table />
    </DataTable.Root>
  );
}

function renderTable(ui: React.ReactElement, locale = "en") {
  const user = userEvent.setup();
  render(<MemoryRouter>{ui}</MemoryRouter>, { wrapper: createAppShellWrapper(locale) });
  return user;
}

const { column } = createColumnHelper<Line>();

const skuColumn = column({ id: "sku", label: "SKU", type: "text" });

// "Received": whole numbers, not below 0, not above what was ordered.
function receivedColumn(
  onCommit: (id: string, value: number | null) => void,
  update: Update,
  edit: Partial<{
    canEdit: (row: Line, state: CellEditState) => boolean;
    min: number;
    max: number;
    maxDecimals: number;
  }> = {},
): Column<Line> {
  return column({
    id: "received",
    label: "Received",
    type: "number",
    edit: {
      min: 0,
      maxDecimals: 0,
      validate: (value, row) =>
        value !== null && value > row.ordered ? `Can't exceed ordered (${row.ordered})` : undefined,
      onCommit: (row, value) => {
        onCommit(row.id, value);
        update(row.id, { received: value });
      },
      ...edit,
    },
  });
}

const blocked = (cell: Element | null | undefined) =>
  cell?.className.includes("astw:cursor-not-allowed") ?? false;

// Whether a cell's content leaves the right edge free for a dropdown / date icon.
const hasIconSpace = (cell: Element | undefined) =>
  cell?.querySelector(":scope > span")?.className.includes("astw:pr-5") ?? false;

const errorText = (input: HTMLElement) =>
  document.getElementById(input.getAttribute("aria-describedby") ?? "")?.textContent;

// Focuses a cell and replaces its value. (A real click selects the whole value;
// user-event collapses that selection, so clear explicitly.)
async function retype(user: ReturnType<typeof userEvent.setup>, input: HTMLElement, text: string) {
  await user.click(input);
  await user.clear(input);
  if (text) await user.keyboard(text);
}

describe("DataTable inline editing", () => {
  describe("rendering", () => {
    it("renders an editor only where canEdit allows it, named by the column label", () => {
      renderTable(
        <Harness
          columns={(update) => [
            skuColumn,
            receivedColumn(vi.fn(), update, { canEdit: (row) => row.id !== "2" }),
          ]}
        />,
      );
      const inputs = screen.getAllByRole("textbox", { name: "Received" });
      expect(inputs).toHaveLength(2);
      expect(inputs.map((input) => (input as HTMLInputElement).value)).toEqual(["12", "10"]);
      // Read-only columns don't get an editor at all.
      expect(screen.queryByRole("textbox", { name: "SKU" })).toBeNull();
    });

    it("keeps an editable link cell as text and a read-only one as a link", () => {
      renderTable(
        <Harness
          columns={() => [
            column({
              id: "supplier",
              label: "Supplier",
              type: "link",
              typeOptions: { href: (row) => `/suppliers/${row.supplier}` },
              edit: { canEdit: (row) => row.id === "1", onCommit: () => {} },
            }),
          ]}
        />,
      );
      expect(screen.getAllByRole("textbox", { name: "Supplier" })).toHaveLength(1);
      expect(screen.getAllByRole("link").map((link) => link.textContent)).toEqual([
        "Globex",
        "Acme",
      ]);
    });

    it("keeps rows without an id read-only and warns once", () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      renderTable(
        <Harness
          rows={LINES.map(({ id: _id, ...rest }) => rest as unknown as Line)}
          columns={(update) => [receivedColumn(vi.fn(), update)]}
        />,
      );
      expect(screen.queryAllByRole("textbox")).toHaveLength(0);
      expect(warn).toHaveBeenCalledTimes(1);
      expect(warn.mock.calls[0][0]).toContain("has no `id`");
    });

    it("shows as many decimals as the editor accepts", async () => {
      const user = renderTable(
        <Harness columns={(update) => [receivedColumn(vi.fn(), update, { maxDecimals: 2 })]} />,
      );
      const [input] = screen.getAllByRole("textbox", { name: "Received" });
      await retype(user, input, "2.5{Enter}");
      // A `number` column with no typeOptions rounds to whole numbers; the
      // editor's `maxDecimals` raises that so 2.5 doesn't read back as "3".
      expect(input.parentElement?.textContent).toContain("2.5");
    });
  });

  describe("keyboard", () => {
    it("commits once on Enter and moves down to the next editable row", async () => {
      const onCommit = vi.fn();
      const user = renderTable(
        <StrictMode>
          <Harness
            columns={(update) => [
              receivedColumn(onCommit, update, { canEdit: (row) => row.id !== "2" }),
            ]}
          />
        </StrictMode>,
      );
      const [first, third] = screen.getAllByRole("textbox", { name: "Received" });
      await retype(user, first, "20{Enter}");
      expect(onCommit).toHaveBeenCalledTimes(1);
      expect(onCommit).toHaveBeenCalledWith("1", 20);
      // Row 2 isn't editable, so Enter skips to row 3.
      expect(document.activeElement).toBe(third);
      expect((first as HTMLInputElement).value).toBe("20");
    });

    it("moves up on Shift+Enter", async () => {
      const user = renderTable(<Harness columns={(update) => [receivedColumn(vi.fn(), update)]} />);
      const inputs = screen.getAllByRole("textbox", { name: "Received" });
      await user.click(inputs[2]);
      await user.keyboard("{Shift>}{Enter}{/Shift}");
      expect(document.activeElement).toBe(inputs[1]);
    });

    it("moves to the next editable cell on Tab, skipping read-only columns", async () => {
      const user = renderTable(
        <Harness
          columns={(update) => [
            receivedColumn(vi.fn(), update),
            skuColumn,
            column({
              id: "note",
              label: "Note",
              type: "text",
              edit: { onCommit: (row, value) => update(row.id, { note: value }) },
            }),
          ]}
        />,
      );
      const received = screen.getAllByRole("textbox", { name: "Received" });
      const notes = screen.getAllByRole("textbox", { name: "Note" });
      await user.click(received[0]);
      await user.tab();
      expect(document.activeElement).toBe(notes[0]);
      await user.tab();
      expect(document.activeElement).toBe(received[1]);
      await user.tab({ shift: true });
      expect(document.activeElement).toBe(notes[0]);
    });

    it("reverts the draft on Escape without committing", async () => {
      const onCommit = vi.fn();
      const user = renderTable(
        <Harness columns={(update) => [receivedColumn(onCommit, update)]} />,
      );
      const [input] = screen.getAllByRole("textbox", { name: "Received" });
      await retype(user, input, "7{Escape}");
      expect((input as HTMLInputElement).value).toBe("12");
      await user.tab();
      expect(onCommit).not.toHaveBeenCalled();
    });

    it("selects the whole value when a cell receives focus", () => {
      renderTable(<Harness columns={(update) => [receivedColumn(vi.fn(), update)]} />);
      const [input] = screen.getAllByRole("textbox", { name: "Received" }) as HTMLInputElement[];
      act(() => input.focus());
      expect([input.selectionStart, input.selectionEnd]).toEqual([0, input.value.length]);
    });

    it("ignores Enter while an IME is composing and normalizes full-width digits", async () => {
      const onCommit = vi.fn();
      renderTable(<Harness columns={(update) => [receivedColumn(onCommit, update)]} />);
      const [input] = screen.getAllByRole("textbox", { name: "Received" });
      act(() => input.focus());
      fireEvent.compositionStart(input);
      fireEvent.change(input, { target: { value: "１５" } });
      fireEvent.keyDown(input, { key: "Enter", isComposing: true });
      expect(onCommit).not.toHaveBeenCalled();
      fireEvent.compositionEnd(input);
      fireEvent.keyDown(input, { key: "Enter" });
      expect(onCommit).toHaveBeenCalledWith("1", 15);
    });
  });

  describe("rules", () => {
    it("blocks characters that can never be valid", async () => {
      const user = renderTable(
        <Harness
          columns={(update) => [
            receivedColumn(vi.fn(), update),
            column({
              id: "price",
              label: "Price",
              type: "money",
              typeOptions: { currency: (row) => row.currency },
              edit: { onCommit: (row, value) => update(row.id, { price: value ?? 0 }) },
            }),
          ]}
        />,
      );
      const [received] = screen.getAllByRole("textbox", { name: "Received" });
      // min: 0 blocks "-", maxDecimals: 0 blocks "."
      await retype(user, received, "-3.5");
      expect((received as HTMLInputElement).value).toBe("35");

      const [usd, jpy] = screen.getAllByRole("textbox", { name: "Price" });
      await retype(user, usd, "9.999");
      // USD allows two decimals; the third digit is dropped.
      expect((usd as HTMLInputElement).value).toBe("9.99");
      await retype(user, jpy, "12.5");
      // JPY has no minor unit, so the decimal point can't be typed.
      expect((jpy as HTMLInputElement).value).toBe("125");
    });

    it("judges text inserted in one go (autofill, dictation) instead of dropping it", () => {
      renderTable(<Harness columns={(update) => [receivedColumn(vi.fn(), update)]} />);
      const [input] = screen.getAllByRole("textbox", { name: "Received" }) as HTMLInputElement[];
      act(() => input.focus());
      fireEvent.input(input, {
        target: { value: "3.5" },
        data: "3.5",
        inputType: "insertText",
      });
      expect(input.value).toBe("3.5");
      expect(errorText(input)).toBe("Enter a whole number. Press Esc to undo");
    });

    it("shows an over-the-limit error while typing and blocks Enter", async () => {
      const onCommit = vi.fn();
      const user = renderTable(
        <Harness columns={(update) => [receivedColumn(onCommit, update, { max: 24 })]} />,
      );
      const [input] = screen.getAllByRole("textbox", { name: "Received" });
      await retype(user, input, "30");
      expect(input.getAttribute("aria-invalid")).toBe("true");
      expect(errorText(input)).toBe("Must be 24 or less. Press Esc to undo");
      await user.keyboard("{Enter}");
      expect(onCommit).not.toHaveBeenCalled();
      expect(document.activeElement).toBe(input);
    });

    it("waits for a save attempt before reporting min and required", async () => {
      const onCommit = vi.fn();
      const user = renderTable(
        <Harness
          columns={(update) =>
            [
              column({
                id: "received",
                label: "Received",
                type: "number",
                edit: {
                  min: 10,
                  required: true,
                  onCommit: (row, value) => {
                    onCommit(row.id, value);
                    update(row.id, { received: value });
                  },
                },
              }),
            ] satisfies Column<Line>[]
          }
        />,
      );
      const [input] = screen.getAllByRole("textbox", { name: "Received" });
      await retype(user, input, "5");
      expect(input.getAttribute("aria-invalid")).toBeNull();
      await user.keyboard("{Enter}");
      expect(errorText(input)).toBe("Must be 10 or more. Press Esc to undo");
      await user.keyboard("{Backspace}");
      expect(errorText(input)).toBe("Required. Press Esc to undo");
      await user.keyboard("15{Enter}");
      expect(onCommit).toHaveBeenCalledWith("1", 15);
    });

    it("shows the consumer's own validation message", async () => {
      const user = renderTable(<Harness columns={(update) => [receivedColumn(vi.fn(), update)]} />);
      const [input] = screen.getAllByRole("textbox", { name: "Received" });
      await retype(user, input, "25");
      expect(errorText(input)).toBe("Can't exceed ordered (24). Press Esc to undo");
    });

    it("reverts an invalid value when the cell loses focus", async () => {
      const onCommit = vi.fn();
      const user = renderTable(
        <Harness columns={(update) => [receivedColumn(onCommit, update)]} />,
      );
      const [input] = screen.getAllByRole("textbox", { name: "Received" });
      await retype(user, input, "99");
      await user.click(document.body);
      expect(onCommit).not.toHaveBeenCalled();
      expect((input as HTMLInputElement).value).toBe("12");
      expect(input.getAttribute("aria-invalid")).toBeNull();
    });

    it("localizes messages", async () => {
      const user = renderTable(
        <Harness columns={(update) => [receivedColumn(vi.fn(), update, { max: 24 })]} />,
        "ja",
      );
      const [input] = screen.getAllByRole("textbox", { name: "Received" });
      await retype(user, input, "30");
      expect(errorText(input)).toBe("24以下で入力してください. Escキーで元に戻せます");
    });
  });

  describe("committing", () => {
    it("saves a changed value when the cell loses focus", async () => {
      const onCommit = vi.fn();
      const user = renderTable(
        <Harness columns={(update) => [receivedColumn(onCommit, update)]} />,
      );
      const [input] = screen.getAllByRole("textbox", { name: "Received" });
      await retype(user, input, "18");
      await user.click(document.body);
      expect(onCommit).toHaveBeenCalledWith("1", 18);
    });

    it("treats a value that reads the same as unchanged", async () => {
      const onCommit = vi.fn();
      const user = renderTable(
        <Harness columns={(update) => [receivedColumn(onCommit, update, { maxDecimals: 2 })]} />,
      );
      const [input] = screen.getAllByRole("textbox", { name: "Received" });
      await retype(user, input, "12.00{Enter}");
      await user.click(input);
      await user.keyboard("{Enter}");
      expect(onCommit).not.toHaveBeenCalled();
    });

    it("cleans up pasted numbers and reports text it can't read", async () => {
      const onCommit = vi.fn();
      const user = renderTable(
        <Harness
          columns={(update) => [
            column({
              id: "received",
              label: "Received",
              type: "number",
              edit: {
                maxDecimals: 1,
                onCommit: (row, value) => {
                  onCommit(row.id, value);
                  update(row.id, { received: value });
                },
              },
            }),
          ]}
        />,
      );
      const [first, second] = screen.getAllByRole("textbox", { name: "Received" });
      await retype(user, first, "");
      await user.paste("1,234.5");
      await user.keyboard("{Enter}");
      expect(onCommit).toHaveBeenCalledWith("1", 1234.5);

      await retype(user, second, "");
      await user.paste("abc");
      await user.keyboard("{Enter}");
      expect(errorText(second)).toBe("Enter a number. Press Esc to undo");
      expect(onCommit).toHaveBeenCalledTimes(1);
    });

    it("commits text as typed and an emptied cell as null", async () => {
      const onCommit = vi.fn();
      const user = renderTable(
        <Harness
          columns={(update) => [
            column({
              id: "note",
              label: "Note",
              type: "text",
              edit: {
                onCommit: (row, value) => {
                  onCommit(row.id, value);
                  update(row.id, { note: value });
                },
              },
            }),
          ]}
        />,
      );
      const [first] = screen.getAllByRole("textbox", { name: "Note" });
      await retype(user, first, "Box 2{Enter}");
      await retype(user, first, "{Enter}");
      expect(onCommit.mock.calls).toEqual([
        ["1", "Box 2"],
        ["1", null],
      ]);
    });

    it("keeps showing a pending save, and reverts when it fails", async () => {
      let reject = noop;
      let resolve = noop;
      const onCommit = vi
        .fn()
        .mockImplementationOnce(() => new Promise<void>((_, r) => (reject = () => r(new Error()))))
        .mockImplementationOnce(() => new Promise<void>((r) => (resolve = r)));
      const user = renderTable(
        <Harness
          columns={() => [
            column({ id: "received", label: "Received", type: "number", edit: { onCommit } }),
          ]}
        />,
      );
      const [input] = screen.getAllByRole("textbox", { name: "Received" });
      await retype(user, input, "20{Enter}");
      expect((input as HTMLInputElement).value).toBe("20");
      await act(async () => reject());
      expect((input as HTMLInputElement).value).toBe("12");

      await retype(user, input, "21{Enter}");
      await act(async () => resolve());
      // Saved, but `data` never changed: the saved value stays on screen.
      expect((input as HTMLInputElement).value).toBe("21");
    });
  });

  describe("interplay", () => {
    it("lets canEdit follow row selection", async () => {
      const user = renderTable(
        <Harness
          columns={(update) => [
            receivedColumn(vi.fn(), update, { canEdit: (_, { selected }) => selected }),
          ]}
          options={{ onSelectionChange: () => {} }}
        />,
      );
      expect(screen.queryAllByRole("textbox")).toHaveLength(0);
      const [selectFirst] = screen.getAllByRole("checkbox", { name: "Select row" });
      await user.click(selectFirst);
      expect(screen.getAllByRole("textbox", { name: "Received" })).toHaveLength(1);
      await user.click(selectFirst);
      expect(screen.queryAllByRole("textbox")).toHaveLength(0);
    });

    it("shows a not-allowed cursor on read-only cells of a table people edit", () => {
      renderTable(
        <Harness
          columns={(update) => [
            skuColumn,
            receivedColumn(vi.fn(), update, { canEdit: (row) => row.id !== "2" }),
          ]}
        />,
      );
      const skuCell = screen.getByText("TS-M").closest("td");
      const [editable] = screen.getAllByRole("textbox", { name: "Received" });
      const lockedRow = screen.getByText("TS-L").closest("tr");
      expect(blocked(skuCell)).toBe(true);
      expect(blocked(editable.closest("td"))).toBe(false);
      // Row 2's Received cell is locked by canEdit.
      expect(blocked(lockedRow?.querySelectorAll("td")[1])).toBe(true);
    });

    it("keeps the default cursor when no column is editable, or rows are clickable", () => {
      renderTable(<Harness columns={() => [skuColumn]} />);
      expect(screen.getByText("TS-M").closest("td")?.className).not.toContain("cursor-not-allowed");
      cleanup();
      renderTable(
        <Harness
          columns={(update) => [skuColumn, receivedColumn(vi.fn(), update)]}
          options={{ onClickRow: () => {} }}
        />,
      );
      expect(screen.getByText("TS-M").closest("td")?.className).not.toContain("cursor-not-allowed");
    });

    it("never fires onClickRow from an editable cell", async () => {
      const onClickRow = vi.fn();
      const user = renderTable(
        <Harness
          columns={(update) => [skuColumn, receivedColumn(vi.fn(), update)]}
          options={{ onClickRow }}
        />,
      );
      await user.click(screen.getAllByRole("textbox", { name: "Received" })[0]);
      expect(onClickRow).not.toHaveBeenCalled();
      await user.click(screen.getByText("TS-M"));
      expect(onClickRow).toHaveBeenCalledTimes(1);
    });
  });

  describe("dropdowns", () => {
    const SUPPLIERS = [
      { value: "acme", label: "Acme Corp" },
      { value: "globex", label: "Globex" },
    ];

    function supplierColumn(
      onCommit: (id: string, value: string | null) => void,
      update: Update,
      edit: { required?: boolean; validate?: (value: string | null) => string | undefined } = {},
    ): Column<Line> {
      return column({
        id: "supplier",
        label: "Supplier",
        type: "text",
        edit: {
          options: SUPPLIERS,
          ...edit,
          onCommit: (row, value) => {
            onCommit(row.id, value);
            update(row.id, { supplier: value ?? "" });
          },
        },
      });
    }

    const rowsWith = (supplier: string) => LINES.map((line) => ({ ...line, supplier }));

    it("shows choice labels and commits the picked value", async () => {
      const onCommit = vi.fn();
      const user = renderTable(
        <Harness
          rows={rowsWith("acme")}
          columns={(update) => [supplierColumn(onCommit, update)]}
        />,
      );
      const [trigger] = screen.getAllByRole("combobox", { name: "Supplier" });
      expect(trigger.closest("td")?.textContent).toContain("Acme Corp");
      await user.click(trigger);
      await user.click(await screen.findByRole("option", { name: "Globex" }));
      expect(onCommit).toHaveBeenCalledWith("1", "globex");
      expect(trigger.closest("td")?.textContent).toContain("Globex");
    });

    it("offers None unless the column is required", async () => {
      const onCommit = vi.fn();
      const user = renderTable(
        <Harness
          rows={rowsWith("acme")}
          columns={(update) => [supplierColumn(onCommit, update)]}
        />,
      );
      await user.click(screen.getAllByRole("combobox", { name: "Supplier" })[0]);
      await user.click(await screen.findByRole("option", { name: "None" }));
      expect(onCommit).toHaveBeenCalledWith("1", null);

      cleanup();
      const user2 = renderTable(
        <Harness
          rows={rowsWith("acme")}
          columns={(update) => [supplierColumn(onCommit, update, { required: true })]}
        />,
      );
      await user2.click(screen.getAllByRole("combobox", { name: "Supplier" })[0]);
      await screen.findByRole("option", { name: "Globex" });
      expect(screen.queryByRole("option", { name: "None" })).toBeNull();
    });

    it("lets validate reject a pick", async () => {
      const onCommit = vi.fn();
      const user = renderTable(
        <Harness
          rows={rowsWith("acme")}
          columns={(update) => [
            supplierColumn(onCommit, update, {
              validate: (value) => (value === "globex" ? "Globex is on hold" : undefined),
            }),
          ]}
        />,
      );
      const [trigger] = screen.getAllByRole("combobox", { name: "Supplier" });
      await user.click(trigger);
      await user.click(await screen.findByRole("option", { name: "Globex" }));
      expect(onCommit).not.toHaveBeenCalled();
      expect(trigger.getAttribute("aria-invalid")).toBe("true");
      expect(errorText(trigger)).toBe("Globex is on hold");
    });

    it("shows a read-only link cell's choice label as the link", () => {
      renderTable(
        <Harness
          rows={rowsWith("globex")}
          columns={() => [
            column({
              id: "supplier",
              label: "Supplier",
              type: "link",
              typeOptions: { href: (row) => `/suppliers/${row.supplier}` },
              edit: { options: SUPPLIERS, canEdit: (row) => row.id === "1", onCommit: () => {} },
            }),
          ]}
        />,
      );
      expect(screen.getAllByRole("combobox", { name: "Supplier" })).toHaveLength(1);
      expect(screen.getAllByRole("link").map((link) => link.textContent)).toEqual([
        "Globex",
        "Globex",
      ]);
    });

    it("keeps the icon's space on read-only rows too, so the column's width never shifts", () => {
      renderTable(
        <Harness
          rows={rowsWith("globex")}
          columns={() => [
            skuColumn,
            column({
              id: "supplier",
              label: "Supplier",
              type: "text",
              edit: { options: SUPPLIERS, canEdit: (row) => row.id === "1", onCommit: noop },
            }),
          ]}
        />,
      );
      const rows = screen.getAllByRole("row").slice(1);
      // Row 1 is editable and rows 2 and 3 are read-only: all three keep the space.
      expect(rows.map((row) => hasIconSpace(row.querySelectorAll("td")[1]))).toEqual([
        true,
        true,
        true,
      ]);
      // A column without a dropdown or calendar doesn't.
      expect(hasIconSpace(rows[1].querySelectorAll("td")[0])).toBe(false);
    });

    it("offers a badge column's labelled values as badges", async () => {
      const onCommit = vi.fn();
      const user = renderTable(
        <Harness
          rows={LINES.map((line) => ({ ...line, status: "pending" }))}
          columns={(update) => [
            column({
              id: "status",
              label: "Status",
              type: "badge",
              typeOptions: {
                badgeLabelMap: { pending: "Pending", received: "Received" },
                badgeVariantMap: { pending: "outline-neutral", received: "success" },
              },
              edit: {
                required: true,
                onCommit: (row, value) => {
                  onCommit(row.id, value);
                  update(row.id, { status: value ?? undefined });
                },
              },
            }),
          ]}
        />,
      );
      const [trigger] = screen.getAllByRole("combobox", { name: "Status" });
      await user.click(trigger);
      const received = await screen.findByRole("option", { name: "Received" });
      expect(received.querySelector('[data-slot="badge"], .astw\\:inline-flex')).not.toBeNull();
      await user.click(received);
      expect(onCommit).toHaveBeenCalledWith("1", "received");
      expect(trigger.closest("td")?.textContent).toContain("Received");
    });

    it("keeps a badge cell with several values read-only", () => {
      renderTable(
        <Harness
          rows={LINES.map((line, i) =>
            i === 0 ? { ...line, status: ["pending", "partial"] as unknown as string } : line,
          )}
          columns={() => [
            column({
              id: "status",
              label: "Status",
              type: "badge",
              typeOptions: { badgeLabelMap: { pending: "Pending", partial: "Partial" } },
              edit: { onCommit: () => {} },
            }),
          ]}
        />,
      );
      // Rows 2 and 3 have no status, so only row 1's list cell is at stake.
      expect(screen.queryAllByRole("combobox", { name: "Status" })).toHaveLength(2);
    });

    it("isn't editable when a badge column has no choices to offer", () => {
      renderTable(
        <Harness
          rows={LINES.map((line) => ({ ...line, status: "pending" }))}
          columns={() => [
            column({ id: "status", label: "Status", type: "badge", edit: { onCommit: () => {} } }),
          ]}
        />,
      );
      expect(screen.queryAllByRole("combobox")).toHaveLength(0);
    });

    it("moves on with Tab from a closed dropdown", async () => {
      const user = renderTable(
        <Harness
          rows={rowsWith("acme")}
          columns={(update) => [supplierColumn(vi.fn(), update), receivedColumn(vi.fn(), update)]}
        />,
      );
      const [supplier] = screen.getAllByRole("combobox", { name: "Supplier" });
      act(() => supplier.focus());
      await user.tab();
      expect(document.activeElement).toBe(screen.getAllByRole("textbox", { name: "Received" })[0]);
    });
  });

  describe("dates", () => {
    const dateRows = LINES.map((line) => ({ ...line, expected: "2026-10-02" }));

    function expectedColumn(
      onCommit: (id: string, value: string | null) => void,
      update: Update,
      edit: { required?: boolean; datetime?: boolean } = {},
    ): Column<Line> {
      return column({
        id: "expected",
        label: "Expected",
        type: "date",
        typeOptions: { dateFormat: edit.datetime ? "datetime" : "short" },
        edit: {
          required: edit.required,
          onCommit: (row, value) => {
            onCommit(row.id, value);
            update(row.id, { expected: value });
          },
        },
      });
    }

    const dayButton = (day: string) =>
      within(document.querySelector<HTMLElement>('[data-slot="data-table-cell-calendar"]')!)
        .getAllByRole("button")
        .find((button) => button.textContent === day && !button.dataset.outsideMonth)!;

    it("shows a date-only value as that day in any time zone", () => {
      const tz = process.env.TZ;
      process.env.TZ = "America/Los_Angeles";
      try {
        renderTable(
          <Harness
            rows={dateRows}
            columns={() => [
              column({
                id: "expected",
                label: "Expected",
                type: "date",
                typeOptions: { locale: "en-US" },
              }),
            ]}
          />,
        );
        expect(screen.getAllByText("Oct 2, 2026")).toHaveLength(3);
      } finally {
        process.env.TZ = tz;
      }
    });

    it("names the date trigger with its current value", () => {
      renderTable(
        <Harness
          rows={dateRows}
          columns={() => [
            column({
              id: "expected",
              label: "Expected",
              type: "date",
              typeOptions: { locale: "en-US" },
              edit: { onCommit: () => {} },
            }),
          ]}
        />,
      );
      expect(screen.getAllByRole("button", { name: "Expected, Oct 2, 2026" })).toHaveLength(3);
    });

    it("commits a picked day as YYYY-MM-DD", async () => {
      const onCommit = vi.fn();
      const user = renderTable(
        <Harness rows={dateRows} columns={(update) => [expectedColumn(onCommit, update)]} />,
      );
      await user.click(screen.getAllByRole("button", { name: /^Expected/ })[0]);
      await user.click(dayButton("15"));
      expect(onCommit).toHaveBeenCalledWith("1", "2026-10-15");
    });

    it("opens an empty bounded calendar on the nearest day that can be picked", async () => {
      const user = renderTable(
        <Harness
          rows={LINES.map((line) => ({ ...line, expected: null }))}
          columns={() => [
            column({
              id: "expected",
              label: "Expected",
              type: "date",
              edit: { min: "2099-03-01", onCommit: () => {} },
            }),
          ]}
        />,
      );
      await user.click(screen.getAllByRole("button", { name: /^Expected/ })[0]);
      expect(
        document.querySelector('[data-slot="data-table-cell-calendar"]')?.textContent,
      ).toContain("March 2099");
    });

    it("clears to null unless the column is required", async () => {
      const onCommit = vi.fn();
      const user = renderTable(
        <Harness rows={dateRows} columns={(update) => [expectedColumn(onCommit, update)]} />,
      );
      await user.click(screen.getAllByRole("button", { name: /^Expected/ })[0]);
      await user.click(screen.getByRole("button", { name: "Clear" }));
      expect(onCommit).toHaveBeenCalledWith("1", null);

      cleanup();
      const user2 = renderTable(
        <Harness
          rows={dateRows}
          columns={(update) => [expectedColumn(onCommit, update, { required: true })]}
        />,
      );
      await user2.click(screen.getAllByRole("button", { name: /^Expected/ })[0]);
      expect(screen.queryByRole("button", { name: "Clear" })).toBeNull();
    });

    it("commits a date-time as an ISO timestamp when Done is pressed", async () => {
      const onCommit = vi.fn();
      const user = renderTable(
        <Harness
          rows={dateRows}
          columns={(update) => [expectedColumn(onCommit, update, { datetime: true })]}
        />,
      );
      await user.click(screen.getAllByRole("button", { name: /^Expected/ })[0]);
      await user.click(dayButton("20"));
      fireEvent.change(screen.getByLabelText("Expected (Choose time)"), {
        target: { value: "14:30" },
      });
      await user.click(screen.getByRole("button", { name: "Done" }));
      expect(onCommit).toHaveBeenCalledWith("1", new Date(2026, 9, 20, 14, 30).toISOString());
    });
  });

  it("drops an unticked row's editor from Enter navigation", async () => {
    const user = renderTable(
      <Harness
        columns={(update) => [
          receivedColumn(vi.fn(), update, { canEdit: (_, { selected }) => selected }),
        ]}
        options={{ onSelectionChange: () => {} }}
      />,
    );
    const boxes = screen.getAllByRole("checkbox", { name: "Select row" });
    for (const box of boxes) await user.click(box);
    await user.click(boxes[1]);
    const [first, third] = screen.getAllByRole("textbox", { name: "Received" });
    act(() => first.focus());
    await user.keyboard("{Enter}");
    expect(document.activeElement).toBe(third);
  });

  it("types each column's edit config", () => {
    column({
      id: "received",
      type: "number",
      edit: {
        canEdit: (row, state) => {
          expectTypeOf(row).toEqualTypeOf<Line>();
          expectTypeOf(state).toEqualTypeOf<CellEditState>();
          return true;
        },
        onCommit: (_row, value) => {
          expectTypeOf(value).toEqualTypeOf<number | null>();
        },
      },
    });
    column({
      id: "received",
      type: "money",
      edit: {
        // `required` is enforced at runtime; the callbacks keep one signature.
        required: true,
        validate: (value, row) => {
          expectTypeOf(value).toEqualTypeOf<number | null>();
          expectTypeOf(row).toEqualTypeOf<Line>();
          return undefined;
        },
        onCommit: (_row, value) => {
          expectTypeOf(value).toEqualTypeOf<number | null>();
        },
      },
    });
    column({
      id: "note",
      type: "text",
      edit: {
        onCommit: (_row, value) => {
          expectTypeOf(value).toEqualTypeOf<string | null>();
        },
      },
    });
    column({
      id: "supplier",
      type: "link",
      typeOptions: { href: () => "/" },
      edit: { onCommit: async () => {} },
    });
    // @ts-expect-error — `min` is a number / money rule
    column({ id: "note", type: "text", edit: { min: 0, onCommit: () => {} } });
    column({
      id: "expected",
      type: "date",
      edit: {
        min: "2026-01-01",
        onCommit: (_row, value) => {
          expectTypeOf(value).toEqualTypeOf<string | null>();
        },
      },
    });
    column({
      id: "status",
      type: "badge",
      edit: {
        options: [{ value: "open", label: "Open" }],
        onCommit: (_row, value) => {
          expectTypeOf(value).toEqualTypeOf<string | null>();
        },
      },
    });
    column({
      id: "supplier",
      type: "text",
      edit: { options: [{ value: "acme", label: "Acme" }], onCommit: () => {} },
    });
    // @ts-expect-error — dropdown choices aren't a number / money option
    column({ id: "received", type: "number", edit: { options: [], onCommit: () => {} } });
    // @ts-expect-error — columns without a `type` have no built-in editor
    column({ id: "sku", render: () => null, edit: { onCommit: () => {} } });
    column({
      id: "received",
      type: "number",
      // @ts-expect-error — the committed value can be null (an emptied cell)
      edit: { onCommit: (_row, _value: number) => {} },
    });
  });
});
