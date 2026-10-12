import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { createLineItemHelper } from "./field";
import { LineItems } from "./line-items";
import type {
  LineItemsChangeSet,
  LineItemsField,
  LineItemsMode,
  LineItemsOrderingMode,
} from "./types";
import { useLineItems } from "./use-line-items";

type Line = {
  lineRef: string;
  sku: string;
  uom: string;
  quantity: number;
  note: string;
  total: number;
};

const f = createLineItemHelper<Line>();

const UOM = [
  { value: "EA", label: "Each" },
  { value: "CS", label: "Case", description: "12 units" },
];

const fields: LineItemsField<Line>[] = [
  f.field({
    key: "sku",
    label: "SKU",
    render: (l) => l.sku,
    editable: ["edit"],
    type: { kind: "text" },
    width: 140,
    hoverExpandWidth: 240,
    pin: "left",
    search: (l, q) => l.sku.toLowerCase().includes(q.toLowerCase()),
  }),
  f.field({
    key: "uom",
    label: "UoM",
    render: (l) => l.uom,
    editable: ["edit"],
    type: { kind: "select", options: UOM, placeholder: "Pick one" },
    width: 110,
  }),
  f.field({
    key: "quantity",
    label: "Qty",
    render: (l) => l.quantity,
    editable: ["edit"],
    type: { kind: "number", decimals: 0 },
    width: 80,
    sort: { comparator: (a, b) => (a.quantity ?? 0) - (b.quantity ?? 0) },
  }),
  // Stays editable once the document is locked, which is what amend mode is for.
  f.field({
    key: "note",
    label: "Note",
    render: (l) => l.note,
    editable: ["edit", "amend"],
    type: { kind: "text" },
    width: 120,
  }),
  // Computed: read-only, and never submitted.
  f.field({ key: "total", label: "Total", render: (l) => (l.total ?? 0).toFixed(2), width: 100 }),
];

const seed: Line[] = [
  { lineRef: "1", sku: "APPLE-01", uom: "EA", quantity: 2, note: "", total: 10 },
  { lineRef: "2", sku: "BANANA-02", uom: "CS", quantity: 5, note: "", total: 25 },
  { lineRef: "3", sku: "CHERRY-03", uom: "EA", quantity: 1, note: "", total: 4 },
];

type HarnessProps = {
  mode?: LineItemsMode;
  ordering?: LineItemsOrderingMode;
  selection?: boolean;
  virtualized?: boolean;
  rowActions?: boolean;
  totals?: boolean;
  addRow?: boolean;
  onSave?: (cs: LineItemsChangeSet) => void;
  onReady?: (api: ReturnType<typeof useLineItems<Line>>) => void;
};

function Harness({
  mode = "edit",
  ordering = "sort",
  selection = false,
  virtualized = false,
  rowActions = false,
  totals = false,
  addRow = false,
  onSave,
  onReady,
}: HarnessProps) {
  const lineItems = useLineItems<Line>({ fields, data: seed, mode, ordering, selection });
  onReady?.(lineItems);

  return (
    <LineItems.Root value={lineItems}>
      <LineItems.SearchToggle />
      <LineItems.Search />
      <LineItems.FullscreenToggle />
      <LineItems.Table
        virtualized={virtualized}
        rowActions={
          rowActions
            ? (row: Line) => (
                <button type="button" onClick={() => lineItems.removeLine(row.lineRef)}>
                  {`Remove ${row.sku}`}
                </button>
              )
            : undefined
        }
      />
      {totals ? (
        <LineItems.TotalsRow>
          {(lines: Line[]) => ({
            quantity: lines.reduce((s, l) => s + (l.quantity ?? 0), 0),
            total: lines.reduce((s, l) => s + (l.total ?? 0), 0).toFixed(2),
          })}
        </LineItems.TotalsRow>
      ) : null}
      {addRow ? (
        <LineItems.AddRow>
          <button type="button" onClick={() => lineItems.addLine({ sku: "NEW-01" })}>
            Add product
          </button>
        </LineItems.AddRow>
      ) : null}
      <LineItems.FloatingDock>
        <LineItems.SelectionBar />
        <LineItems.DirtyBar />
      </LineItems.FloatingDock>
      {onSave ? <LineItems.SaveActions onSave={onSave} /> : null}
    </LineItems.Root>
  );
}

/** Cells are addressed by coordinate, since editable ones hold inputs not text. */
function cell(lineRef: string, columnId: string): HTMLElement {
  const el = document.querySelector<HTMLElement>(
    `[data-line-ref="${lineRef}"][data-column-id="${columnId}"]`,
  );
  if (!el) throw new Error(`cell ${lineRef}/${columnId} not found`);
  return el;
}

function editorIn(lineRef: string, columnId: string): HTMLInputElement {
  const el = cell(lineRef, columnId).querySelector<HTMLInputElement>(
    "[data-slot=line-items-cell-editor]",
  );
  if (!el) throw new Error(`no editor in ${lineRef}/${columnId}`);
  return el;
}

const allEditors = () => document.querySelectorAll("[data-slot=line-items-cell-editor]");

/** Reads a `<col>`'s width, which is where hover-expand shows up. */
const colWidth = (index: number) =>
  (document.querySelector("colgroup")?.children[index] as HTMLElement | undefined)?.style.width;

afterEach(() => {
  cleanup();
});

describe("LineItems", () => {
  describe("snapshots", () => {
    it("view mode", () => {
      const { container } = render(<Harness mode="view" />);
      expect(container.innerHTML).toMatchSnapshot();
    });

    it("edit mode with selection and row actions", () => {
      const { container } = render(<Harness selection rowActions />);
      expect(container.innerHTML).toMatchSnapshot();
    });

    it("amend mode", () => {
      const { container } = render(<Harness mode="amend" />);
      expect(container.innerHTML).toMatchSnapshot();
    });

    it("manual ordering renders drag handles", () => {
      const { container } = render(<Harness ordering="manual" />);
      expect(container.innerHTML).toMatchSnapshot();
    });
  });

  it("renders a row per line and the column headers", () => {
    render(<Harness />);
    expect(screen.getByRole("columnheader", { name: "SKU" })).toBeDefined();
    expect(editorIn("1", "sku").value).toBe("APPLE-01");
    expect(editorIn("3", "sku").value).toBe("CHERRY-03");
    expect(cell("1", "total").textContent).toBe("10.00");
  });

  it("reports its row and column counts to assistive tech", () => {
    render(<Harness />);
    const table = screen.getByRole("table");
    expect(table.getAttribute("aria-rowcount")).toBe("3");
    // 5 schema columns, no utility columns in this configuration.
    expect(table.getAttribute("aria-colcount")).toBe("5");
  });

  it("renders an empty state with no lines", () => {
    function Empty() {
      const lineItems = useLineItems<Line>({ fields, data: [] });
      return (
        <LineItems.Root value={lineItems}>
          <LineItems.Table virtualized={false} emptyMessage="Nothing here" />
        </LineItems.Root>
      );
    }
    render(<Empty />);
    expect(screen.getByText("Nothing here")).toBeDefined();
  });

  it("renders skeleton rows while loading", () => {
    function Loading() {
      const lineItems = useLineItems<Line>({ fields, data: seed });
      return (
        <LineItems.Root value={lineItems}>
          <LineItems.Table loading skeletonRowCount={4} />
        </LineItems.Root>
      );
    }
    render(<Loading />);
    expect(document.querySelectorAll("[data-slot=line-items-skeleton-row]")).toHaveLength(4);
    expect(allEditors()).toHaveLength(0);
  });

  it("throws when a part is used outside Root", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<LineItems.Search />)).toThrow(/must be used within <LineItems.Root>/);
    spy.mockRestore();
  });

  describe("editing", () => {
    it("mounts an editor in every editable cell, so the grid reads as a spreadsheet at rest", () => {
      render(<Harness />);
      // 4 editable columns (sku, uom, quantity, note) across 3 rows.
      expect(allEditors()).toHaveLength(12);
      expect(cell("1", "total").querySelector("[data-slot=line-items-cell-editor]")).toBeNull();
    });

    it("commits an edit on blur", async () => {
      const user = userEvent.setup();
      render(<Harness />);

      const editor = editorIn("1", "sku");
      await user.clear(editor);
      await user.type(editor, "PEAR-99");
      await user.tab();

      expect(editorIn("1", "sku").value).toBe("PEAR-99");
    });

    it("does not commit per keystroke", async () => {
      const user = userEvent.setup();
      let api: ReturnType<typeof useLineItems<Line>> | undefined;
      render(
        <Harness
          onReady={(a) => {
            api = a;
          }}
        />,
      );

      const editor = editorIn("1", "sku");
      await user.clear(editor);
      await user.type(editor, "PEAR");

      expect(api?.isDirty).toBe(false);
    });

    it("commits on Enter", async () => {
      const user = userEvent.setup();
      let api: ReturnType<typeof useLineItems<Line>> | undefined;
      render(
        <Harness
          onReady={(a) => {
            api = a;
          }}
        />,
      );

      const editor = editorIn("1", "quantity");
      await user.clear(editor);
      await user.type(editor, "42{Enter}");

      expect(api?.allLines[0]?.quantity).toBe(42);
    });

    it("commits on Tab", async () => {
      const user = userEvent.setup();
      let api: ReturnType<typeof useLineItems<Line>> | undefined;
      render(
        <Harness
          onReady={(a) => {
            api = a;
          }}
        />,
      );

      const editor = editorIn("1", "quantity");
      await user.clear(editor);
      await user.type(editor, "7{Tab}");

      expect(api?.allLines[0]?.quantity).toBe(7);
    });

    it("abandons the edit on Escape", async () => {
      const user = userEvent.setup();
      render(<Harness />);

      const editor = editorIn("1", "sku");
      await user.clear(editor);
      await user.type(editor, "DISCARD-ME{Escape}");

      expect(editorIn("1", "sku").value).toBe("APPLE-01");
    });

    it("selects the whole value on focus so typing replaces rather than appends", async () => {
      const user = userEvent.setup();
      render(<Harness />);

      const editor = editorIn("1", "sku");
      await user.click(editor);

      expect(editor.selectionStart).toBe(0);
      expect(editor.selectionEnd).toBe("APPLE-01".length);
    });

    it("renders a searchable combobox for select fields", () => {
      render(<Harness />);
      const uom = cell("2", "uom");
      // The caret is the component's own trigger, next to a typeable input.
      expect(uom.querySelector("[data-slot=line-items-cell-editor]")).not.toBeNull();
      expect(within(uom).getByRole("button")).toBeDefined();
    });

    it("renders no editors at all in view mode", () => {
      render(<Harness mode="view" />);
      expect(allEditors()).toHaveLength(0);
      expect(cell("1", "sku").textContent).toBe("APPLE-01");
    });
  });

  describe("amend mode", () => {
    it("only fields listing amend stay editable", () => {
      render(<Harness mode="amend" />);
      expect(cell("1", "note").querySelector("[data-slot=line-items-cell-editor]")).not.toBeNull();
      expect(cell("1", "sku").querySelector("[data-slot=line-items-cell-editor]")).toBeNull();
      expect(cell("1", "quantity").querySelector("[data-slot=line-items-cell-editor]")).toBeNull();
    });

    it("tints the cells the lock closed", () => {
      render(<Harness mode="amend" />);
      expect(cell("1", "sku").className).toContain("bg-muted/40");
      expect(cell("1", "note").className).not.toContain("bg-muted/40");
    });

    it("still commits edits to the fields left open", async () => {
      const user = userEvent.setup();
      let api: ReturnType<typeof useLineItems<Line>> | undefined;
      render(
        <Harness
          mode="amend"
          onReady={(a) => {
            api = a;
          }}
        />,
      );

      const editor = editorIn("1", "note");
      await user.type(editor, "corrected{Enter}");

      expect(api?.allLines[0]?.note).toBe("corrected");
    });
  });

  describe("fill handle", () => {
    it("appears on the active cell of a fillable column", async () => {
      const user = userEvent.setup();
      render(<Harness />);

      expect(document.querySelectorAll("[data-slot=line-items-fill-grip]")).toHaveLength(0);
      await user.click(editorIn("1", "quantity"));
      expect(document.querySelectorAll("[data-slot=line-items-fill-grip]")).toHaveLength(1);
    });

    it("fills the dragged range with the source value in one commit", async () => {
      const user = userEvent.setup();
      let api: ReturnType<typeof useLineItems<Line>> | undefined;
      render(
        <Harness
          onReady={(a) => {
            api = a;
          }}
        />,
      );

      // Seed a distinctive value, then drag its grip down over the rows below.
      const source = editorIn("1", "quantity");
      await user.clear(source);
      await user.type(source, "99{Enter}");
      await user.click(editorIn("1", "quantity"));

      const grip = document.querySelector<HTMLElement>("[data-slot=line-items-fill-grip]");
      expect(grip).not.toBeNull();

      await user.pointer([
        { keys: "[MouseLeft>]", target: grip! },
        { target: cell("2", "quantity") },
        { target: cell("3", "quantity") },
        { keys: "[/MouseLeft]" },
      ]);

      expect(api?.allLines.map((l) => l.quantity)).toEqual([99, 99, 99]);
    });

    it("leaves rows outside the dragged range alone", async () => {
      const user = userEvent.setup();
      let api: ReturnType<typeof useLineItems<Line>> | undefined;
      render(
        <Harness
          onReady={(a) => {
            api = a;
          }}
        />,
      );

      const source = editorIn("1", "quantity");
      await user.clear(source);
      await user.type(source, "50{Enter}");
      await user.click(editorIn("1", "quantity"));

      const grip = document.querySelector<HTMLElement>("[data-slot=line-items-fill-grip]");
      await user.pointer([
        { keys: "[MouseLeft>]", target: grip! },
        { target: cell("2", "quantity") },
        { keys: "[/MouseLeft]" },
      ]);

      // Row 3 was never dragged over, so it keeps its own value.
      expect(api?.allLines.map((l) => l.quantity)).toEqual([50, 50, 1]);
    });

    it("is withheld from read-only columns", async () => {
      const user = userEvent.setup();
      render(<Harness />);
      await user.click(cell("1", "total"));
      expect(document.querySelectorAll("[data-slot=line-items-fill-grip]")).toHaveLength(0);
    });

    it("is withheld in amend mode, which must not be bulk-overwritten", async () => {
      const user = userEvent.setup();
      render(<Harness mode="amend" />);
      await user.click(editorIn("1", "note"));
      expect(document.querySelectorAll("[data-slot=line-items-fill-grip]")).toHaveLength(0);
    });
  });

  describe("hover-expand", () => {
    it("widens a column while the pointer is over it, then restores it", async () => {
      const user = userEvent.setup();
      render(<Harness />);

      const header = screen.getByRole("columnheader", { name: "SKU" });
      expect(colWidth(0)).toBe("140px");

      await user.hover(header);
      // The width is tweened frame by frame, so it must not snap to the target.
      expect(colWidth(0)).not.toBe("240px");
      await waitFor(() => expect(colWidth(0)).toBe("240px"));

      await user.unhover(header);
      await waitFor(() => expect(colWidth(0)).toBe("140px"));
    });

    it("leaves columns without hoverExpandWidth at their declared width", async () => {
      const user = userEvent.setup();
      render(<Harness />);

      await user.hover(screen.getByRole("columnheader", { name: "UoM" }));
      expect(colWidth(1)).toBe("110px");
    });
  });

  describe("selection", () => {
    it("selects a row and surfaces the selection bar", async () => {
      const user = userEvent.setup();
      render(<Harness selection />);

      await user.click(screen.getByRole("checkbox", { name: "Select line 2" }));
      expect(screen.getByText("1 selected")).toBeDefined();
    });

    it("select-all toggles every row", async () => {
      const user = userEvent.setup();
      render(<Harness selection />);

      await user.click(screen.getByRole("checkbox", { name: "Select all lines" }));
      expect(screen.getByText("3 selected")).toBeDefined();
    });

    it("hides the selection column in view mode", () => {
      render(<Harness selection mode="view" />);
      expect(screen.queryByRole("checkbox", { name: "Select all lines" })).toBeNull();
    });
  });

  describe("drag reordering", () => {
    it("renders a labelled grip per row under manual ordering", () => {
      render(<Harness ordering="manual" />);
      expect(screen.getByRole("button", { name: "Drag to reorder line 1" })).toBeDefined();
      expect(screen.getByRole("button", { name: "Drag to reorder line 3" })).toBeDefined();
    });

    it("renders no grips under sort ordering", () => {
      render(<Harness ordering="sort" />);
      expect(screen.queryByRole("button", { name: /drag to reorder/i })).toBeNull();
    });

    it("renders no grips in view mode", () => {
      render(<Harness ordering="manual" mode="view" />);
      expect(screen.queryByRole("button", { name: /drag to reorder/i })).toBeNull();
    });

    it("draws the drop indicator across every column, pinned ones included", () => {
      render(<Harness ordering="manual" selection rowActions />);

      // Simulate the row being dragged over by setting the state the drop
      // handler sets, then assert every cell in that row carries the line.
      const row = document.querySelectorAll("[data-slot=line-items-row]")[1] as HTMLElement;
      const grip = screen.getByRole("button", { name: "Drag to reorder line 1" });

      fireEvent.dragStart(grip);
      fireEvent.dragOver(row);

      const cells = Array.from(row.querySelectorAll("td"));
      expect(cells.length).toBeGreaterThan(3);
      for (const td of cells) {
        expect(td.className).toContain("shadow-[inset_0_2px_0_0_var(--color-primary)]");
      }
    });

    it("repaints the row background on pinned cells so a selected row tints under them", async () => {
      const user = userEvent.setup();
      render(<Harness ordering="manual" selection />);

      const skuCell = cell("1", "sku"); // pinned left
      expect(skuCell.className).toContain("bg-card");

      await user.click(screen.getByRole("checkbox", { name: "Select line 1" }));
      expect(cell("1", "sku").className).toContain("bg-muted");
    });

    it("moves a line down with the keyboard and reports a reorder op", async () => {
      const user = userEvent.setup();
      let api: ReturnType<typeof useLineItems<Line>> | undefined;
      render(
        <Harness
          ordering="manual"
          onReady={(a) => {
            api = a;
          }}
        />,
      );

      const grip = screen.getByRole("button", { name: "Drag to reorder line 1" });
      grip.focus();
      await user.keyboard("{Enter}{ArrowDown}");

      expect(api?.allLines.map((l) => l.lineRef)).toEqual(["2", "1", "3"]);
      expect(api?.getChangeSet().lineChanges.filter((c) => c.action === "reorder")).toEqual([
        { action: "reorder", lineId: "2", position: 0 },
        { action: "reorder", lineId: "1", position: 1 },
      ]);
    });

    it("moving a line back to its slot leaves the document clean", async () => {
      const user = userEvent.setup();
      let api: ReturnType<typeof useLineItems<Line>> | undefined;
      render(
        <Harness
          ordering="manual"
          onReady={(a) => {
            api = a;
          }}
        />,
      );

      const grip = screen.getByRole("button", { name: "Drag to reorder line 1" });
      grip.focus();
      await user.keyboard("{Enter}{ArrowDown}{ArrowUp}");

      expect(api?.allLines.map((l) => l.lineRef)).toEqual(["1", "2", "3"]);
      expect(api?.getChangeSet().isEmpty).toBe(true);
    });

    it("ignores arrow keys until the row is lifted", async () => {
      const user = userEvent.setup();
      let api: ReturnType<typeof useLineItems<Line>> | undefined;
      render(
        <Harness
          ordering="manual"
          onReady={(a) => {
            api = a;
          }}
        />,
      );

      screen.getByRole("button", { name: "Drag to reorder line 1" }).focus();
      await user.keyboard("{ArrowDown}");

      expect(api?.allLines.map((l) => l.lineRef)).toEqual(["1", "2", "3"]);
    });

    it("marks the lifted row with aria-pressed", async () => {
      const user = userEvent.setup();
      render(<Harness ordering="manual" />);

      const grip = screen.getByRole("button", { name: "Drag to reorder line 1" });
      expect(grip.getAttribute("aria-pressed")).toBe("false");

      grip.focus();
      await user.keyboard("{Enter}");
      expect(grip.getAttribute("aria-pressed")).toBe("true");

      await user.keyboard("{Escape}");
      expect(grip.getAttribute("aria-pressed")).toBe("false");
    });
  });

  describe("sorting", () => {
    it("exposes a sortable header as a button with aria-sort", () => {
      render(<Harness />);
      const header = screen.getByRole("columnheader", { name: /qty/i });
      expect(header.getAttribute("aria-sort")).toBe("none");
      expect(within(header).getByRole("button")).toBeDefined();
    });

    it("leaves a column without a comparator unsortable", () => {
      render(<Harness />);
      const header = screen.getByRole("columnheader", { name: "Total" });
      expect(header.getAttribute("aria-sort")).toBeNull();
    });

    it("cycles the rows through ascending, descending and document order", async () => {
      const user = userEvent.setup();
      let api: ReturnType<typeof useLineItems<Line>> | undefined;
      render(
        <Harness
          onReady={(a) => {
            api = a;
          }}
        />,
      );
      const sortButton = within(screen.getByRole("columnheader", { name: /qty/i })).getByRole(
        "button",
      );

      await user.click(sortButton);
      expect(api?.lines.map((l) => l.quantity)).toEqual([1, 2, 5]);

      await user.click(sortButton);
      expect(api?.lines.map((l) => l.quantity)).toEqual([5, 2, 1]);

      await user.click(sortButton);
      expect(api?.lines.map((l) => l.lineRef)).toEqual(["1", "2", "3"]);
    });

    it("renders no sort affordance under manual ordering", () => {
      render(<Harness ordering="manual" />);
      const header = screen.getByRole("columnheader", { name: /qty/i });
      expect(header.getAttribute("aria-sort")).toBeNull();
    });
  });

  describe("parts", () => {
    it("filters rows from the search box", async () => {
      const user = userEvent.setup();
      render(<Harness />);

      await user.type(screen.getByRole("searchbox", { name: /search lines/i }), "banana");

      expect(document.querySelectorAll("[data-slot=line-items-row]")).toHaveLength(1);
      expect(editorIn("2", "sku").value).toBe("BANANA-02");
    });

    it("SearchToggle expands into an input", async () => {
      const user = userEvent.setup();
      render(<Harness />);

      // Collapsed, the toggle *is* the button; expanded, it wraps an input.
      const toggle = document.querySelector<HTMLElement>("[data-slot=line-items-search-toggle]");
      expect(toggle?.tagName.toLowerCase()).toBe("button");
      await user.click(toggle!);

      const expanded = document.querySelector("[data-slot=line-items-search-toggle]");
      expect(expanded?.querySelector("input")).not.toBeNull();
    });

    it("FullscreenToggle reports its pressed state", async () => {
      const user = userEvent.setup();
      render(<Harness />);

      const toggle = screen.getByRole("button", { name: "Expand to fullscreen" });
      expect(toggle.getAttribute("aria-pressed")).toBe("false");

      await user.click(toggle);
      expect(screen.getByRole("button", { name: "Exit fullscreen" })).toBeDefined();
    });

    it("AddRow hosts consumer controls below the table", async () => {
      const user = userEvent.setup();
      render(<Harness addRow />);

      await user.click(screen.getByRole("button", { name: "Add product" }));
      expect(document.querySelectorAll("[data-slot=line-items-row]")).toHaveLength(4);
    });

    it("hides AddRow in view mode", () => {
      render(<Harness addRow mode="view" />);
      expect(screen.queryByRole("button", { name: "Add product" })).toBeNull();
    });

    it("surfaces the dirty bar once something changes", async () => {
      const user = userEvent.setup();
      render(<Harness addRow />);

      expect(screen.queryByText(/unsaved/)).toBeNull();
      await user.click(screen.getByRole("button", { name: "Add product" }));
      expect(screen.getByText("1 unsaved change")).toBeDefined();
    });

    it("discards changes from the dirty bar", async () => {
      const user = userEvent.setup();
      render(<Harness addRow />);

      await user.click(screen.getByRole("button", { name: "Add product" }));
      await user.click(screen.getByRole("button", { name: "Discard" }));

      expect(screen.queryByText(/unsaved/)).toBeNull();
      expect(document.querySelectorAll("[data-slot=line-items-row]")).toHaveLength(3);
    });

    it("hands the change-set to onSave", async () => {
      const user = userEvent.setup();
      const onSave = vi.fn();
      render(<Harness addRow onSave={onSave} />);

      await user.click(screen.getByRole("button", { name: "Add product" }));
      await user.click(screen.getByRole("button", { name: /save changes/i }));

      expect(onSave).toHaveBeenCalledTimes(1);
      const cs = onSave.mock.calls[0]![0] as LineItemsChangeSet;
      expect(cs.lineChanges[0]?.action).toBe("add");
    });

    it("TotalsRow renders column-aligned cells in a tfoot", () => {
      render(<Harness totals />);
      const totals = document.querySelector("[data-slot=line-items-totals]");
      expect(totals?.tagName.toLowerCase()).toBe("tfoot");
      expect(within(totals as HTMLElement).getByText("8")).toBeDefined();
      expect(within(totals as HTMLElement).getByText("39.00")).toBeDefined();
    });

    it("runs a row action", async () => {
      const user = userEvent.setup();
      render(<Harness rowActions />);

      await user.click(screen.getByRole("button", { name: "Remove BANANA-02" }));
      expect(document.querySelectorAll("[data-slot=line-items-row]")).toHaveLength(2);
    });
  });

  describe("virtualization", () => {
    it("mounts only a slice of a long document", () => {
      const many: Line[] = Array.from({ length: 500 }, (_, i) => ({
        lineRef: `L${i}`,
        sku: `SKU-${i}`,
        uom: "EA",
        quantity: i,
        note: "",
        total: i,
      }));

      function Big() {
        const lineItems = useLineItems<Line>({ fields, data: many });
        return (
          <LineItems.Root value={lineItems}>
            <LineItems.Table virtualized rowHeight={36} maxBodyHeight={360} />
          </LineItems.Root>
        );
      }
      render(<Big />);

      expect(document.querySelectorAll("[data-slot=line-items-row]").length).toBeLessThan(
        many.length,
      );
    });

    it("mounts every row when virtualization is off", () => {
      render(<Harness virtualized={false} />);
      expect(document.querySelectorAll("[data-slot=line-items-row]")).toHaveLength(3);
    });
  });
});
