import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, Link, RouterProvider } from "react-router";
import * as React from "react";

import { createLineItemHelper } from "./field";
import { LineItems } from "./line-items";
import type {
  LineItemsChangeSet,
  LineItemsField,
  LineItemsMode,
  LineItemsOrderingMode,
  LineItemsSelectionAction,
} from "./types";
import { useLineItems } from "./use-line-items";

type Line = {
  id?: string;
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
    pin: "left",
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
  { id: "1", sku: "APPLE-01", uom: "EA", quantity: 2, note: "", total: 10 },
  { id: "2", sku: "BANANA-02", uom: "CS", quantity: 5, note: "", total: 25 },
  { id: "3", sku: "CHERRY-03", uom: "EA", quantity: 1, note: "", total: 4 },
];

type HarnessProps = {
  mode?: LineItemsMode;
  ordering?: LineItemsOrderingMode;
  selection?: boolean;
  virtualized?: boolean;
  renderRowActions?: boolean;
  totals?: boolean;
  addRow?: boolean;
  onSave?: (cs: LineItemsChangeSet) => void;
  selectionActions?: LineItemsSelectionAction[];
  onReady?: (api: ReturnType<typeof useLineItems<Line>>) => void;
};

function Harness({
  mode = "edit",
  ordering = "sort",
  selection = false,
  virtualized = false,
  renderRowActions = false,
  totals = false,
  addRow = false,
  onSave,
  selectionActions,
  onReady,
}: HarnessProps) {
  const lineItems = useLineItems<Line>({
    fields,
    defaultLines: seed,
    mode,
    ordering,
    rowSelection: selectionActions || selection ? { actions: selectionActions } : undefined,
  });
  onReady?.(lineItems);

  return (
    <LineItems.Root value={lineItems}>
      <LineItems.FullscreenToggle />
      <LineItems.Table
        virtualized={virtualized}
        renderRowActions={
          renderRowActions
            ? (row: Line) => (
                <button
                  type="button"
                  onClick={() => lineItems.removeLine(lineItems.getLineKey(row))}
                >
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
        <LineItems.DirtyBar />
      </LineItems.FloatingDock>
      {onSave ? <LineItems.SaveActions onSave={onSave} /> : null}
    </LineItems.Root>
  );
}

/** Cells are addressed by coordinate, since editable ones hold inputs not text. */
function cell(lineKey: string, columnId: string): HTMLElement {
  const el = document.querySelector<HTMLElement>(
    `[data-line-key="${lineKey}"][data-column-id="${columnId}"]`,
  );
  if (!el) throw new Error(`cell ${lineKey}/${columnId} not found`);
  return el;
}

function editorIn(lineKey: string, columnId: string): HTMLInputElement {
  const el = cell(lineKey, columnId).querySelector<HTMLInputElement>(
    "[data-slot=line-items-cell-editor]",
  );
  if (!el) throw new Error(`no editor in ${lineKey}/${columnId}`);
  return el;
}

const allEditors = () => document.querySelectorAll("[data-slot=line-items-cell-editor]");

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
      const { container } = render(<Harness selection renderRowActions />);
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

  it("reports a row count that includes the header and totals rows", () => {
    render(<Harness totals />);
    const table = screen.getByRole("table");
    // 3 lines + header + totals.
    expect(table.getAttribute("aria-rowcount")).toBe("5");
    const rows = screen.getAllByRole("row");
    expect(rows[0]?.getAttribute("aria-rowindex")).toBe("1");
    expect(rows[1]?.getAttribute("aria-rowindex")).toBe("2");
    expect(rows.at(-1)?.getAttribute("aria-rowindex")).toBe("5");
  });

  it("names every cell editor by its column and line", () => {
    render(<Harness />);
    expect(screen.getByRole("textbox", { name: "Note, line 2" })).toBeDefined();
    expect(screen.getByRole("combobox", { name: "UoM, line 3" })).toBeDefined();
  });

  it("renders an empty state with no lines", () => {
    function Empty() {
      const lineItems = useLineItems<Line>({ fields, defaultLines: [] });
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
      const lineItems = useLineItems<Line>({ fields, defaultLines: seed });
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
    expect(() => render(<LineItems.Table />)).toThrow(/must be used within <LineItems.Root>/);
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

    it("commits on Enter in the last row, where focus has nowhere to move", async () => {
      const user = userEvent.setup();
      let api: ReturnType<typeof useLineItems<Line>> | undefined;
      render(
        <Harness
          onReady={(a) => {
            api = a;
          }}
        />,
      );

      const editor = editorIn("3", "quantity");
      await user.clear(editor);
      await user.type(editor, "42{Enter}");

      expect(api?.allLines[2]?.quantity).toBe(42);
      expect(document.activeElement).toBe(editor);
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

    it("Tab skips read-only columns, wrapping to the next line's first editable cell", async () => {
      const user = userEvent.setup();
      render(<Harness />);

      // Note is the last editable column; Total after it is computed and read-only.
      await user.click(editorIn("1", "note"));
      await user.keyboard("{Tab}");

      expect(document.activeElement).toBe(editorIn("2", "sku"));
    });

    it("Tab past the last editable cell lets focus leave the grid", async () => {
      const user = userEvent.setup();
      render(
        <>
          <Harness />
          <button type="button">After the grid</button>
        </>,
      );

      await user.click(editorIn("3", "note"));
      await user.keyboard("{Tab}");

      expect(document.activeElement).toBe(screen.getByRole("button", { name: "After the grid" }));
    });

    it("lets a paste win over typing already in the cell", async () => {
      const user = userEvent.setup();
      let api: ReturnType<typeof useLineItems<Line>> | undefined;
      render(<Harness onReady={(x) => (api = x)} />);

      const editor = editorIn("1", "sku");
      await user.click(editor);
      await user.keyboard("TYPED");
      fireEvent.paste(editor, { clipboardData: { getData: () => "PASTED" } });
      expect(editorIn("1", "sku").value).toBe("PASTED");

      await user.click(editorIn("2", "note"));
      expect(api?.allLines[0]?.sku).toBe("PASTED");
    });

    it("keeps a typed decimal comma or grouped number instead of clearing the cell", async () => {
      const user = userEvent.setup();
      let api: ReturnType<typeof useLineItems<Line>> | undefined;
      render(<Harness onReady={(a) => (api = a)} />);

      const editor = editorIn("1", "quantity");
      expect(editor.type).toBe("text");
      expect(editor.inputMode).toBe("decimal");
      await user.click(editor);
      await user.keyboard("1,234");
      await user.tab();

      expect(api?.allLines[0]?.quantity).toBe(1234);
    });

    it('reads a pasted "1,234" in a number column as a number', async () => {
      const user = userEvent.setup();
      let api: ReturnType<typeof useLineItems<Line>> | undefined;
      render(<Harness onReady={(x) => (api = x)} />);

      await user.click(editorIn("1", "quantity"));
      fireEvent.paste(editorIn("1", "quantity"), { clipboardData: { getData: () => "1,234" } });
      expect(api?.allLines[0]?.quantity).toBe(1234);

      fireEvent.paste(editorIn("1", "quantity"), { clipboardData: { getData: () => "N/A" } });
      expect(api?.allLines[0]?.quantity).toBe(1234);
    });

    it("Escape in a closed select cell cancels rather than clearing the value", async () => {
      const user = userEvent.setup();
      let api: ReturnType<typeof useLineItems<Line>> | undefined;
      render(<Harness onReady={(x) => (api = x)} />);

      const select = screen.getByRole("combobox", { name: "UoM, line 1" });
      select.focus();
      await user.keyboard("{Escape}{Escape}");

      expect(api?.allLines[0]?.uom).toBe("EA");
      expect(api?.isDirty).toBe(false);
    });

    it("Tab moves into a custom editor's own input", async () => {
      const user = userEvent.setup();
      const f2 = createLineItemHelper<Line>();
      const customFields: LineItemsField<Line>[] = [
        f2.field({
          key: "sku",
          label: "SKU",
          render: (l) => l.sku,
          editable: ["edit"],
          type: { kind: "text" },
        }),
        f2.field({
          key: "note",
          label: "Note",
          render: (l) => l.note,
          editable: ["edit"],
          type: {
            kind: "custom",
            renderEditor: (ctx) => (
              <input aria-label={ctx.ariaLabel} defaultValue={String(ctx.value ?? "")} />
            ),
          },
        }),
      ];
      function CustomHarness() {
        const lineItems = useLineItems<Line>({ fields: customFields, defaultLines: seed });
        return (
          <LineItems.Root value={lineItems}>
            <LineItems.Table virtualized={false} />
          </LineItems.Root>
        );
      }
      render(<CustomHarness />);

      await user.click(editorIn("1", "sku"));
      await user.keyboard("{Tab}");

      expect(document.activeElement).toBe(screen.getByRole("textbox", { name: "Note, line 1" }));
    });

    it("keeps a paste into the focused cell when it later blurs", async () => {
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
      await user.click(editor);
      fireEvent.paste(editor, { clipboardData: { getData: () => "12" } });
      expect(editorIn("1", "quantity").value).toBe("12");

      await user.click(editorIn("2", "note"));
      expect(api?.allLines[0]?.quantity).toBe(12);
    });

    it("commits once when Enter both commits and moves focus", async () => {
      const user = userEvent.setup();
      const onLinesChange = vi.fn();
      function Controlled() {
        const [lines, setLines] = React.useState(seed);
        const lineItems = useLineItems<Line>({
          fields,
          lines,
          onLinesChange: (next) => {
            onLinesChange(next);
            setLines(next);
          },
        });
        return (
          <LineItems.Root value={lineItems}>
            <LineItems.Table virtualized={false} />
          </LineItems.Root>
        );
      }
      render(<Controlled />);

      const editor = editorIn("1", "quantity");
      await user.clear(editor);
      await user.type(editor, "42{Enter}");

      expect(onLinesChange).toHaveBeenCalledTimes(1);
    });

    it("commits typing still in flight when the cell turns read-only", async () => {
      const user = userEvent.setup();
      let api: ReturnType<typeof useLineItems<Line>> | undefined;
      const { rerender } = render(<Harness onReady={(a) => (api = a)} />);

      const editor = editorIn("1", "note");
      await user.click(editor);
      await user.type(editor, "half-typed");
      rerender(<Harness mode="view" onReady={(a) => (api = a)} />);

      expect(api?.allLines[0]?.note).toBe("half-typed");
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

    it("loads select options from a fetcher, labelling the stored value", async () => {
      const user = userEvent.setup();
      type Product = { id?: string; productId: string; productName: string };
      const fetcher = vi.fn(async (query: string | null) =>
        [
          { value: "p-1", label: "Apple" },
          { value: "p-2", label: "Banana" },
        ].filter((o) => !query || o.label.toLowerCase().includes(query.toLowerCase())),
      );
      let api: ReturnType<typeof useLineItems<Product>> | undefined;
      function AsyncHarness() {
        const lineItems = useLineItems<Product>({
          fields: [
            createLineItemHelper<Product>().field({
              key: "productId",
              label: "Product",
              render: (l) => l.productName,
              editable: ["edit"],
              type: {
                kind: "select",
                fetcher: { fn: fetcher, debounceMs: 0 },
                // The results page won't include the stored product; the line has its name.
                getOptionLabel: (_value, line) => line.productName,
              },
            }),
          ],
          defaultLines: [{ id: "1", productId: "p-9", productName: "Cherry" }],
        });
        api = lineItems;
        return (
          <LineItems.Root value={lineItems}>
            <LineItems.Table virtualized={false} />
          </LineItems.Root>
        );
      }
      render(<AsyncHarness />);

      const input = editorIn("1", "productId");
      expect(input.value).toBe("Cherry");

      await user.click(input);
      await user.clear(input);
      await user.keyboard("ban");
      await user.click(await screen.findByRole("option", { name: "Banana" }));

      expect(fetcher).toHaveBeenCalledWith("ban", expect.anything());
      expect(api?.allLines[0]?.productId).toBe("p-2");
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
      expect(cell("1", "sku").hasAttribute("data-locked")).toBe(true);
      expect(cell("1", "note").hasAttribute("data-locked")).toBe(false);
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
    it("fills down from the keyboard with Cmd/Ctrl+D", async () => {
      const user = userEvent.setup();
      let api: ReturnType<typeof useLineItems<Line>> | undefined;
      render(<Harness onReady={(x) => (api = x)} />);

      await user.click(editorIn("1", "quantity"));
      await user.keyboard("{Alt>}{Shift>}{ArrowDown}{ArrowDown}{/Shift}{/Alt}");
      await user.keyboard("{Control>}d{/Control}");

      expect(api?.allLines.map((l) => l.quantity)).toEqual([2, 2, 2]);
    });

    it("fills down what was just typed, without pressing Enter first", async () => {
      const user = userEvent.setup();
      let api: ReturnType<typeof useLineItems<Line>> | undefined;
      render(<Harness onReady={(x) => (api = x)} />);

      await user.click(editorIn("1", "quantity"));
      await user.keyboard("5");
      await user.keyboard("{Alt>}{Shift>}{ArrowDown}{ArrowDown}{/Shift}{/Alt}");
      await user.keyboard("{Control>}d{/Control}");

      expect(api?.allLines.map((l) => l.quantity)).toEqual([5, 5, 5]);
    });

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

  describe("selection", () => {
    const remove: LineItemsSelectionAction = {
      id: "remove",
      label: "Remove",
      variant: "destructive",
      onClick: () => {},
    };

    it("shows no bulk-action bar without actions", async () => {
      const user = userEvent.setup();
      render(<Harness selection />);

      await user.click(screen.getByRole("checkbox", { name: "Select line 2" }));
      expect(screen.queryByRole("toolbar", { name: "Bulk actions" })).toBeNull();
    });

    it("opens the bulk-action bar with a count once a line is selected", async () => {
      const user = userEvent.setup();
      render(<Harness selectionActions={[remove]} />);
      expect(screen.queryByRole("toolbar", { name: "Bulk actions" })).toBeNull();

      await user.click(screen.getByRole("checkbox", { name: "Select line 2" }));
      const bar = screen.getByRole("toolbar", { name: "Bulk actions" });
      expect(within(bar).getByText("1 of 3 selected")).toBeDefined();
    });

    it("select-all selects every line", async () => {
      const user = userEvent.setup();
      render(<Harness selectionActions={[remove]} />);

      await user.click(screen.getByRole("checkbox", { name: "Select all lines" }));
      const bar = screen.getByRole("toolbar", { name: "Bulk actions" });
      expect(within(bar).getByText("3 of 3 selected")).toBeDefined();
    });

    it("passes the selected lineKeys, in document order", async () => {
      const user = userEvent.setup();
      const onClick = vi.fn();
      render(<Harness selectionActions={[{ id: "bump", label: "Bump", onClick }]} />);

      await user.click(screen.getByRole("checkbox", { name: "Select line 3" }));
      await user.click(screen.getByRole("checkbox", { name: "Select line 1" }));
      await user.click(screen.getByRole("button", { name: "Bump" }));

      expect(onClick.mock.calls[0]?.[0]).toEqual(["1", "3"]);
    });

    it("lets an action remove the selected lines in one update", async () => {
      const user = userEvent.setup();
      let api: ReturnType<typeof useLineItems<Line>> | undefined;
      render(
        <Harness
          selectionActions={[{ ...remove, onClick: (ids) => api?.removeLines(ids) }]}
          onReady={(a) => {
            api = a;
          }}
        />,
      );

      await user.click(screen.getByRole("checkbox", { name: "Select line 1" }));
      await user.click(screen.getByRole("checkbox", { name: "Select line 3" }));
      await user.click(screen.getByRole("button", { name: "Remove" }));

      expect(api?.allLines.map((l) => l.id)).toEqual(["2"]);
      expect(api?.getChangeSet().lineChanges).toEqual([
        { action: "remove", lineId: "1" },
        { action: "remove", lineId: "3" },
      ]);
    });

    it("Clear empties the selection and hands focus to the header checkbox", async () => {
      const user = userEvent.setup();
      render(<Harness selectionActions={[remove]} />);

      await user.click(screen.getByRole("checkbox", { name: "Select line 2" }));
      await user.click(screen.getByRole("button", { name: "Clear selection" }));

      expect(screen.queryByRole("toolbar", { name: "Bulk actions" })).toBeNull();
      expect(document.activeElement).toBe(
        screen.getByRole("checkbox", { name: "Select all lines" }),
      );
    });

    it("tracks a returned promise without clearing the selection", async () => {
      const user = userEvent.setup();
      let resolve: (() => void) | undefined;
      const request = new Promise<void>((r) => {
        resolve = r;
      });
      render(
        <Harness selectionActions={[{ id: "sync", label: "Sync", onClick: () => request }]} />,
      );

      await user.click(screen.getByRole("checkbox", { name: "Select line 2" }));
      await user.click(screen.getByRole("button", { name: "Sync" }));
      expect(screen.getByRole("toolbar", { name: "Bulk actions" }).getAttribute("aria-busy")).toBe(
        "true",
      );

      await act(async () => resolve?.());
      const bar = screen.getByRole("toolbar", { name: "Bulk actions" });
      expect(bar.getAttribute("aria-busy")).toBeNull();
      expect(within(bar).getByText("1 of 3 selected")).toBeDefined();
    });

    it("offers actions in edit only, unless an action opts into amend", async () => {
      const user = userEvent.setup();
      render(
        <Harness
          mode="amend"
          selectionActions={[
            remove,
            { id: "flag", label: "Flag for review", modes: ["edit", "amend"], onClick: () => {} },
          ]}
        />,
      );

      await user.click(screen.getByRole("checkbox", { name: "Select line 2" }));
      const bar = screen.getByRole("toolbar", { name: "Bulk actions" });
      expect(within(bar).queryByRole("button", { name: "Remove" })).toBeNull();
      expect(within(bar).getByRole("button", { name: "Flag for review" })).toBeDefined();
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

    it("marks the row being dragged over as the drop target", () => {
      render(<Harness ordering="manual" selection renderRowActions />);

      // Simulate the row being dragged over by setting the state the drop
      // handler sets, then assert the row is marked as the drop target.
      const row = document.querySelectorAll("[data-slot=line-items-row]")[1] as HTMLElement;
      const grip = screen.getByRole("button", { name: "Drag to reorder line 1" });

      fireEvent.dragStart(grip);
      fireEvent.dragOver(row);

      expect(row.hasAttribute("data-drop-before")).toBe(true);
    });

    it("marks a selected row so every cell, pinned ones included, tints with it", async () => {
      const user = userEvent.setup();
      render(<Harness ordering="manual" selection />);

      const row = () => cell("1", "sku").closest("tr")!;
      expect(row().getAttribute("data-state")).toBeNull();

      await user.click(screen.getByRole("checkbox", { name: "Select line 1" }));
      expect(row().getAttribute("data-state")).toBe("selected");
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

      expect(api?.allLines.map((l) => l.id)).toEqual(["2", "1", "3"]);
      expect(api?.getChangeSet().lineChanges.filter((c) => c.action === "reorder")).toEqual([
        { action: "reorder", lineId: "2", position: 0 },
        { action: "reorder", lineId: "1", position: 1 },
      ]);
    });

    it("keeps moving with the keyboard: the grid leaves the grip's arrows alone", async () => {
      const user = userEvent.setup();
      let api: ReturnType<typeof useLineItems<Line>> | undefined;
      render(<Harness ordering="manual" onReady={(a) => (api = a)} />);

      // With a cell active, the grid would otherwise take the arrows too.
      await user.click(editorIn("2", "note"));
      const grip = screen.getByRole("button", { name: "Drag to reorder line 1" });
      grip.focus();
      await user.keyboard("{Enter}{ArrowDown}{ArrowDown}");

      expect(api?.allLines.map((l) => l.id)).toEqual(["2", "3", "1"]);
    });

    it("does nothing when a line is dropped back on itself", () => {
      let api: ReturnType<typeof useLineItems<Line>> | undefined;
      render(<Harness ordering="manual" onReady={(a) => (api = a)} />);
      const row = cell("2", "sku").closest("tr")!;

      fireEvent.dragStart(screen.getByRole("button", { name: "Drag to reorder line 2" }));
      fireEvent.dragOver(row);
      fireEvent.drop(row);

      expect(api?.allLines.map((l) => l.id)).toEqual(["1", "2", "3"]);
      expect(api?.isDirty).toBe(false);
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

      expect(api?.allLines.map((l) => l.id)).toEqual(["1", "2", "3"]);
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

      expect(api?.allLines.map((l) => l.id)).toEqual(["1", "2", "3"]);
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
      expect(api?.lines.map((l) => l.id)).toEqual(["1", "2", "3"]);
    });

    it("renders no sort affordance under manual ordering", () => {
      render(<Harness ordering="manual" />);
      const header = screen.getByRole("columnheader", { name: /qty/i });
      expect(header.getAttribute("aria-sort")).toBeNull();
    });
  });

  describe("parts", () => {
    it("requires onFullscreenChange alongside a controlled fullscreen", () => {
      function Stuck() {
        const lineItems = useLineItems<Line>({ fields, defaultLines: seed });
        // @ts-expect-error — without a handler the toggle and Escape can't leave the overlay.
        return <LineItems.Root value={lineItems} fullscreen />;
      }
      expect(Stuck).toBeTypeOf("function");
    });

    describe("fullscreen", () => {
      it("opens as a labelled modal dialog, locks page scroll, and closes on Escape", async () => {
        const user = userEvent.setup();
        render(<Harness />);

        await user.click(screen.getByRole("button", { name: "Expand to fullscreen" }));
        const dialog = screen.getByRole("dialog", { name: "Line items" });
        expect(dialog.getAttribute("aria-modal")).toBe("true");
        expect(document.body.style.overflow).toBe("hidden");

        await user.keyboard("{Escape}");
        expect(screen.queryByRole("dialog")).toBeNull();
        expect(document.body.style.overflow).toBe("");
      });

      it("keeps a half-typed cell when toggled, since the grid is not remounted", async () => {
        const user = userEvent.setup();
        render(<Harness />);

        const editor = editorIn("1", "note");
        await user.click(editor);
        await user.keyboard("draft");
        fireEvent.click(screen.getByRole("button", { name: "Expand to fullscreen" }));

        expect(editorIn("1", "note")).toBe(editor);
        expect(editor.value).toBe("draft");
      });
    });

    describe("DirtyBar warnOnNav", () => {
      function GuardPage({
        onReady,
      }: {
        onReady?: (a: ReturnType<typeof useLineItems<Line>>) => void;
      }) {
        const lineItems = useLineItems<Line>({ fields, defaultLines: seed });
        onReady?.(lineItems);
        return (
          <LineItems.Root value={lineItems}>
            <Link to="/elsewhere">Elsewhere</Link>
            <Link to="/?tab=2">Same page</Link>
            <LineItems.Table virtualized={false} />
            <LineItems.FloatingDock>
              <LineItems.DirtyBar warnOnNav onSave={() => {}} />
            </LineItems.FloatingDock>
          </LineItems.Root>
        );
      }

      function renderInRouter() {
        let api: ReturnType<typeof useLineItems<Line>> | undefined;
        const router = createMemoryRouter(
          [
            { path: "/", element: <GuardPage onReady={(a) => (api = a)} /> },
            { path: "/elsewhere", element: <p>Elsewhere page</p> },
          ],
          { initialEntries: ["/"] },
        );
        render(<RouterProvider router={router} />);
        return { router, api: () => api };
      }

      it("holds the user on the page and hands focus to Save while dirty", async () => {
        const user = userEvent.setup();
        const { router, api } = renderInRouter();
        act(() => api()?.updateField("1", "quantity", 9));

        await user.click(screen.getByRole("link", { name: "Elsewhere" }));
        expect(router.state.location.pathname).toBe("/");
        expect(document.activeElement?.textContent).toBe("Save");
      });

      it("also holds programmatic navigation", async () => {
        const { router, api } = renderInRouter();
        act(() => api()?.updateField("1", "quantity", 9));

        await act(() => router.navigate("/elsewhere"));
        expect(router.state.location.pathname).toBe("/");
      });

      it("lets a same-page search-param change through", async () => {
        const user = userEvent.setup();
        const { router, api } = renderInRouter();
        act(() => api()?.updateField("1", "quantity", 9));

        await user.click(screen.getByRole("link", { name: "Same page" }));
        expect(router.state.location.search).toBe("?tab=2");
      });

      it("lets save, reset and navigate run in one handler", async () => {
        const { router, api } = renderInRouter();
        act(() => api()?.updateField("1", "quantity", 9));

        await act(async () => {
          api()?.reset();
          await router.navigate("/elsewhere");
        });
        expect(router.state.location.pathname).toBe("/elsewhere");
      });

      it("lets navigation through once the document is clean", async () => {
        const user = userEvent.setup();
        const { router } = renderInRouter();

        await user.click(screen.getByRole("link", { name: "Elsewhere" }));
        expect(router.state.location.pathname).toBe("/elsewhere");
      });
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
      render(<Harness renderRowActions />);

      await user.click(screen.getByRole("button", { name: "Remove BANANA-02" }));
      expect(document.querySelectorAll("[data-slot=line-items-row]")).toHaveLength(2);
    });
  });

  describe("virtualization", () => {
    it("mounts only a slice of a long document", () => {
      const many: Line[] = Array.from({ length: 500 }, (_, i) => ({
        id: `L${i}`,
        sku: `SKU-${i}`,
        uom: "EA",
        quantity: i,
        note: "",
        total: i,
      }));

      function Big() {
        const lineItems = useLineItems<Line>({ fields, defaultLines: many });
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
