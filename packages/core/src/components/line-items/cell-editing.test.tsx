import { StrictMode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  renderHook,
  screen,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { AppShellConfigContext, buildConfigurations } from "@/contexts/appshell-context";
import { CellEditError } from "@/components/internals/table-core/cell-edit-error";
import { LineItems } from "./line-items";
import { useLineItemsCellRenderersByColumn } from "./line-items-cell";
import type { lineItemsEditors } from "./editor-factory";
import { useLineItems } from "./use-line-items";
import type { LineItemsColumn, UseLineItemsReturn } from "./types";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

type Row = {
  id?: string;
  name: string | null;
  quantity: number | null;
  status: string | null;
  date: string | null;
  allowed: boolean;
};
const rows: Row[] = [
  { id: "A", name: "Widget", quantity: 2, status: "open", date: "2026-10-02", allowed: true },
];
const nameColumn = {
  accessorKey: "name",
  label: "Name",
  type: "text",
  edit: { editorType: "text" },
} satisfies LineItemsColumn<Row>;
const quantityColumn = {
  accessorKey: "quantity",
  label: "Quantity",
  type: "number",
  edit: { editorType: "number" },
} satisfies LineItemsColumn<Row>;
const statusColumn = {
  accessorKey: "status",
  label: "Status",
  type: "text",
  edit: {
    editorType: "combobox",
    editorOptions: {
      options: [
        { value: "open", label: "Open" },
        { value: "closed", label: "Closed" },
      ],
    },
  },
} satisfies LineItemsColumn<Row>;
const dateColumn = {
  accessorKey: "date",
  label: "Date",
  type: "date",
  edit: { editorType: "date" },
} satisfies LineItemsColumn<Row>;
const editorColumns = {
  text: nameColumn,
  number: quantityColumn,
  combobox: statusColumn,
  date: dateColumn,
} satisfies Record<keyof typeof lineItemsEditors, LineItemsColumn<Row>>;
const canEdit = (row: Row) => row.allowed;
const configurations = buildConfigurations({ modules: [], locale: "en", timeZone: "Asia/Tokyo" });

function setup(
  initialColumns: LineItemsColumn<Row>[] = [nameColumn, quantityColumn],
  initialRows = rows,
  orderer = false,
) {
  let value!: UseLineItemsReturn<Row>;
  function Harness({ columns, show = true }: { columns: LineItemsColumn<Row>[]; show?: boolean }) {
    value = useLineItems({ columns, defaultLines: initialRows, orderer });
    return (
      <StrictMode>
        <MemoryRouter>
          <AppShellConfigContext.Provider value={{ configurations }}>
            <LineItems.Root value={value}>
              {show && <LineItems.Table aria-label="Order lines" />}
            </LineItems.Root>
            <button type="button">Outside</button>
          </AppShellConfigContext.Provider>
        </MemoryRouter>
      </StrictMode>
    );
  }
  const view = render(<Harness columns={initialColumns} />, { wrapper: StrictMode });
  return {
    ...view,
    user: userEvent.setup(),
    get value() {
      return value;
    },
    update: (columns = initialColumns, show = true) =>
      view.rerender(<Harness columns={columns} show={show} />),
  };
}
const textbox = (name = "Name") =>
  screen.getByRole("textbox", { name: `${name}, Row 1` }) as HTMLInputElement;
const combobox = () => screen.getByRole("combobox", { name: "Status, Row 1" }) as HTMLInputElement;
const dateTrigger = () => screen.getByRole("button", { name: /^Date, Row 1/ });
const calendar = () =>
  document.querySelector<HTMLElement>('[data-slot="line-items-cell-calendar"]')!;
const dayButton = (day: string) =>
  within(calendar())
    .getAllByRole("button")
    .find((button) => button.textContent === day && !button.dataset.outsideMonth)!;
function draft(input: HTMLInputElement, text: string) {
  act(() => input.focus());
  fireEvent.change(input, { target: { value: text } });
}
function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((success) => {
    resolve = success;
  });
  return { promise, resolve };
}
async function resolveRequest(request: ReturnType<typeof deferred>) {
  await act(async () => {
    request.resolve();
    await request.promise;
  });
}

describe("LineItems cell editing integration", () => {
  it("memoizes cell renderers by columns and time zone", () => {
    const columns: LineItemsColumn<Row>[] = [nameColumn];
    const { result, rerender } = renderHook(
      (props: { columns: LineItemsColumn<Row>[]; timeZone: string }) =>
        useLineItemsCellRenderersByColumn(props.columns, props.timeZone),
      { initialProps: { columns, timeZone: "UTC" } },
    );
    const initial = result.current;
    rerender({ columns, timeZone: "UTC" });
    expect(result.current).toBe(initial);
    rerender({ columns, timeZone: "Asia/Tokyo" });
    expect(result.current).not.toBe(initial);
    const timeZoneChanged = result.current;
    rerender({
      columns: [{ ...nameColumn, render: () => "Custom label" }],
      timeZone: "Asia/Tokyo",
    });
    expect(result.current).not.toBe(timeZoneChanged);
    expect(result.current[0].renderDisplay(rows[0], false)).toBe("Custom label");
  });

  it.each([
    { name: "text", column: nameColumn, align: "left" },
    { name: "number", column: quantityColumn, align: "right" },
    { name: "choice", column: statusColumn, align: "left" },
    {
      name: "money display",
      column: { ...quantityColumn, type: "money" } satisfies LineItemsColumn<Row>,
      align: "right",
    },
    {
      name: "number editor with text display",
      column: { ...quantityColumn, type: "text" } satisfies LineItemsColumn<Row>,
      align: "left",
    },
    {
      name: "explicit alignment",
      column: { ...quantityColumn, align: "center" } satisfies LineItemsColumn<Row>,
      align: "center",
    },
    {
      name: "readonly number",
      column: { accessorKey: "quantity", type: "number" } satisfies LineItemsColumn<Row>,
      align: "right",
    },
    {
      name: "computed money",
      column: {
        id: "computed",
        type: "money",
        accessor: (row: Row) => row.quantity,
      } satisfies LineItemsColumn<Row>,
      align: "right",
    },
  ])("prepares resolved alignment for $name", ({ column, align }) => {
    const { result } = renderHook(() => useLineItemsCellRenderersByColumn([column], "UTC"));
    expect(result.current[0].align).toBe(align);
  });

  it("rebinds date formatting on timezone changes independently of a text editor", () => {
    const columns: LineItemsColumn<Row>[] = [
      {
        ...dateColumn,
        typeOptions: { locale: "en-US" },
        edit: nameColumn.edit,
      },
    ];
    const row = { ...rows[0], date: "2026-10-09T01:00:00Z" };
    const { result, rerender } = renderHook(
      ({ timeZone }: { timeZone: string }) => useLineItemsCellRenderersByColumn(columns, timeZone),
      { initialProps: { timeZone: "UTC" } },
    );
    expect(result.current[0].renderDisplay(row, false)).toBe("Oct 9, 2026");
    rerender({ timeZone: "America/Los_Angeles" });
    expect(result.current[0].renderDisplay(row, false)).toBe("Oct 8, 2026");
  });

  it("preserves a cell draft and its row identity through keyboard reordering", () => {
    const editor = setup([nameColumn], [rows[0], { ...rows[0], id: "B", name: "Second" }], true);
    draft(textbox(), "Changed");
    fireEvent.keyDown(screen.getByRole("button", { name: "Reorder line 1" }), { key: "ArrowDown" });
    expect(editor.value.lines.map((row) => row.id)).toEqual(["B", "A"]);
    const moved = screen.getByRole("textbox", { name: "Name, Row 2" }) as HTMLInputElement;
    expect(moved.value).toBe("Changed");
    fireEvent.keyDown(moved, { key: "Enter" });
    expect(editor.value.lines.map((row) => row.name)).toEqual(["Second", "Changed"]);
  });

  it("keeps drafts out of dirty rows, adopts Enter and native Tab, and cancels Escape", async () => {
    const editor = setup();
    const name = textbox();
    draft(name, "Changed");
    expect(editor.value.lines[0].name).toBe("Widget");
    expect(editor.value.isDirty).toBe(false);
    fireEvent.keyDown(name, { key: "Enter" });
    expect(editor.value.lines[0].name).toBe("Changed");
    expect(editor.value.isDirty).toBe(true);
    draft(name, "Canceled");
    fireEvent.keyDown(name, { key: "Escape" });
    expect(name.value).toBe("Changed");
    expect(editor.value.lines[0].name).toBe("Changed");
    draft(name, "Tabbed");
    await editor.user.tab();
    expect(editor.value.lines[0].name).toBe("Tabbed");
    expect(document.activeElement).toBe(textbox("Quantity"));
    act(() => editor.value.revert());
    expect(editor.value.lines[0].name).toBe("Widget");
    expect(editor.value.isDirty).toBe(false);
  });

  it("normalizes numeric input, rejects malformed grouping, and explicitly clears to null", () => {
    const editor = setup([quantityColumn]);
    const input = textbox("Quantity");
    draft(input, "￥１,２３４.５０");
    fireEvent.keyDown(input, { key: "Enter" });
    expect(editor.value.lines[0].quantity).toBe(1234.5);
    draft(input, "1,5");
    fireEvent.keyDown(input, { key: "Enter" });
    expect(input.getAttribute("aria-invalid")).toBe("true");
    expect(editor.value.lines[0].quantity).toBe(1234.5);
    draft(input, "");
    fireEvent.keyDown(input, { key: "Enter" });
    expect(editor.value.lines[0].quantity).toBeNull();
  });

  it("keeps money display independent of the number editor and uses the current row's currency", () => {
    const currency = vi.fn((row: Row) => (row.allowed ? "USD" : "EUR"));
    const editor = setup(
      [
        {
          ...quantityColumn,
          type: "money",
          typeOptions: { currency },
          edit: { ...quantityColumn.edit, canEdit },
        },
      ],
      [rows[0], { ...rows[0], id: "B", allowed: false }],
    );
    const usd = new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" });
    const eur = new Intl.NumberFormat(undefined, { style: "currency", currency: "EUR" });
    expect(screen.getAllByRole("cell").map((cell) => cell.textContent)).toEqual([
      usd.format(2),
      eur.format(2),
    ]);
    const input = textbox("Quantity");
    draft(input, "3.5");
    fireEvent.keyDown(input, { key: "Enter" });
    expect(editor.value.lines[0].quantity).toBe(3.5);
    expect(screen.getAllByRole("cell")[0].textContent).toBe(usd.format(3.5));
    expect(currency).toHaveBeenCalledWith(editor.value.lines[0]);
  });

  it("updates column widths without discarding an unconfirmed cell draft", () => {
    const editor = setup([nameColumn]);
    const input = textbox();
    draft(input, "Changed");
    editor.update([{ ...nameColumn, width: 240 }]);
    expect((screen.getByRole("columnheader") as HTMLTableCellElement).style.width).toBe("240px");
    expect(textbox()).toBe(input);
    expect(input.value).toBe("Changed");
    expect(editor.value.isDirty).toBe(false);
    fireEvent.keyDown(input, { key: "Enter" });
    expect(editor.value.lines[0].name).toBe("Changed");
  });

  it("does not confirm an IME conversion as an editor commit", () => {
    const editor = setup([nameColumn]);
    const input = textbox();
    draft(input, "変換中");
    fireEvent.compositionStart(input);
    fireEvent.keyDown(input, { key: "Enter", isComposing: true });
    expect(editor.value.lines[0].name).toBe("Widget");
    fireEvent.compositionEnd(input);
    fireEvent.keyDown(input, { key: "Enter" });
    expect(editor.value.lines[0].name).toBe("変換中");
  });

  it("shows fixed choice labels for readonly cells and adopts selected values, not labels", async () => {
    const column: LineItemsColumn<Row> = {
      ...statusColumn,
      edit: { ...statusColumn.edit!, canEdit },
    };
    const editor = setup([column], [rows[0], { ...rows[0], id: "B", allowed: false }]);
    expect(screen.getAllByRole("cell").map((cell) => cell.textContent)).toEqual(["Open", "Open"]);
    expect(screen.getAllByRole("combobox")).toHaveLength(1);
    await editor.user.click(combobox());
    await editor.user.click(screen.getByRole("option", { name: "Closed" }));
    expect(editor.value.lines[0].status).toBe("closed");
    expect(editor.value.lines[1].status).toBe("open");
    expect(editor.value.isDirty).toBe(true);
  });

  it.each([
    { status: "open", text: "Open", badge: "Open" },
    { status: "unlisted", text: "unlisted", badge: "unlisted" },
    { status: null, text: "—", badge: "—" },
    { status: "", text: "—", badge: "—" },
    { status: "blank", text: "—", badge: "" },
  ])("preserves text and badge label fallbacks for $status", ({ status, text, badge }) => {
    const edit = {
      ...statusColumn.edit,
      editorOptions: {
        options: [...statusColumn.edit.editorOptions.options, { value: "blank", label: "" }],
      },
      canEdit: () => false,
    };
    setup(
      [
        { ...statusColumn, id: "text", edit },
        { ...statusColumn, id: "badge", type: "badge", edit },
      ],
      [{ ...rows[0], status }],
    );
    expect(screen.getAllByRole("cell").map((cell) => cell.textContent)).toEqual([text, badge]);
  });

  it("retains link navigation and keyboard focus for readonly rows of an editable link column", async () => {
    const href = vi.fn((row: Row) => `/products/${row.id}`);
    const column: LineItemsColumn<Row> = {
      ...nameColumn,
      type: "link",
      typeOptions: { href },
      edit: { ...nameColumn.edit, canEdit },
    };
    const editor = setup(
      [column],
      [rows[0], { ...rows[0], id: "B", name: "Second", allowed: false }],
    );
    const link = screen.getByRole("link", { name: "Second" });
    expect(link.getAttribute("href")).toBe("/products/B");
    expect(screen.getAllByRole("link")).toHaveLength(1);
    expect(screen.getAllByRole("textbox")).toHaveLength(1);
    expect(href.mock.calls.every(([row]) => !row.allowed)).toBe(true);

    await editor.user.tab();
    expect(document.activeElement).toBe(textbox());
    await editor.user.tab();
    expect(document.activeElement).toBe(link);
  });

  it("switches between a link and an editor when row permissions change", () => {
    const column: LineItemsColumn<Row> = {
      ...nameColumn,
      type: "link",
      typeOptions: { href: (row) => `/products/${row.id}` },
      edit: { ...nameColumn.edit, canEdit },
    };
    const editor = setup([column, { accessorKey: "allowed" }]);
    const input = textbox();
    draft(input, "Discarded");
    expect(screen.queryByRole("link")).toBeNull();
    act(() => editor.value.updateField("A", "allowed", false));
    expect(screen.queryByRole("textbox")).toBeNull();
    expect(screen.getByRole("link", { name: "Widget" }).getAttribute("href")).toBe("/products/A");
    act(() => editor.value.updateField("A", "allowed", true));
    expect(screen.queryByRole("link")).toBeNull();
    expect(textbox()).not.toBe(input);
    expect(textbox().value).toBe("Widget");
    draft(textbox(), "Changed");
    fireEvent.keyDown(textbox(), { key: "Enter" });
    expect(editor.value.lines[0].name).toBe("Changed");
  });

  it("retains choice labels for both editable and readonly link cells", () => {
    const column: LineItemsColumn<Row> = {
      ...statusColumn,
      type: "link",
      typeOptions: { href: (row) => `/products/${row.id}` },
      edit: { ...statusColumn.edit, canEdit },
    };
    setup([column], [rows[0], { ...rows[0], id: "B", allowed: false }]);
    expect(screen.getAllByRole("cell").map((cell) => cell.textContent)).toEqual(["Open", "Open"]);
    expect(screen.getAllByRole("combobox")).toHaveLength(1);
    expect(screen.getByRole("link", { name: "Open" }).getAttribute("href")).toBe("/products/B");
  });

  it.each(["content", "null"] as const)(
    "preserves custom %s rendering for editable and readonly link cells",
    (kind) => {
      const href = vi.fn((row: Row) => `/products/${row.id}`);
      const column: LineItemsColumn<Row> = {
        ...nameColumn,
        type: "link",
        typeOptions: { href },
        render: () => (kind === "content" ? <strong>Custom label</strong> : null),
        edit: { ...nameColumn.edit, canEdit },
      };
      setup([column], [rows[0], { ...rows[0], id: "B", name: "Second", allowed: false }]);
      expect(screen.queryByRole("link")).toBeNull();
      expect(screen.queryByText("Widget")).toBeNull();
      expect(screen.queryByText("Second")).toBeNull();
      expect(screen.queryAllByText("Custom label")).toHaveLength(kind === "content" ? 2 : 0);
      expect(href).not.toHaveBeenCalled();
    },
  );

  it("skips choice-label lookup for custom-rendered readonly cells", () => {
    const options = [...statusColumn.edit.editorOptions.options];
    const find = vi.spyOn(options, "find");
    setup([
      {
        ...statusColumn,
        render: () => null,
        edit: { ...statusColumn.edit, editorOptions: { options }, canEdit: () => false },
      },
    ]);
    expect(screen.getByRole("cell").textContent).toBe("");
    expect(find).not.toHaveBeenCalled();
  });

  it("uses the same badges for fixed-choice display and menu labels", async () => {
    const column: LineItemsColumn<Row> = {
      ...statusColumn,
      type: "badge",
      typeOptions: { badgeLabelMap: { open: "Old label" } },
    };
    const editor = setup([column]);
    expect(screen.getByRole("cell").textContent).toBe("Open");
    await editor.user.click(combobox());
    await editor.user.click(screen.getByRole("option", { name: "Closed" }));
    expect(editor.value.lines[0].status).toBe("closed");
    expect(screen.getByRole("cell").textContent).toBe("Closed");
  });

  it("adopts a calendar day and an explicit clear without changing the row key", async () => {
    const editor = setup([dateColumn]);
    await editor.user.click(dateTrigger());
    await editor.user.click(dayButton("20"));
    expect(editor.value.lines[0].date).toBe("2026-10-20");
    expect(editor.value.getLineKey(editor.value.lines[0])).toBe("A");
    await editor.user.click(dateTrigger());
    await editor.user.click(screen.getByRole("button", { name: "Clear" }));
    expect(editor.value.lines[0].date).toBeNull();
  });

  it("binds the timezone to date input independently of text display", async () => {
    const editor = setup(
      [{ ...dateColumn, type: "text" }],
      [{ ...rows[0], date: "2026-10-08T17:00:00Z" }],
    );
    expect(screen.getByRole("cell").textContent).toBe("2026-10-08T17:00:00Z");
    await editor.user.click(dateTrigger());
    expect(dayButton("9").hasAttribute("data-selected")).toBe(true);
  });

  it("holds datetime drafts until Done and converts the configured timezone to an ISO timestamp", async () => {
    const column: LineItemsColumn<Row> = {
      ...dateColumn,
      typeOptions: { dateFormat: "datetime" as const },
      edit: { editorType: "date" as const, editorOptions: { withTime: true } },
    };
    const editor = setup([column]);
    await editor.user.click(dateTrigger());
    const done = screen.getByRole("button", { name: "Done" }) as HTMLButtonElement;
    expect(done.disabled).toBe(true);
    await editor.user.click(dayButton("20"));
    fireEvent.change(screen.getByLabelText("Date, Row 1 (Time)"), { target: { value: "14:30" } });
    expect(editor.value.lines[0].date).toBe("2026-10-02");
    expect(editor.value.isDirty).toBe(false);
    await editor.user.click(done);
    expect(editor.value.lines[0].date).toBe("2026-10-20T05:30:00.000Z");
  });

  it.each(["safe", "generic", "custom"] as const)(
    "retains and retries a %s callback failure without adopting it",
    async (kind) => {
      const error =
        kind === "safe"
          ? new CellEditError("Please correct this value")
          : new Error("Private service detail");
      const check = vi
        .fn()
        .mockImplementationOnce(() => {
          throw error;
        })
        .mockImplementation(() => {});
      const column: LineItemsColumn<Row> = {
        ...nameColumn,
        edit: {
          editorType: "text" as const,
          onValueCommitted: check,
          error:
            kind === "custom"
              ? {
                  render: ({ row }: { row: Row; error: unknown }) => (
                    <span>{row.name}: custom failure</span>
                  ),
                }
              : undefined,
        },
      };
      const editor = setup([column]);
      const input = textbox();
      draft(input, "Changed");
      fireEvent.keyDown(input, { key: "Enter" });
      expect(editor.value.lines[0].name).toBe("Widget");
      expect(editor.value.isDirty).toBe(false);
      expect(input.value).toBe("Changed");
      expect(input.getAttribute("aria-invalid")).toBe("true");
      const popup = await screen.findByRole("dialog", { name: "Error for Name, Row 1" });
      const expected = {
        safe: "Please correct this value",
        custom: "Widget: custom failure",
        generic: "The value could not be confirmed.",
      }[kind];
      expect(within(popup).getByText(expected)).toBeDefined();
      expect(screen.queryByText("Private service detail")).toBeNull();
      expect(document.activeElement).toBe(input);
      fireEvent.keyDown(input, { key: "Enter" });
      expect(check).toHaveBeenCalledTimes(2);
      expect(editor.value.lines[0].name).toBe("Changed");
    },
  );

  it.each(["write", "revert", "remove", "dispose"] as const)(
    "ignores late async adoption after %s",
    async (action) => {
      const request = deferred();
      const check = vi.fn(() => request.promise);
      const column: LineItemsColumn<Row> = {
        ...nameColumn,
        edit: { editorType: "text" as const, onValueCommitted: check },
      };
      const editor = setup([column]);
      const input = textbox();
      draft(input, "Stale");
      fireEvent.keyDown(input, { key: "Enter" });
      expect(input.closest("td")?.getAttribute("aria-busy")).toBe("true");
      expect(editor.value.isDirty).toBe(false);
      if (action === "write") act(() => editor.value.updateField("A", "name", "Command"));
      if (action === "revert") act(() => editor.value.revert());
      if (action === "remove") act(() => editor.value.removeLine("A"));
      if (action === "dispose") editor.unmount();
      await resolveRequest(request);
      expect(editor.value.lines.map((row) => row.name)).toEqual(
        action === "remove" ? [] : [action === "write" ? "Command" : "Widget"],
      );
    },
  );

  it("retains drafts across table view remounts and allows a detached pending cell to adopt", async () => {
    const request = deferred();
    const column: LineItemsColumn<Row> = {
      ...nameColumn,
      edit: { editorType: "text" as const, onValueCommitted: () => request.promise },
    };
    const editor = setup([column]);
    draft(textbox(), "Retained");
    editor.update([column], false);
    expect(editor.value.isDirty).toBe(false);
    editor.update([column]);
    expect(textbox().value).toBe("Retained");
    fireEvent.keyDown(textbox(), { key: "Enter" });
    editor.update([column], false);
    await resolveRequest(request);
    expect(editor.value.lines[0].name).toBe("Retained");
    expect(editor.value.isDirty).toBe(true);
  });

  it.each(Object.entries(editorColumns))(
    "keeps the %s input and local state when column preparation is recreated",
    async (kind, column) => {
      const editor = setup([column]);
      const getControl = () => {
        if (kind === "date") return dateTrigger();
        if (kind === "combobox") return combobox();
        return textbox(kind === "number" ? "Quantity" : "Name");
      };
      const control = getControl();
      if (kind === "date" || kind === "combobox") await editor.user.click(control);
      if (kind === "combobox") await editor.user.type(control, "Clos");
      if (control instanceof HTMLInputElement && kind !== "combobox")
        draft(control, kind === "number" ? "3." : "Retained");
      const focused = document.activeElement;
      const popup = kind === "date" ? calendar() : null;
      const inputValue = control instanceof HTMLInputElement ? control.value : undefined;

      editor.update([{ ...column }]);

      expect(getControl()).toBe(control);
      expect(document.activeElement).toBe(focused);
      if (kind === "date") expect(calendar()).toBe(popup);
      if (control instanceof HTMLInputElement) expect(control.value).toBe(inputValue);
      if (kind === "combobox") expect(combobox().getAttribute("aria-expanded")).toBe("true");
      expect(editor.value.isDirty).toBe(false);
    },
  );

  it("preserves a focused draft when editor callbacks are recreated and uses the latest callback", () => {
    const before = vi.fn();
    const after = vi.fn();
    const column = (onValueCommitted: () => void): LineItemsColumn<Row> => ({
      ...nameColumn,
      edit: {
        ...nameColumn.edit,
        onValueCommitted,
        canEdit: (row: Row) => row.allowed,
        error: { render: () => null },
      },
    });
    const editor = setup([column(before)]);
    const input = textbox();
    draft(input, "Retained");
    editor.update([column(after)]);
    expect(textbox()).toBe(input);
    expect(document.activeElement).toBe(input);
    expect(input.value).toBe("Retained");
    expect(editor.value.isDirty).toBe(false);
    fireEvent.keyDown(input, { key: "Enter" });
    expect(editor.value.lines[0].name).toBe("Retained");
    expect(before).not.toHaveBeenCalled();
    expect(after).toHaveBeenCalledWith(expect.objectContaining({ id: "A" }), "Retained");
  });

  it("applies changed row permissions without losing document state or adopting a pending edit", async () => {
    const request = deferred();
    const column: LineItemsColumn<Row> = {
      ...nameColumn,
      edit: {
        editorType: "text" as const,
        canEdit: (row: Row) => row.allowed,
        onValueCommitted: () => request.promise,
      },
    };
    const editor = setup([column, { accessorKey: "allowed" }]);
    draft(textbox(), "Stale");
    fireEvent.keyDown(textbox(), { key: "Enter" });
    act(() => editor.value.updateField("A", "allowed", false));
    expect(screen.queryByRole("textbox")).toBeNull();
    await resolveRequest(request);
    expect(editor.value.lines[0]).toMatchObject({ name: "Widget", allowed: false });
    act(() => editor.value.updateField("A", "allowed", true));
    expect(textbox().value).toBe("Widget");
  });

  it("retires pending edits when a stable predicate reads changed external permissions", async () => {
    const request = deferred();
    let allowed = true;
    const column: LineItemsColumn<Row> = {
      ...nameColumn,
      edit: {
        editorType: "text" as const,
        canEdit: () => allowed,
        onValueCommitted: () => request.promise,
      },
    };
    const editor = setup([column]);
    draft(textbox(), "Stale");
    fireEvent.keyDown(textbox(), { key: "Enter" });
    allowed = false;
    editor.update();
    expect(screen.queryByRole("textbox")).toBeNull();
    allowed = true;
    editor.update();
    await resolveRequest(request);
    expect(editor.value.lines[0].name).toBe("Widget");
    expect(textbox().value).toBe("Widget");
  });

  it.each(["choice", "date"] as const)(
    "closes an open %s popup when a direct command cancels its session",
    async (kind) => {
      const editor = setup([kind === "choice" ? statusColumn : dateColumn]);
      await editor.user.click(kind === "choice" ? combobox() : dateTrigger());
      if (kind === "choice") expect(combobox().getAttribute("aria-expanded")).toBe("true");
      else expect(calendar()).not.toBeNull();
      act(() => {
        if (kind === "choice") editor.value.updateField("A", "status", "closed");
        else editor.value.updateField("A", "date", "2026-10-25");
      });
      if (kind === "choice") {
        expect(combobox().getAttribute("aria-expanded")).toBe("false");
        expect(combobox().value).toBe("Closed");
      } else expect(dateTrigger().getAttribute("aria-expanded")).toBe("false");
    },
  );
});
