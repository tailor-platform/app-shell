import { afterEach, describe, expect, expectTypeOf, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Link, MemoryRouter, createMemoryRouter } from "react-router";
import { RouterProvider } from "react-router/dom";
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

function renderInAppRouter(ui: React.ReactElement) {
  const user = userEvent.setup();
  const router = createMemoryRouter([
    {
      path: "/",
      element: (
        <>
          {ui}
          <Link to="/elsewhere">Elsewhere</Link>
        </>
      ),
    },
    { path: "/elsewhere", element: <p>Somewhere else</p> },
  ]);
  render(<RouterProvider router={router} />, { wrapper: createAppShellWrapper("en") });
  return user;
}

function wouldWarnOnUnload() {
  const event = new Event("beforeunload", { cancelable: true });
  window.dispatchEvent(event);
  return event.defaultPrevented;
}

const { column } = createColumnHelper<Line>();

const skuColumn = column({ id: "sku", label: "SKU", type: "text" });

function receivedColumn(
  onValueCommitted: (id: string, value: number | null) => void,
  update: Update,
  edit: { canEdit?: (row: Line, state: CellEditState) => boolean } = {},
): Column<Line> {
  return column({
    id: "received",
    label: "Received",
    type: "number",
    edit: {
      onValueCommitted: (row, value) => {
        onValueCommitted(row.id, value);
        update(row.id, { received: value });
      },
      ...edit,
    },
  });
}

const blocked = (cell: Element | null | undefined) =>
  cell?.className.includes("astw:cursor-not-allowed") ?? false;

const hasIconSpace = (cell: Element | undefined) =>
  cell?.querySelector(":scope > span")?.className.includes("astw:pr-5") ?? false;

const errorText = (input: HTMLElement) =>
  document.getElementById(input.getAttribute("aria-describedby") ?? "")?.textContent;

// user-event collapses the real editor's select-all, so replace explicitly.
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
              edit: { canEdit: (row) => row.id === "1", onValueCommitted: noop },
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

    it("uses typeOptions for display precision", async () => {
      const user = renderTable(
        <Harness
          columns={(update) => [
            column({
              id: "received",
              label: "Received",
              type: "number",
              typeOptions: { maxDecimals: 2 },
              edit: { onValueCommitted: (row, value) => update(row.id, { received: value }) },
            }),
          ]}
        />,
      );
      const [input] = screen.getAllByRole("textbox", { name: "Received" });
      await retype(user, input, "2.5{Enter}");
      expect(input.parentElement?.textContent).toContain("2.5");
    });
  });

  describe("keyboard", () => {
    it("notifies once on Enter without moving focus or notifying again on Tab", async () => {
      const onValueCommitted = vi.fn();
      const user = renderTable(
        <StrictMode>
          <Harness
            columns={(update) => [
              receivedColumn(onValueCommitted, update, { canEdit: (row) => row.id !== "2" }),
            ]}
          />
        </StrictMode>,
      );
      const [first, third] = screen.getAllByRole("textbox", { name: "Received" });
      await retype(user, first, "20{Enter}");
      expect(onValueCommitted).toHaveBeenCalledTimes(1);
      expect(onValueCommitted).toHaveBeenCalledWith("1", 20);
      expect(document.activeElement).toBe(first);
      expect((first as HTMLInputElement).value).toBe("20");
      expect(first.getAttribute("enterkeyhint")).toBe("done");
      await user.keyboard("{Enter}");
      await user.tab();
      expect(document.activeElement).toBe(third);
      expect(onValueCommitted).toHaveBeenCalledTimes(1);
    });

    it("confirms on Shift+Enter without moving focus", async () => {
      const onValueCommitted = vi.fn();
      const user = renderTable(
        <Harness columns={(update) => [receivedColumn(onValueCommitted, update)]} />,
      );
      const inputs = screen.getAllByRole("textbox", { name: "Received" });
      await retype(user, inputs[2], "11");
      await user.keyboard("{Shift>}{Enter}{/Shift}");
      expect(onValueCommitted).toHaveBeenCalledExactlyOnceWith("3", 11);
      expect(document.activeElement).toBe(inputs[2]);
    });

    it("moves to the next editable cell on Tab, skipping read-only columns", async () => {
      const onValueCommitted = vi.fn();
      const user = renderTable(
        <Harness
          columns={(update) => [
            receivedColumn(onValueCommitted, update),
            skuColumn,
            column({
              id: "note",
              label: "Note",
              type: "text",
              edit: { onValueCommitted: (row, value) => update(row.id, { note: value }) },
            }),
          ]}
        />,
      );
      const received = screen.getAllByRole("textbox", { name: "Received" });
      const notes = screen.getAllByRole("textbox", { name: "Note" });
      await retype(user, received[0], "18");
      await user.tab();
      expect(onValueCommitted).toHaveBeenCalledTimes(1);
      expect(onValueCommitted).toHaveBeenCalledWith("1", 18);
      expect(document.activeElement).toBe(notes[0]);
      await user.tab();
      expect(document.activeElement).toBe(received[1]);
      await user.tab({ shift: true });
      expect(document.activeElement).toBe(notes[0]);
    });

    it("reverts the draft on Escape without notifying", async () => {
      const onValueCommitted = vi.fn();
      const user = renderTable(
        <Harness columns={(update) => [receivedColumn(onValueCommitted, update)]} />,
      );
      const [input] = screen.getAllByRole("textbox", { name: "Received" });
      await retype(user, input, "7{Escape}");
      expect((input as HTMLInputElement).value).toBe("12");
      await user.tab();
      expect(onValueCommitted).not.toHaveBeenCalled();
    });

    it("selects the whole value when a cell receives focus", () => {
      renderTable(<Harness columns={(update) => [receivedColumn(vi.fn(), update)]} />);
      const [input] = screen.getAllByRole("textbox", { name: "Received" }) as HTMLInputElement[];
      act(() => input.focus());
      expect([input.selectionStart, input.selectionEnd]).toEqual([0, input.value.length]);
    });

    it("ignores Enter while an IME is composing and parses full-width digits", () => {
      const onValueCommitted = vi.fn();
      renderTable(<Harness columns={(update) => [receivedColumn(onValueCommitted, update)]} />);
      const [input] = screen.getAllByRole("textbox", { name: "Received" });
      act(() => input.focus());
      fireEvent.compositionStart(input);
      fireEvent.change(input, { target: { value: "１５" } });
      fireEvent.keyDown(input, { key: "Enter", isComposing: true });
      expect(onValueCommitted).not.toHaveBeenCalled();
      fireEvent.compositionEnd(input);
      fireEvent.keyDown(input, { key: "Enter" });
      expect(onValueCommitted).toHaveBeenCalledWith("1", 15);
      expect(document.activeElement).toBe(input);
    });
  });

  describe("parsing", () => {
    it("accepts negative and fractional numbers independently of display precision", async () => {
      const onValueCommitted = vi.fn();
      const user = renderTable(
        <Harness
          columns={(update) => [
            column({
              id: "received",
              label: "Received",
              type: "number",
              typeOptions: { maxDecimals: 0 },
              edit: {
                onValueCommitted: (row, value) => {
                  onValueCommitted(row.id, value);
                  update(row.id, { received: value });
                },
              },
            }),
          ]}
        />,
      );
      const [input] = screen.getAllByRole("textbox", { name: "Received" });
      await retype(user, input, "-3.5678{Enter}");
      expect(onValueCommitted).toHaveBeenCalledWith("1", -3.5678);
      expect((input as HTMLInputElement).value).toBe("-3.5678");
      expect(input.getAttribute("aria-invalid")).toBeNull();
    });

    it("does not restrict money input to the currency's display precision", async () => {
      const onValueCommitted = vi.fn();
      const user = renderTable(
        <Harness
          columns={(update) => [
            column({
              id: "price",
              label: "Price",
              type: "money",
              typeOptions: { currency: (row) => row.currency },
              edit: {
                onValueCommitted: (row, value) => {
                  onValueCommitted(row.id, value);
                  update(row.id, { price: value ?? 0 });
                },
              },
            }),
          ]}
        />,
      );
      const [usd, jpy] = screen.getAllByRole("textbox", { name: "Price" });
      await retype(user, usd, "9.999{Enter}");
      await retype(user, jpy, "12.5{Enter}");
      expect(onValueCommitted.mock.calls).toEqual([
        ["1", 9.999],
        ["2", 12.5],
      ]);
    });

    it("reads full-width digits and thousands separators on confirmation", async () => {
      const onValueCommitted = vi.fn();
      const user = renderTable(
        <Harness columns={(update) => [receivedColumn(onValueCommitted, update)]} />,
      );
      const [first, second] = screen.getAllByRole("textbox", { name: "Received" });
      await user.click(first);
      await user.clear(first);
      await user.paste("1,234.50");
      await user.keyboard("{Enter}");
      expect(onValueCommitted).toHaveBeenCalledWith("1", 1234.5);
      await retype(user, second, "１５００{Enter}");
      expect(onValueCommitted).toHaveBeenCalledWith("2", 1500);
    });

    it("flags malformed numbers only on confirmation and holds Enter and Tab", async () => {
      const onValueCommitted = vi.fn();
      const user = renderTable(
        <Harness columns={(update) => [receivedColumn(onValueCommitted, update)]} />,
      );
      const [input] = screen.getAllByRole("textbox", { name: "Received" });
      await retype(user, input, "abc");
      expect(input.getAttribute("aria-invalid")).toBeNull();
      await user.keyboard("{Enter}");
      expect(input.getAttribute("aria-invalid")).toBe("true");
      expect(errorText(input)).toBe("Enter a number. Press Esc to undo");
      expect(document.activeElement).toBe(input);
      await user.tab();
      expect(document.activeElement).toBe(input);
      expect(onValueCommitted).not.toHaveBeenCalled();
      await user.keyboard("{Escape}");
      expect((input as HTMLInputElement).value).toBe("12");
      expect(input.getAttribute("aria-invalid")).toBeNull();
    });

    it("clears the parsing error after the malformed number is corrected", async () => {
      const onValueCommitted = vi.fn();
      const user = renderTable(
        <Harness columns={(update) => [receivedColumn(onValueCommitted, update)]} />,
      );
      const [input] = screen.getAllByRole("textbox", { name: "Received" });
      await retype(user, input, "-{Enter}");
      expect(input.getAttribute("aria-invalid")).toBe("true");
      await user.keyboard("3");
      expect(input.getAttribute("aria-invalid")).toBeNull();
      await user.keyboard("{Enter}");
      expect(onValueCommitted).toHaveBeenCalledWith("1", -3);
    });

    it("discards an unparseable draft on blur without changing data", async () => {
      const onValueCommitted = vi.fn();
      const user = renderTable(
        <Harness columns={(update) => [receivedColumn(onValueCommitted, update)]} />,
      );
      const [input] = screen.getAllByRole("textbox", { name: "Received" });
      await retype(user, input, "1,5{Enter}");
      await user.click(document.body);
      expect(onValueCommitted).not.toHaveBeenCalled();
      expect((input as HTMLInputElement).value).toBe("12");
      expect(input.getAttribute("aria-invalid")).toBeNull();
      expect(input.className).not.toContain("astw:ring-status-attention");
    });

    it("localizes the parsing message", async () => {
      const user = renderTable(
        <Harness columns={(update) => [receivedColumn(vi.fn(), update)]} />,
        "ja",
      );
      const [input] = screen.getAllByRole("textbox", { name: "Received" });
      await retype(user, input, "abc{Enter}");
      expect(errorText(input)).toBe("数値を入力してください. Escキーで元に戻せます");
    });
  });

  describe("consumer-owned values", () => {
    it("notifies on blur, but never for intermediate keystrokes", async () => {
      const onValueCommitted = vi.fn();
      const user = renderTable(
        <Harness columns={(update) => [receivedColumn(onValueCommitted, update)]} />,
      );
      const [input] = screen.getAllByRole("textbox", { name: "Received" });
      await retype(user, input, "18");
      expect(onValueCommitted).not.toHaveBeenCalled();
      await user.click(document.body);
      expect(onValueCommitted).toHaveBeenCalledTimes(1);
      expect(onValueCommitted).toHaveBeenCalledWith("1", 18);
    });

    it("does not notify when numeric formatting alone changes", async () => {
      const onValueCommitted = vi.fn();
      const user = renderTable(
        <Harness columns={(update) => [receivedColumn(onValueCommitted, update)]} />,
      );
      const [input] = screen.getAllByRole("textbox", { name: "Received" });
      await retype(user, input, "12.00{Enter}");
      await user.click(input);
      await user.keyboard("{Enter}");
      expect(onValueCommitted).not.toHaveBeenCalled();
    });

    it("preserves safe integers when editing and notifies distinct values", async () => {
      const onValueCommitted = vi.fn();
      const user = renderTable(
        <Harness
          rows={[{ ...LINES[0], received: 1234567890123456 }]}
          columns={(update) => [receivedColumn(onValueCommitted, update)]}
        />,
      );
      const input = screen.getByRole("textbox", { name: "Received" }) as HTMLInputElement;
      expect(input.value).toBe("1234567890123456");
      await retype(user, input, "1234567890123457{Enter}");
      expect(onValueCommitted).toHaveBeenCalledExactlyOnceWith("1", 1234567890123457);
      expect(input.value).toBe("1234567890123457");
    });

    it("notifies text as typed and empty text or number cells as null", async () => {
      const onValueCommitted = vi.fn();
      const user = renderTable(
        <Harness
          columns={(update) => [
            receivedColumn(onValueCommitted, update),
            column({
              id: "note",
              label: "Note",
              type: "text",
              edit: {
                onValueCommitted: (row, value) => {
                  onValueCommitted(row.id, value);
                  update(row.id, { note: value });
                },
              },
            }),
          ]}
        />,
      );
      const [note] = screen.getAllByRole("textbox", { name: "Note" });
      await retype(user, note, " Box 2 {Enter}");
      await retype(user, note, "{Enter}");
      const [received] = screen.getAllByRole("textbox", { name: "Received" });
      await retype(user, received, "{Enter}");
      expect(onValueCommitted.mock.calls).toEqual([
        ["1", " Box 2 "],
        ["1", null],
        ["1", null],
      ]);
    });

    it("lets the consumer reject a change without retaining it or blocking movement", async () => {
      const onValueCommitted = vi.fn();
      const user = renderTable(
        <Harness
          columns={(update) => [
            column({
              id: "received",
              label: "Received",
              type: "number",
              edit: {
                onValueCommitted: (row, value) => {
                  onValueCommitted(row.id, value);
                  if (value !== null && value > row.ordered) return;
                  update(row.id, { received: value });
                },
              },
            }),
          ]}
        />,
      );
      const [first, second] = screen.getAllByRole("textbox", { name: "Received" });
      await retype(user, first, "99{Tab}");
      expect(onValueCommitted).toHaveBeenCalledTimes(1);
      expect(onValueCommitted).toHaveBeenCalledWith("1", 99);
      expect((first as HTMLInputElement).value).toBe("12");
      expect(first.getAttribute("aria-invalid")).toBeNull();
      expect(document.activeElement).toBe(second);
      await retype(user, first, "98");
      await user.click(document.body);
      expect(onValueCommitted).toHaveBeenCalledWith("1", 98);
      expect((first as HTMLInputElement).value).toBe("12");
    });

    it("shows the consumer's normalized value instead of keeping the submitted draft", async () => {
      const onValueCommitted = vi.fn();
      const user = renderTable(
        <Harness
          columns={(update) => [
            column({
              id: "note",
              label: "Note",
              type: "text",
              edit: {
                onValueCommitted: (row, value) => {
                  onValueCommitted(value);
                  update(row.id, { note: value?.normalize("NFKC").trim() ?? null });
                },
              },
            }),
          ]}
        />,
      );
      const [input] = screen.getAllByRole("textbox", { name: "Note" });
      await retype(user, input, " ＡＢＣ {Enter}");
      expect(onValueCommitted).toHaveBeenCalledWith(" ＡＢＣ ");
      expect((input as HTMLInputElement).value).toBe("ABC");
      expect(input.closest("td")?.textContent).toContain("ABC");
    });

    it("does not keep optimistic cell state or wait for a returned promise", async () => {
      let finish = noop;
      const onValueCommitted = vi.fn(() => new Promise<void>((resolve) => (finish = resolve)));
      const user = renderTable(
        <Harness
          columns={() => [
            column({
              id: "received",
              label: "Received",
              type: "number",
              edit: { onValueCommitted },
            }),
          ]}
        />,
      );
      const [first, second] = screen.getAllByRole("textbox", { name: "Received" });
      await retype(user, first, "20{Enter}");
      expect(onValueCommitted).toHaveBeenCalledTimes(1);
      expect((first as HTMLInputElement).value).toBe("12");
      expect(document.activeElement).toBe(first);
      await user.tab();
      expect(document.activeElement).toBe(second);
      await act(async () => finish());
      expect((first as HTMLInputElement).value).toBe("12");
    });

    it("preserves a previous field update when another field changes immediately", async () => {
      const user = renderTable(
        <Harness
          columns={(update) => [
            receivedColumn(vi.fn(), update),
            column({
              id: "note",
              label: "Note",
              type: "text",
              edit: { onValueCommitted: (row, value) => update(row.id, { note: value }) },
            }),
          ]}
        />,
      );
      const [received] = screen.getAllByRole("textbox", { name: "Received" });
      const [note] = screen.getAllByRole("textbox", { name: "Note" });
      await retype(user, received, "18{Tab}");
      await user.clear(note);
      await user.keyboard("Updated{Tab}");
      expect((received as HTMLInputElement).value).toBe("18");
      expect((note as HTMLInputElement).value).toBe("Updated");
    });
  });

  describe("interplay", () => {
    it("lets canEdit follow row selection", async () => {
      const user = renderTable(
        <Harness
          columns={(update) => [
            receivedColumn(vi.fn(), update, { canEdit: (_, { selected }) => selected }),
          ]}
          options={{ rowSelection: {} }}
        />,
      );
      expect(screen.queryAllByRole("textbox")).toHaveLength(0);
      const [selectFirst] = screen.getAllByRole("checkbox", { name: "Select row" });
      await user.click(selectFirst);
      expect(screen.getAllByRole("textbox", { name: "Received" })).toHaveLength(1);
      await user.click(selectFirst);
      expect(screen.queryAllByRole("textbox")).toHaveLength(0);
    });

    it("updates editability when controlled selected ids change externally", async () => {
      function ControlledSelection() {
        const [selectedIds, setSelectedIds] = useState(["2"]);
        return (
          <>
            <button onClick={() => setSelectedIds(["1"])}>Select first externally</button>
            <Harness
              columns={(update) => [
                skuColumn,
                receivedColumn(vi.fn(), update, { canEdit: (_, { selected }) => selected }),
              ]}
              options={{ rowSelection: { selectedIds, onChange: setSelectedIds } }}
            />
          </>
        );
      }
      const user = renderTable(<ControlledSelection />);
      const firstRow = screen.getByText("TS-M").closest("tr")!;
      const secondRow = screen.getByText("TS-L").closest("tr")!;
      expect(within(firstRow).queryByRole("textbox")).toBeNull();
      expect(within(secondRow).getByRole("textbox", { name: "Received" })).toBeDefined();
      await user.click(screen.getByRole("button", { name: "Select first externally" }));
      expect((within(firstRow).getByRole("textbox") as HTMLInputElement).value).toBe("12");
      expect(within(secondRow).queryByRole("textbox")).toBeNull();
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
      expect(blocked(lockedRow?.querySelectorAll("td")[1])).toBe(true);
    });

    it("keeps the default cursor when no column is editable, or rows are clickable", () => {
      renderTable(<Harness columns={() => [skuColumn]} />);
      expect(screen.getByText("TS-M").closest("td")?.className).not.toContain("cursor-not-allowed");
      cleanup();
      renderTable(
        <Harness
          columns={(update) => [skuColumn, receivedColumn(vi.fn(), update)]}
          options={{ onClickRow: noop }}
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

    it("opens the cell context menu on a resting editor", async () => {
      renderTable(<Harness columns={(update) => [receivedColumn(vi.fn(), update)]} />);
      const [input] = screen.getAllByRole("textbox", { name: "Received" });
      fireEvent.contextMenu(input);
      expect(await screen.findByRole("menuitem", { name: "Copy value" })).toBeTruthy();
    });

    it("leaves the browser context menu alone while typing", async () => {
      const user = renderTable(<Harness columns={(update) => [receivedColumn(vi.fn(), update)]} />);
      const [input] = screen.getAllByRole("textbox", { name: "Received" });
      await user.click(input);
      const event = new MouseEvent("contextmenu", { bubbles: true, cancelable: true });
      fireEvent(input, event);
      expect(event.defaultPrevented).toBe(false);
      expect(screen.queryByRole("menuitem", { name: "Copy value" })).toBeNull();
    });
  });

  describe("dropdowns", () => {
    const SUPPLIERS = [
      { value: "acme", label: "Acme Corp" },
      { value: "globex", label: "Globex" },
    ];

    function supplierColumn(
      onValueCommitted: (id: string, value: string | null) => void,
      update: Update,
    ): Column<Line> {
      return column({
        id: "supplier",
        label: "Supplier",
        type: "text",
        edit: {
          options: SUPPLIERS,
          onValueCommitted: (row, value) => {
            onValueCommitted(row.id, value);
            update(row.id, { supplier: value ?? "" });
          },
        },
      });
    }

    const rowsWith = (supplier: string) => LINES.map((line) => ({ ...line, supplier }));

    it("shows choice labels and notifies the picked value", async () => {
      const onValueCommitted = vi.fn();
      const user = renderTable(
        <Harness
          rows={rowsWith("acme")}
          columns={(update) => [supplierColumn(onValueCommitted, update)]}
        />,
      );
      const [trigger] = screen.getAllByRole("combobox", { name: "Supplier" });
      expect(trigger.closest("td")?.textContent).toContain("Acme Corp");
      await user.click(trigger);
      await user.click(await screen.findByRole("option", { name: "Globex" }));
      expect(onValueCommitted).toHaveBeenCalledTimes(1);
      expect(onValueCommitted).toHaveBeenCalledWith("1", "globex");
      expect(trigger.closest("td")?.textContent).toContain("Globex");
    });

    it("offers None and notifies null", async () => {
      const onValueCommitted = vi.fn();
      const user = renderTable(
        <Harness
          rows={rowsWith("acme")}
          columns={(update) => [supplierColumn(onValueCommitted, update)]}
        />,
      );
      await user.click(screen.getAllByRole("combobox", { name: "Supplier" })[0]);
      await user.click(await screen.findByRole("option", { name: "None" }));
      expect(onValueCommitted).toHaveBeenCalledWith("1", null);
    });

    it("uses data as the source of truth when a consumer rejects a pick", async () => {
      const onValueCommitted = vi.fn();
      const user = renderTable(
        <Harness
          rows={rowsWith("acme")}
          columns={() => [
            column({
              id: "supplier",
              label: "Supplier",
              type: "text",
              edit: { options: SUPPLIERS, onValueCommitted },
            }),
          ]}
        />,
      );
      const [trigger] = screen.getAllByRole("combobox", { name: "Supplier" });
      await user.click(trigger);
      await user.click(await screen.findByRole("option", { name: "Globex" }));
      expect(onValueCommitted).toHaveBeenCalledTimes(1);
      expect(onValueCommitted).toHaveBeenCalledWith(expect.objectContaining({ id: "1" }), "globex");
      expect((trigger as HTMLInputElement).value).toBe("Acme Corp");
      expect(trigger.getAttribute("aria-invalid")).toBeNull();
    });

    it("filters choices and picks with Enter without moving focus", async () => {
      const onValueCommitted = vi.fn();
      const user = renderTable(
        <Harness
          rows={rowsWith("acme")}
          columns={(update) => [supplierColumn(onValueCommitted, update)]}
        />,
      );
      const [first] = screen.getAllByRole("combobox", { name: "Supplier" });
      await user.click(first);
      await user.clear(first);
      await user.keyboard("glo");
      expect((await screen.findAllByRole("option")).map((option) => option.textContent)).toEqual([
        "Globex",
      ]);
      await user.keyboard("{Enter}");
      expect(onValueCommitted).toHaveBeenCalledExactlyOnceWith("1", "globex");
      await act(() => new Promise<void>((resolve) => requestAnimationFrame(() => resolve())));
      expect(first.getAttribute("aria-expanded")).toBe("false");
      expect((first as HTMLInputElement).value).toBe("Globex");
      expect(first.getAttribute("enterkeyhint")).toBe("done");
      expect(document.activeElement).toBe(first);
    });

    it.each(["{Enter}", "{Shift>}{Enter}{/Shift}"])(
      "keeps focus on %s when the dropdown is closed",
      async (key) => {
        const onValueCommitted = vi.fn();
        const user = renderTable(
          <Harness
            rows={rowsWith("acme")}
            columns={(update) => [supplierColumn(onValueCommitted, update)]}
          />,
        );
        const [first] = screen.getAllByRole("combobox", { name: "Supplier" });
        await user.click(first);
        await user.keyboard(`{Escape}${key}`);
        expect(document.activeElement).toBe(first);
        expect(onValueCommitted).not.toHaveBeenCalled();
      },
    );

    it("takes the highlighted match on Tab after typing", async () => {
      const onValueCommitted = vi.fn();
      const user = renderTable(
        <Harness
          rows={rowsWith("acme")}
          columns={(update) => [supplierColumn(onValueCommitted, update)]}
        />,
      );
      const [first, second] = screen.getAllByRole("combobox", { name: "Supplier" });
      await user.click(first);
      await user.clear(first);
      await user.keyboard("glo");
      await screen.findByRole("option", { name: "Globex" });
      await user.keyboard("{Tab}");
      expect(onValueCommitted).toHaveBeenCalledTimes(1);
      expect(onValueCommitted).toHaveBeenCalledWith("1", "globex");
      expect(document.activeElement).toBe(second);
    });

    it("picks a fully typed label when the user leaves the cell", async () => {
      const onValueCommitted = vi.fn();
      const user = renderTable(
        <Harness
          rows={rowsWith("acme")}
          columns={(update) => [supplierColumn(onValueCommitted, update)]}
        />,
      );
      const [first] = screen.getAllByRole("combobox", { name: "Supplier" });
      await user.click(first);
      await user.clear(first);
      await user.keyboard("GLOBEX");
      await user.click(document.body);
      expect(onValueCommitted).toHaveBeenCalledTimes(1);
      expect(onValueCommitted).toHaveBeenCalledWith("1", "globex");
    });

    it("says so when nothing matches, and leaves the value alone", async () => {
      const onValueCommitted = vi.fn();
      const user = renderTable(
        <Harness
          rows={rowsWith("acme")}
          columns={(update) => [supplierColumn(onValueCommitted, update)]}
        />,
      );
      const [first] = screen.getAllByRole("combobox", { name: "Supplier" });
      await user.click(first);
      await user.clear(first);
      await user.keyboard("zzz");
      expect(await screen.findByText("No matches")).toBeTruthy();
      await user.click(document.body);
      expect(onValueCommitted).not.toHaveBeenCalled();
      expect(first.closest("td")?.textContent).toContain("Acme Corp");
    });

    it("does not notify when the current choice is picked again", async () => {
      const onValueCommitted = vi.fn();
      const user = renderTable(
        <Harness
          rows={rowsWith("acme")}
          columns={(update) => [supplierColumn(onValueCommitted, update)]}
        />,
      );
      await user.click(screen.getAllByRole("combobox", { name: "Supplier" })[0]);
      await user.click(await screen.findByRole("option", { name: "Acme Corp" }));
      expect(onValueCommitted).not.toHaveBeenCalled();
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
              edit: {
                options: SUPPLIERS,
                canEdit: (row) => row.id === "1",
                onValueCommitted: noop,
              },
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

    it("keeps icon space on read-only rows so the column's width never shifts", () => {
      renderTable(
        <Harness
          rows={rowsWith("globex")}
          columns={() => [
            skuColumn,
            column({
              id: "supplier",
              label: "Supplier",
              type: "text",
              edit: {
                options: SUPPLIERS,
                canEdit: (row) => row.id === "1",
                onValueCommitted: noop,
              },
            }),
          ]}
        />,
      );
      const rows = screen.getAllByRole("row").slice(1);
      expect(rows.map((row) => hasIconSpace(row.querySelectorAll("td")[1]))).toEqual([
        true,
        true,
        true,
      ]);
      expect(hasIconSpace(rows[1].querySelectorAll("td")[0])).toBe(false);
    });

    it("offers a badge column's labelled values as badges", async () => {
      const onValueCommitted = vi.fn();
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
                onValueCommitted: (row, value) => {
                  onValueCommitted(row.id, value);
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
      expect(onValueCommitted).toHaveBeenCalledWith("1", "received");
      expect(trigger.closest("td")?.textContent).toContain("Received");
    });

    it("keeps enum fallback labels on editable and locked badge cells after selection", async () => {
      const user = renderTable(
        <Harness
          rows={LINES.map((line) => ({ ...line, status: "pending" }))}
          columns={(update) => [
            column({
              id: "status",
              label: "Status",
              type: "badge",
              filter: {
                field: "status",
                type: "enum",
                options: [
                  { value: "pending", label: "Pending review" },
                  { value: "qa_approved", label: "Quality approved" },
                ],
              },
              edit: {
                canEdit: (row) => row.id === "1",
                onValueCommitted: (row, value) => update(row.id, { status: value ?? undefined }),
              },
            }),
          ]}
        />,
      );
      expect(screen.getAllByText("Pending review")).toHaveLength(3);
      const input = screen.getByRole("combobox", { name: "Status" });
      await user.click(input);
      await user.click(await screen.findByRole("option", { name: "Quality approved" }));
      expect(input.closest("td")?.textContent).toBe("Quality approved");
      expect(screen.getAllByText("Pending review")).toHaveLength(2);
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
              edit: { onValueCommitted: noop },
            }),
          ]}
        />,
      );
      expect(screen.queryAllByRole("combobox", { name: "Status" })).toHaveLength(2);
    });

    it("isn't editable when a badge column has no choices", () => {
      renderTable(
        <Harness
          rows={LINES.map((line) => ({ ...line, status: "pending" }))}
          columns={() => [
            column({
              id: "status",
              label: "Status",
              type: "badge",
              edit: { onValueCommitted: noop },
            }),
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
      onValueCommitted: (id: string, value: string | null) => void,
      update: Update,
      datetime = false,
    ): Column<Line> {
      return column({
        id: "expected",
        label: "Expected",
        type: "date",
        typeOptions: { dateFormat: datetime ? "datetime" : "short" },
        edit: {
          onValueCommitted: (row, value) => {
            onValueCommitted(row.id, value);
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
              edit: { onValueCommitted: noop },
            }),
          ]}
        />,
      );
      expect(screen.getAllByRole("button", { name: "Expected, Oct 2, 2026" })).toHaveLength(3);
    });

    it("notifies a picked day as YYYY-MM-DD", async () => {
      const onValueCommitted = vi.fn();
      const user = renderTable(
        <Harness
          rows={dateRows}
          columns={(update) => [expectedColumn(onValueCommitted, update)]}
        />,
      );
      await user.click(screen.getAllByRole("button", { name: /^Expected/ })[0]);
      await user.click(dayButton("15"));
      expect(onValueCommitted).toHaveBeenCalledWith("1", "2026-10-15");
    });

    it("clears a date to null", async () => {
      const onValueCommitted = vi.fn();
      const user = renderTable(
        <Harness
          rows={dateRows}
          columns={(update) => [expectedColumn(onValueCommitted, update)]}
        />,
      );
      await user.click(screen.getAllByRole("button", { name: /^Expected/ })[0]);
      await user.click(screen.getByRole("button", { name: "Clear" }));
      expect(onValueCommitted).toHaveBeenCalledTimes(1);
      expect(onValueCommitted).toHaveBeenCalledWith("1", null);
    });

    it("uses data when the consumer rejects a date change", async () => {
      const onValueCommitted = vi.fn();
      const user = renderTable(
        <Harness
          rows={dateRows}
          columns={() => [
            column({ id: "expected", label: "Expected", type: "date", edit: { onValueCommitted } }),
          ]}
        />,
      );
      await user.click(screen.getAllByRole("button", { name: /^Expected/ })[0]);
      await user.click(dayButton("15"));
      expect(onValueCommitted).toHaveBeenCalledWith(
        expect.objectContaining({ id: "1" }),
        "2026-10-15",
      );
      expect(screen.getAllByRole("button", { name: "Expected, Oct 2, 2026" })).toHaveLength(3);
    });

    it("notifies a date-time as ISO only when Done is pressed", async () => {
      const onValueCommitted = vi.fn();
      const user = renderTable(
        <Harness
          rows={dateRows}
          columns={(update) => [expectedColumn(onValueCommitted, update, true)]}
        />,
      );
      await user.click(screen.getAllByRole("button", { name: /^Expected/ })[0]);
      await user.click(dayButton("20"));
      fireEvent.change(screen.getByLabelText("Expected (Choose time)"), {
        target: { value: "14:30" },
      });
      expect(onValueCommitted).not.toHaveBeenCalled();
      await user.click(screen.getByRole("button", { name: "Done" }));
      expect(onValueCommitted).toHaveBeenCalledTimes(1);
      expect(onValueCommitted).toHaveBeenCalledWith(
        "1",
        new Date(2026, 9, 20, 14, 30).toISOString(),
      );
    });

    it("abandons a date-time draft when the calendar closes with Escape", async () => {
      const onValueCommitted = vi.fn();
      const user = renderTable(
        <Harness
          rows={dateRows}
          columns={(update) => [expectedColumn(onValueCommitted, update, true)]}
        />,
      );
      await user.click(screen.getAllByRole("button", { name: /^Expected/ })[0]);
      await user.click(dayButton("20"));
      await user.keyboard("{Escape}");
      expect(onValueCommitted).not.toHaveBeenCalled();
    });
  });

  it("drops an unticked row's editor from Tab navigation", async () => {
    const user = renderTable(
      <Harness
        columns={(update) => [
          receivedColumn(vi.fn(), update, { canEdit: (_, { selected }) => selected }),
        ]}
        options={{ rowSelection: {} }}
      />,
    );
    const boxes = screen.getAllByRole("checkbox", { name: "Select row" });
    for (const box of boxes) await user.click(box);
    await user.click(boxes[1]);
    const [first, third] = screen.getAllByRole("textbox", { name: "Received" });
    act(() => first.focus());
    await user.tab();
    expect(document.activeElement).toBe(third);
  });

  it("types each column's edit config without validation or persistence options", () => {
    column({
      id: "received",
      type: "number",
      edit: {
        canEdit: (row, state) => {
          expectTypeOf(row).toEqualTypeOf<Line>();
          expectTypeOf(state).toEqualTypeOf<CellEditState>();
          return true;
        },
        onValueCommitted: (row, value) => {
          expectTypeOf(row).toEqualTypeOf<Line>();
          expectTypeOf(value).toEqualTypeOf<number | null>();
        },
      },
    });
    column({
      id: "price",
      type: "money",
      edit: {
        onValueCommitted: (_row, value) => {
          expectTypeOf(value).toEqualTypeOf<number | null>();
        },
      },
    });
    column({
      id: "note",
      type: "text",
      edit: {
        onValueCommitted: (_row, value) => {
          expectTypeOf(value).toEqualTypeOf<string | null>();
        },
      },
    });
    column({
      id: "supplier",
      type: "link",
      typeOptions: { href: () => "/" },
      edit: { onValueCommitted: noop },
    });
    column({
      id: "expected",
      type: "date",
      edit: {
        onValueCommitted: (_row, value) => {
          expectTypeOf(value).toEqualTypeOf<string | null>();
        },
      },
    });
    column({
      id: "status",
      type: "badge",
      edit: {
        options: [{ value: "open", label: "Open" }],
        onValueCommitted: (_row, value) => {
          expectTypeOf(value).toEqualTypeOf<string | null>();
        },
      },
    });
    // @ts-expect-error — business constraints are consumer-owned
    column({ id: "received", type: "number", edit: { min: 0, onValueCommitted: noop } });
    column({
      id: "note",
      type: "text",
      // @ts-expect-error — validation is not an editor option
      edit: { validate: () => undefined, onValueCommitted: noop },
    });
    // @ts-expect-error — required state is consumer-owned
    column({ id: "note", type: "text", edit: { required: true, onValueCommitted: noop } });
    // @ts-expect-error — display precision belongs to typeOptions
    column({ id: "price", type: "money", edit: { maxDecimals: 2, onValueCommitted: noop } });
    // @ts-expect-error — calendar business bounds are consumer-owned
    column({ id: "expected", type: "date", edit: { max: "2027-01-01", onValueCommitted: noop } });
    // @ts-expect-error — onCommit is replaced by a value-change notification
    column({ id: "note", type: "text", edit: { onCommit: noop } });
    // @ts-expect-error — dropdown choices aren't a number / money option
    column({ id: "received", type: "number", edit: { options: [], onValueCommitted: noop } });
    // @ts-expect-error — columns without a type have no built-in editor
    column({ id: "sku", render: () => null, edit: { onValueCommitted: noop } });
    column({
      id: "received",
      type: "number",
      // @ts-expect-error — an emptied cell notifies null
      edit: { onValueCommitted: (_row, _value: number) => {} },
    });
  });

  describe("affordance", () => {
    it("shows an icon only for dropdown and date editors", () => {
      renderTable(
        <Harness
          rows={LINES.map((line) => ({ ...line, expected: "2026-10-01" }))}
          columns={(update) => [
            skuColumn,
            receivedColumn(vi.fn(), update),
            column({
              id: "supplier",
              label: "Supplier",
              type: "text",
              edit: { options: [{ value: "Acme", label: "Acme" }], onValueCommitted: noop },
            }),
            column({
              id: "expected",
              label: "Expected",
              type: "date",
              edit: { onValueCommitted: noop },
            }),
          ]}
        />,
      );
      const cells = screen.getAllByRole("row")[1].querySelectorAll("td");
      expect(cells[0].querySelector("svg")).toBeNull();
      expect(cells[1].querySelector("svg")).toBeNull();
      expect(cells[2].querySelector(".lucide-chevron-down")).not.toBeNull();
      expect(cells[3].querySelector(".lucide-calendar-days")).not.toBeNull();
    });

    it("leaves editable column headers unmarked", () => {
      renderTable(<Harness columns={(update) => [skuColumn, receivedColumn(vi.fn(), update)]} />);
      const [, received] = screen.getAllByRole("columnheader");
      expect(received.querySelector("svg")).toBeNull();
      expect(received.textContent).toBe("Received");
    });

    it("marks only the rows that can be edited", () => {
      renderTable(
        <Harness
          columns={(update) => [
            receivedColumn(vi.fn(), update, { canEdit: (row) => row.id === "1" }),
          ]}
        />,
      );
      const [first, second] = screen.getAllByRole("row").slice(1);
      expect(first.querySelector("td[data-editable]")).not.toBeNull();
      expect(second.querySelector("td[data-editable]")).toBeNull();
    });
  });

  describe("leaving the page", () => {
    it("does not hold navigation for a returned promise", async () => {
      let finish = noop;
      const onValueCommitted = vi.fn(() => new Promise<void>((resolve) => (finish = resolve)));
      const user = renderInAppRouter(
        <Harness
          columns={() => [
            column({
              id: "received",
              label: "Received",
              type: "number",
              edit: { onValueCommitted },
            }),
          ]}
        />,
      );
      const [input] = screen.getAllByRole("textbox", { name: "Received" });
      await retype(user, input, "20");
      await user.click(screen.getByRole("link", { name: "Elsewhere" }));
      expect(await screen.findByText("Somewhere else")).toBeTruthy();
      expect(onValueCommitted).toHaveBeenCalledTimes(1);
      expect(screen.queryByRole("dialog")).toBeNull();
      await act(async () => finish());
    });

    it("does not register an unload guard for drafts or parse failures", async () => {
      const user = renderTable(<Harness columns={(update) => [receivedColumn(vi.fn(), update)]} />);
      const [input] = screen.getAllByRole("textbox", { name: "Received" });
      await retype(user, input, "20");
      expect(wouldWarnOnUnload()).toBe(false);
      await retype(user, input, "abc{Enter}");
      expect(wouldWarnOnUnload()).toBe(false);
    });
  });
});
