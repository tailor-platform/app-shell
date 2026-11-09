import { StrictMode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { AppShellConfigContext, buildConfigurations } from "@/contexts/appshell-context";
import { CellEditError } from "@/components/internals/table-core/cell-edit-error";
import { LineItems } from "./line-items";
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
    options: [
      { value: "open", label: "Open" },
      { value: "closed", label: "Closed" },
    ],
  },
} satisfies LineItemsColumn<Row>;
const dateColumn = {
  accessorKey: "date",
  label: "Date",
  type: "date",
  edit: { editorType: "date" },
} satisfies LineItemsColumn<Row>;
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

  it("holds datetime drafts until Done and converts the configured timezone to an ISO timestamp", async () => {
    const column: LineItemsColumn<Row> = {
      ...dateColumn,
      typeOptions: { dateFormat: "datetime" as const },
      edit: { editorType: "date" as const, withTime: true },
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

  it("retires an old draft before rendering a replacement editor contract", async () => {
    const editor = setup([nameColumn]);
    draft(textbox(), "Old draft");
    const column: LineItemsColumn<Row> = {
      ...nameColumn,
      edit: { editorType: "combobox" as const, options: [{ value: "next", label: "Next" }] },
    };
    editor.update([column]);
    expect(screen.queryByRole("textbox")).toBeNull();
    const input = screen.getByRole("combobox", { name: "Name, Row 1" }) as HTMLInputElement;
    expect(input.value).not.toBe("Old draft");
    await editor.user.click(input);
    await editor.user.click(screen.getByRole("option", { name: "Next" }));
    expect(editor.value.lines[0].name).toBe("next");
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
