import { useCallback, useMemo, useState } from "react";
import { Popover } from "@base-ui/react/popover";
import { Checkbox } from "@base-ui/react/checkbox";
import { Check, GripVertical, SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/button";
import { Tooltip } from "@/components/tooltip";
import { useDataTableContext } from "./data-table-context";
import { useDataTableT } from "./i18n";

// Shared popup styling, matching DataTable's filter popover.
const POPUP_CLASS = cn(
  "astw:bg-popover astw:text-popover-foreground astw:z-(--z-popup) astw:origin-(--transform-origin) astw:overflow-hidden astw:rounded-md astw:border astw:border-border astw:shadow-md",
  "astw:animate-in astw:fade-in-0 astw:zoom-in-95 astw:data-ending-style:animate-out astw:data-ending-style:fade-out-0 astw:data-ending-style:zoom-out-95",
);

const CHECKBOX_CLASS = cn(
  "astw:flex astw:size-4 astw:shrink-0 astw:items-center astw:justify-center astw:rounded-sm astw:border astw:border-input",
  "astw:data-checked:bg-primary astw:data-checked:border-primary astw:data-checked:text-primary-foreground",
);

// The DataTable column key formula (mirrors useDataTable's getColumnKey);
// ctx.columns is the full column list in definition order, so the index-based
// fallback lines up with the keys in ctx.columnOrder.
function columnKey(col: { id?: string; label?: string }, index: number): string {
  return col.id ?? col.label ?? String(index);
}

type Section = "left" | "scrollable" | "right";

// Which pin value a section maps to. "none" explicitly unpins (overriding a
// column's default `pin`) so dragging a pinned-by-default column into
// "Scrollable" sticks.
const SECTION_PIN: Record<Section, "left" | "right" | "none"> = {
  left: "left",
  scrollable: "none",
  right: "right",
};

/** Resolve a column's effective pin (override wins; "none" is explicit unpin). */
function effectiveSection(
  stored: "left" | "right" | "none" | undefined,
  defaultPin: "left" | "right" | undefined,
): Section {
  if (stored === "none") return "scrollable";
  return stored ?? defaultPin ?? "scrollable";
}

// =============================================================================
// DataTable.ColumnSettings — 3 droppable sections (fixed left / scrollable /
// fixed right). Dragging a column between sections sets its pin; dragging
// within a section reorders it.
// =============================================================================

/**
 * A "Columns" toolbar popover with three drop zones — **Fixed left**,
 * **Scrollable**, and **Fixed right**. Drag a column into a zone to pin it to
 * that edge (or unpin it), and drag within a zone to reorder. Each row has a
 * visibility checkbox. State persists when `useDataTable` has a `tableId`.
 *
 * @internal Rendered by `DataTable.Toolbar` when its `columnSettings` prop is
 * set — not exported on the `DataTable` namespace, since the control always
 * lives in the same place and needs no per-consumer composition.
 */
function DataTableColumnSettings({ className }: { className?: string }) {
  const t = useDataTableT();
  const {
    columns,
    columnOrder,
    isColumnVisible,
    toggleColumn,
    showAllColumns,
    hideAllColumns,
    pinnedColumns,
    setPin,
    setColumnOrder,
  } = useDataTableContext<Record<string, unknown>>();

  const meta = useMemo(() => {
    const label = new Map<string, string>();
    const defaultPin = new Map<string, "left" | "right" | undefined>();
    columns.forEach((col, i) => {
      const key = columnKey(col, i);
      label.set(key, col.label ?? key);
      defaultPin.set(key, col.pin);
    });
    return { label, defaultPin };
  }, [columns]);

  const sectionOf = useCallback(
    (key: string): Section => effectiveSection(pinnedColumns[key], meta.defaultPin.get(key)),
    [pinnedColumns, meta],
  );

  // A single toggle drives the footer button: when every column is visible it
  // offers "Hide all", otherwise "Show all" (so a partially-hidden table gets
  // everything back in one click).
  const allVisible = useMemo(
    () => columnOrder.every((key) => isColumnVisible(key)),
    [columnOrder, isColumnVisible],
  );

  // Group the ordered columns into their sections (order preserved per section).
  const buckets = useMemo(() => {
    const grouped: Record<Section, string[]> = { left: [], scrollable: [], right: [] };
    for (const key of columnOrder) grouped[sectionOf(key)].push(key);
    return grouped;
  }, [columnOrder, sectionOf]);

  const [dragKey, setDragKey] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<{ section: Section; index: number } | null>(null);

  const resetDrag = () => {
    setDragKey(null);
    setDropTarget(null);
  };

  const handleDrop = () => {
    if (dragKey && dropTarget) {
      const { section, index } = dropTarget;
      // Rebuild the buckets without the dragged key, then insert it at the drop
      // position, and flatten back to a single order. Setting the order to the
      // grouped layout keeps it consistent with how the table renders.
      const next: Record<Section, string[]> = {
        left: buckets.left.filter((k) => k !== dragKey),
        scrollable: buckets.scrollable.filter((k) => k !== dragKey),
        right: buckets.right.filter((k) => k !== dragKey),
      };
      const target = next[section];
      // `index` was measured against the section's rows *including* dragKey. For
      // a same-zone move, filtering dragKey out above shifts every slot at/after
      // its original position down by one, so decrement to land where the
      // indicator promised. Cross-zone drops (fromIdx === -1) are unaffected.
      const fromIdx = buckets[section].indexOf(dragKey);
      const insertAt = fromIdx > -1 && fromIdx < index ? index - 1 : index;
      target.splice(Math.max(0, Math.min(insertAt, target.length)), 0, dragKey);
      setColumnOrder([...next.left, ...next.scrollable, ...next.right]);
      setPin(dragKey, SECTION_PIN[section]);
    }
    resetDrag();
  };

  const renderRow = (key: string, section: Section, index: number, isLast: boolean) => {
    // Insertion indicator: an absolutely-positioned line that sits in the gap
    // between rows (straddling the shared border). Being absolute, it never
    // shifts the rows under the cursor — a flow element there made the drop
    // target recompute on every reflow and the line "jump".
    const showBefore =
      dragKey != null && dropTarget?.section === section && dropTarget.index === index;
    const showAfter =
      dragKey != null &&
      dropTarget?.section === section &&
      isLast &&
      dropTarget.index === index + 1;
    return (
      <div
        key={key}
        draggable
        onDragStart={() => setDragKey(key)}
        onDragEnd={resetDrag}
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
          const rect = e.currentTarget.getBoundingClientRect();
          const after = e.clientY > rect.top + rect.height / 2;
          setDropTarget({ section, index: after ? index + 1 : index });
        }}
        className={cn(
          "astw:relative astw:flex astw:items-center astw:gap-2 astw:rounded-sm astw:py-1 astw:pr-2 astw:pl-1.5 astw:hover:bg-accent",
          dragKey === key && "astw:opacity-40",
        )}
      >
        {showBefore && (
          <span className="astw:pointer-events-none astw:absolute astw:inset-x-1 astw:-top-px astw:z-10 astw:h-0.5 astw:rounded-full astw:bg-primary" />
        )}
        {showAfter && (
          <span className="astw:pointer-events-none astw:absolute astw:inset-x-1 astw:-bottom-px astw:z-10 astw:h-0.5 astw:rounded-full astw:bg-primary" />
        )}
        <span
          aria-label={t("dragToReorder")}
          className="astw:cursor-grab astw:text-muted-foreground"
        >
          <GripVertical className="astw:size-4" />
        </span>
        <button
          type="button"
          onClick={() => toggleColumn(key)}
          className="astw:min-w-0 astw:flex-1 astw:cursor-pointer astw:truncate astw:text-left astw:text-sm"
        >
          {meta.label.get(key)}
        </button>
        <Tooltip.Root>
          <Tooltip.Trigger
            render={
              <Checkbox.Root
                checked={isColumnVisible(key)}
                onCheckedChange={() => toggleColumn(key)}
                aria-label={meta.label.get(key)}
                className={CHECKBOX_CLASS}
              />
            }
          >
            <Checkbox.Indicator className="astw:flex astw:data-unchecked:hidden">
              <Check className="astw:size-3" />
            </Checkbox.Indicator>
          </Tooltip.Trigger>
          <Tooltip.Content>{t(isColumnVisible(key) ? "hideColumn" : "showColumn")}</Tooltip.Content>
        </Tooltip.Root>
      </div>
    );
  };

  const renderSection = (section: Section, title: string) => {
    const keys = buckets[section];
    const active = dragKey != null && dropTarget?.section === section;
    return (
      <div
        data-section={section}
        onDragOver={(e) => {
          e.preventDefault();
          // Only fires for the header / padding / empty area (rows stop
          // propagation) → drop at the end of the section.
          setDropTarget({ section, index: keys.length });
        }}
        onDrop={(e) => {
          e.preventDefault();
          handleDrop();
        }}
        className={cn(
          // No gap between rows: a gap would be "section area" that re-triggers
          // the end-of-section handler as the cursor passes between rows.
          "astw:flex astw:flex-col astw:rounded-md astw:py-1.5",
          active && "astw:bg-accent/40",
        )}
      >
        <div className="astw:px-1.5 astw:pb-1 astw:text-xs astw:font-medium astw:text-muted-foreground">
          {title}
        </div>
        {keys.length === 0 ? (
          <div
            className={cn(
              "astw:mx-1 astw:rounded-sm astw:border astw:border-dashed astw:border-border astw:px-1.5 astw:py-2 astw:text-xs astw:text-muted-foreground astw:italic",
              active && "astw:border-primary astw:text-primary",
            )}
          >
            {t("dropColumnsHere")}
          </div>
        ) : (
          keys.map((key, i) => renderRow(key, section, i, i === keys.length - 1))
        )}
      </div>
    );
  };

  return (
    <Popover.Root>
      <Popover.Trigger
        render={
          <Button variant="outline" size="xs" className={className}>
            <SlidersHorizontal className="astw:size-3" />
            {t("columns")}
          </Button>
        }
      />
      {/* Stacking context on the portal container so the popup renders above the
          DataTable's sticky header row (z-index: 10). */}
      <Popover.Portal style={{ position: "relative", zIndex: "var(--z-popup)" }}>
        <Popover.Positioner sideOffset={4} side="bottom" align="end">
          <Popover.Popup data-slot="data-table-column-settings-popup" className={POPUP_CLASS}>
            <fieldset
              aria-label={t("columnSettings")}
              className="astw:m-0 astw:flex astw:min-w-72 astw:flex-col astw:border-0 astw:p-2"
            >
              {renderSection("left", t("sectionPinnedLeft"))}
              <div className="astw:mx-1 astw:border-t astw:border-border" />
              {renderSection("scrollable", t("sectionScrollable"))}
              <div className="astw:mx-1 astw:border-t astw:border-border" />
              {renderSection("right", t("sectionPinnedRight"))}
              <div className="astw:mx-1 astw:mt-1 astw:border-t astw:border-border" />
              <div className="astw:mt-1.5 astw:flex astw:justify-end">
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={allVisible ? hideAllColumns : showAllColumns}
                >
                  {t(allVisible ? "hideAllColumns" : "showAllColumns")}
                </Button>
              </div>
            </fieldset>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
DataTableColumnSettings.displayName = "DataTable.ColumnSettings";

export { DataTableColumnSettings };
