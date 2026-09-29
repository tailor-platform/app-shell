import { afterEach, describe, expect, expectTypeOf, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
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
    // @ts-expect-error — date columns can't be edited yet
    column({ id: "sku", type: "date", edit: { onCommit: () => {} } });
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
