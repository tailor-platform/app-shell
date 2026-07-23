import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { Ellipsis } from "lucide-react";
import { Checkbox } from "@base-ui/react/checkbox";
import { Check, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { CollectionControlProvider } from "@/contexts/collection-control-context";
import { Table } from "@/components/table";
import { Button } from "@/components/button";
import { Menu } from "@/components/menu";
import { Tooltip } from "@/components/tooltip";
import type { SortConfig } from "@/types/collection";
import type { Column, RowAction, UseDataTableReturn } from "./types";
import { DataTableContext, type DataTableContextValue } from "./data-table-context";
import { useDataTableT } from "./i18n";
import { getCellValue, renderTypedCell } from "./cell-renderers";
import { DataTableToolbar, DataTableFilters } from "./toolbar";
import { DataTableColumnSettings } from "./column-settings";
import { DataTablePagination } from "./pagination";
export type { DataTablePaginationProps } from "./pagination";

// Fallback row count when no pageSize is configured (static / uncontrolled tables)
const DEFAULT_ROWS = 5;

// Empty/error states reserve a fixed 3 rows' worth of height — enough to
// read as an intentional region, independent of pageSize (so large page
// sizes don't create a huge blank or, when height-constrained, scrollable
// area, and tiny page sizes don't collapse to a thin strip).
const STATUS_ROWS = 3;
const ROW_HEIGHT_PX = 53;

// Resolve the effective horizontal alignment for a column. Numeric `type`
// values default to `"right"` so digits line up along their decimal place;
// everything else defaults to `"left"`. Explicit `col.align` always wins.
function resolveAlign<TRow extends Record<string, unknown>>(col: Column<TRow>): "left" | "right" {
  if (col.align) return col.align;
  if (col.type === "number" || col.type === "money") return "right";
  return "left";
}

function nextSortDirection(current: string | undefined): "Asc" | "Desc" | undefined {
  if (current === "Asc") return "Desc";
  if (current === "Desc") return undefined;
  return "Asc";
}

// =============================================================================
// Column pinning (sticky columns)
// =============================================================================

// Fallback widths of the built-in selection / row-actions columns, used as the
// innermost anchors before the real widths are measured.
const SELECTION_WIDTH = 52;
const ACTIONS_WIDTH = 50;
// Keys for the built-in selection / row-actions columns in the measured-width map.
const SELECTION_KEY = "__datatable_selection__";
const ACTIONS_KEY = "__datatable_actions__";

type PinSide = "left" | "right";
type ColumnWidths = Record<string, number>;

/**
 * Rendered column widths (px) keyed by column key, published by `DataTable.Table`
 * after it measures the header row. Empty until the first measurement; consumers
 * fall back to each column's declared `width` (or 0) meanwhile.
 */
const PinMeasureContext = createContext<ColumnWidths>({});

// `useLayoutEffect` warns during SSR; the measurement it drives is client-only,
// so fall back to `useEffect` on the server.
const useIsomorphicLayoutEffect = typeof document !== "undefined" ? useLayoutEffect : useEffect;

interface PinPlacement {
  side: PinSide;
  /** Distance from the pinned edge, in px. */
  offset: number;
  /** True for the cell at the freeze seam — it draws the divider border. */
  isBoundary: boolean;
}

interface PinLayout<TRow extends Record<string, unknown>> {
  /** Visible columns reordered into `[left-pinned, unpinned, right-pinned]`. */
  ordered: Column<TRow>[];
  /** Render key per column (data-col-key + React key), keyed by column reference. */
  keys: Map<Column<TRow>, string>;
  /** Sticky placement per pinned column (keyed by column reference). */
  placements: Map<Column<TRow>, PinPlacement>;
  /** Placement for the built-in selection column, when pinned. */
  selection?: PinPlacement;
  /** Placement for the built-in row-actions column, when pinned. */
  actions?: PinPlacement;
}

function columnKeyAt<TRow extends Record<string, unknown>>(
  col: Column<TRow>,
  index: number,
): string {
  return col.id ?? col.label ?? String(index);
}

/** Rendered width for a column key: the measured value wins once > 0, else the
 *  declared width, else 0. */
function resolveWidth(key: string, declared: number | undefined, widths: ColumnWidths): number {
  const measured = widths[key];
  return measured && measured > 0 ? measured : (declared ?? 0);
}

/** Shallow equality of two width maps — guards the measure effect against
 *  setting state (and re-rendering) when nothing actually changed. */
function sameWidths(a: ColumnWidths, b: ColumnWidths): boolean {
  const aKeys = Object.keys(a);
  if (aKeys.length !== Object.keys(b).length) return false;
  return aKeys.every((k) => a[k] === b[k]);
}

/**
 * Resolve a column's effective pin: the per-user override wins over the static
 * default. `"none"` is an explicit unpin (overrides a pinned default).
 */
function resolvePin(
  stored: "left" | "right" | "none" | undefined,
  defaultPin: PinSide | undefined,
): PinSide | undefined {
  if (stored === "none") return undefined;
  return stored ?? defaultPin;
}

/**
 * Definition-order `col → key` map — the single source of truth for a column's
 * identity, matching how `useDataTable` / `ColumnSettings` store order,
 * visibility, and pin state. Built from the **full** column list so a key never
 * depends on the column's position in the filtered/reordered *visible* array: a
 * column with neither `id` nor `label` falls back to `String(index)`, and keying
 * it off its visible index would silently detach its stored pin/visibility once
 * a sibling is hidden or moved. Keyed by reference — `visibleColumns` reuses
 * these same column objects.
 */
function buildColumnKeys<TRow extends Record<string, unknown>>(
  columns: Column<TRow>[],
): Map<Column<TRow>, string> {
  const keys = new Map<Column<TRow>, string>();
  columns.forEach((col, index) => keys.set(col, columnKeyAt(col, index)));
  return keys;
}

/**
 * Group the visible columns by pin side and compute cumulative sticky offsets.
 * The selection column (if present) auto-pins to the left edge and row-actions
 * (if present) auto-pins to the right edge, with user-pinned columns stacking
 * outward from them.
 *
 * `columnKeys` is the definition-order key map (see {@link buildColumnKeys});
 * `columns` here is the visible/reordered subset, so keys are resolved by
 * reference from that map rather than from each column's position in it.
 */
function computePinLayout<TRow extends Record<string, unknown>>(
  columns: Column<TRow>[],
  pinnedColumns: Record<string, "left" | "right" | "none">,
  opts: {
    hasSelection: boolean;
    hasRowActions: boolean;
    widths: ColumnWidths;
    columnKeys: Map<Column<TRow>, string>;
  },
): PinLayout<TRow> {
  const { hasSelection, hasRowActions, widths, columnKeys } = opts;

  const keyOf = (col: Column<TRow>): string => columnKeys.get(col) as string;

  const keys = new Map<Column<TRow>, string>();
  columns.forEach((col) => keys.set(col, keyOf(col)));

  const left: Column<TRow>[] = [];
  const middle: Column<TRow>[] = [];
  const right: Column<TRow>[] = [];

  columns.forEach((col) => {
    const pin = resolvePin(pinnedColumns[keyOf(col)], col.pin);
    if (pin === "left") left.push(col);
    else if (pin === "right") right.push(col);
    else middle.push(col);
  });

  const placements = new Map<Column<TRow>, PinPlacement>();

  // Left group, visually [selection?, ...left]; offsets accumulate rightward
  // using the measured (or declared) width of each preceding pinned column.
  let leftOffset = 0;
  let selection: PinPlacement | undefined;
  if (hasSelection) {
    selection = { side: "left", offset: 0, isBoundary: left.length === 0 };
    leftOffset = resolveWidth(SELECTION_KEY, SELECTION_WIDTH, widths);
  }
  left.forEach((col, i) => {
    placements.set(col, { side: "left", offset: leftOffset, isBoundary: i === left.length - 1 });
    leftOffset += resolveWidth(keys.get(col) as string, col.width, widths);
  });

  // Right group, visually [...right, actions?]; offsets accumulate leftward.
  let rightOffset = 0;
  let actions: PinPlacement | undefined;
  if (hasRowActions) {
    actions = { side: "right", offset: 0, isBoundary: right.length === 0 };
    rightOffset = resolveWidth(ACTIONS_KEY, ACTIONS_WIDTH, widths);
  }
  for (let i = right.length - 1; i >= 0; i--) {
    const col = right[i];
    placements.set(col, { side: "right", offset: rightOffset, isBoundary: i === 0 });
    rightOffset += resolveWidth(keys.get(col) as string, col.width, widths);
  }

  return { ordered: [...left, ...middle, ...right], keys, placements, selection, actions };
}

/**
 * Merge sticky positioning + background + boundary-divider styles onto a cell's
 * existing style/className. Pinned body cells stay opaque across hover/selected
 * states so scrolled content never bleeds through them.
 */
function pinCellProps(
  placement: PinPlacement | undefined,
  base: { style?: CSSProperties; className?: string },
  variant: "header" | "body",
): { style?: CSSProperties; className?: string } {
  if (!placement) return base;
  const style: CSSProperties = {
    ...base.style,
    position: "sticky",
    [placement.side]: placement.offset,
  };
  const className = cn(
    base.className,
    // Below the sticky header (z-10) but above non-pinned scrolling cells.
    "astw:z-[1]",
    variant === "header"
      ? // The header's bottom hairline is drawn by the thead inset-shadow, which
        // the opaque pinned background covers. Redraw it with a `::before` (which
        // renders under `border-collapse`, where a cell border would be dropped on
        // the sticky header row). Body cells don't need this — the row's collapsed
        // border already paints over the cell background.
        "astw:bg-card astw:before:pointer-events-none astw:before:absolute astw:before:inset-x-0 astw:before:bottom-0 astw:before:h-px astw:before:bg-border astw:before:content-['']"
      : cn(
          "astw:bg-card astw:transition-colors",
          // Match the row's hover/selected fade timing; without the cell-level
          // transition, sticky pinned cells snap while the rest of the row fades.
          "astw:group-hover:[background-color:color-mix(in_srgb,var(--muted)_50%,var(--card))]",
          "astw:group-aria-selected:bg-muted",
        ),
    // Freeze-seam shadow via a pseudo-element gradient. A real `box-shadow` is
    // dropped by browsers on cells under `border-collapse: collapse` (the table's
    // model), so we paint a gradient just outside the boundary edge instead — it
    // sits above the scrolling cells and reads as depth. Hidden at rest; revealed
    // only while content is scrolled under that edge (data attributes set on the
    // scroll container by DataTable.Table).
    placement.isBoundary &&
      placement.side === "left" &&
      "astw:after:pointer-events-none astw:after:absolute astw:after:inset-y-0 astw:after:right-0 astw:after:w-1 astw:after:translate-x-full astw:after:bg-gradient-to-r astw:after:from-black/10 astw:dark:after:from-black/20 astw:after:to-transparent astw:after:content-[''] astw:after:opacity-0 astw:after:transition-opacity astw:[[data-pin-shadow-left]_&]:after:opacity-100",
    placement.isBoundary &&
      placement.side === "right" &&
      "astw:after:pointer-events-none astw:after:absolute astw:after:inset-y-0 astw:after:left-0 astw:after:w-1 astw:after:-translate-x-full astw:after:bg-gradient-to-l astw:after:from-black/10 astw:dark:after:from-black/20 astw:after:to-transparent astw:after:content-[''] astw:after:opacity-0 astw:after:transition-opacity astw:[[data-pin-shadow-right]_&]:after:opacity-100",
  );
  return { style, className };
}

// =============================================================================
// DataTableLoaderRows (internal)
// =============================================================================

interface DataTableLoaderRowsProps<TRow extends Record<string, unknown>> {
  rowCount: number;
  pinLayout: PinLayout<TRow>;
  hasSelection: boolean;
  hasRowActions: boolean;
}

// Skeleton cell widths (%) — varied per row+col to look natural
const SKELETON_WIDTHS = [75, 55, 85, 65, 70];

/** @internal */
function DataTableLoaderRows<TRow extends Record<string, unknown>>({
  rowCount,
  pinLayout,
  hasSelection,
  hasRowActions,
}: DataTableLoaderRowsProps<TRow>) {
  const { ordered: columns, keys, placements, selection, actions } = pinLayout;
  // No fixed row height: each cell's placeholder matches the height of the
  // real content it stands in for (text line, badge, icon button), so the
  // skeleton rows resolve to exactly the same row height as loaded rows and
  // the table doesn't shift when data arrives.
  return (
    <>
      {Array.from({ length: rowCount }).map((_, rowIndex) => (
        <Table.Row key={rowIndex} data-datatable-state="loading" className="astw:group">
          {hasSelection &&
            (() => {
              const { style, className } = pinCellProps(
                selection,
                { style: { width: SELECTION_WIDTH }, className: "astw:pl-3!" },
                "body",
              );
              return (
                <Table.Cell style={style} className={className}>
                  <div className="astw:size-4 astw:rounded-xs astw:bg-muted astw:animate-pulse" />
                </Table.Cell>
              );
            })()}
          {columns?.map((col, colIndex) => {
            const key = keys.get(col) as string;
            const skeletonWidth = SKELETON_WIDTHS[(rowIndex + colIndex) % SKELETON_WIDTHS.length];
            const isBadge = col.type === "badge";
            const { style, className } = pinCellProps(
              placements.get(col),
              { style: col.width ? { width: col.width } : undefined },
              "body",
            );
            return (
              <Table.Cell key={key} style={style} className={className}>
                <div
                  className={cn(
                    "astw:bg-muted astw:animate-pulse",
                    // badge cells render 22px pills; text cells occupy one
                    // 20px line box (bar inset by my-0.5 to keep the lighter
                    // 16px placeholder look)
                    isBadge ? "astw:h-5.5 astw:rounded-full" : "astw:h-4 astw:my-0.5 astw:rounded",
                    resolveAlign(col) === "right" && "astw:ml-auto",
                  )}
                  style={{ width: `${skeletonWidth}%` }}
                />
              </Table.Cell>
            );
          })}
          {hasRowActions &&
            (() => {
              const { style, className } = pinCellProps(
                actions,
                { style: { width: ACTIONS_WIDTH }, className: "astw:pr-2!" },
                "body",
              );
              return (
                <Table.Cell style={style} className={className}>
                  {/* size-9 box = the real icon Button's footprint; the visible
                      pulse stays 24px to read as an ellipsis placeholder */}
                  <div className="astw:mx-auto astw:flex astw:size-9 astw:items-center astw:justify-center">
                    <div className="astw:size-6 astw:rounded astw:bg-muted astw:animate-pulse" />
                  </div>
                </Table.Cell>
              );
            })()}
        </Table.Row>
      ))}
    </>
  );
}

// =============================================================================
// DataTableStatusRow (internal)
// =============================================================================

interface DataTableStatusRowProps {
  totalColSpan: number;
  state: string;
  children: ReactNode;
}

/** @internal */
function DataTableStatusRow({ totalColSpan, state, children }: DataTableStatusRowProps) {
  return (
    <Table.Row data-datatable-state={state} className="astw:border-0 astw:hover:bg-transparent">
      {/* Fixed 3-row height, independent of pageSize — never pageSize-worth,
          which at large page sizes creates a huge blank (or scrollable)
          region. The message is sticky (offsets resolve against the
          scrollport) so it stays in view even when a height-constrained
          container (e.g. inside <Layout fill>) is shorter than this height. */}
      <Table.Cell
        colSpan={totalColSpan}
        style={{ height: `${STATUS_ROWS * ROW_HEIGHT_PX}px` }}
        className="astw:text-center astw:align-top"
      >
        <div className="astw:sticky astw:top-[45%]">{children}</div>
      </Table.Cell>
    </Table.Row>
  );
}

// =============================================================================
// DataTable.Root
// =============================================================================

export interface DataTableRootProps<TRow extends Record<string, unknown>> {
  value: UseDataTableReturn<TRow>;
  children: ReactNode;
  className?: string;
}

/** Use `DataTable.Root` instead of calling this directly. */
function DataTableRoot<TRow extends Record<string, unknown>>({
  value,
  children,
  className,
}: DataTableRootProps<TRow>) {
  const dataTableValue: DataTableContextValue<TRow> = {
    columns: value.columns,
    rows: value.rows,
    loading: value.loading,
    error: value.error,
    sortStates: value.sortStates ?? [],
    onSort: value.onSort,
    visibleColumns: value.visibleColumns,
    isColumnVisible: value.isColumnVisible,
    toggleColumn: value.toggleColumn,
    showAllColumns: value.showAllColumns,
    hideAllColumns: value.hideAllColumns,
    columnOrder: value.columnOrder,
    moveColumn: value.moveColumn,
    setColumnOrder: value.setColumnOrder,
    pinnedColumns: value.pinnedColumns,
    setPin: value.setPin,
    pageInfo: value.pageInfo,
    total: value.total,
    totalPages: value.totalPages,
    currentPage: value.currentPage,
    pageSize: value.pageSize,
    setPageSize: value.setPageSize,
    goToNextPage: value.goToNextPage,
    goToPrevPage: value.goToPrevPage,
    goToFirstPage: value.goToFirstPage,
    goToLastPage: value.goToLastPage,
    hasPrevPage: value.hasPrevPage,
    hasNextPage: value.hasNextPage,
    onClickRow: value.onClickRow,
    rowActions: value.rowActions,
    selectedIds: value.selectedIds,
    isRowSelected: value.isRowSelected,
    toggleRowSelection: value.toggleRowSelection,
    selectAllRows: value.selectAllRows,
    clearSelection: value.clearSelection,
    isAllSelected: value.isAllSelected,
    isIndeterminate: value.isIndeterminate,
  };

  const controlValue = value.control ?? null;

  // Tooltip.Provider shares hover-delay state for the per-cell truncate
  // tooltips; benign no-op when no column opts into `truncate`.
  const inner = (
    <Tooltip.Provider delay={300}>
      <DataTableContext.Provider value={dataTableValue}>
        {/* flex-col + min-h-0 (no flex-1): natural height when content fits,
            but able to shrink when the parent chain constrains height (e.g.
            <Layout fill>). When shrunk, the Table region scrolls internally
            while the Toolbar and Footer (shrink-0) stay visible. */}
        <div
          data-slot="data-table"
          className={cn(
            "astw:flex astw:flex-col astw:min-h-0 astw:border astw:border-border astw:rounded-md astw:bg-card",
            className,
          )}
        >
          {children}
        </div>
      </DataTableContext.Provider>
    </Tooltip.Provider>
  );

  if (controlValue) {
    return <CollectionControlProvider value={controlValue}>{inner}</CollectionControlProvider>;
  }

  return inner;
}
DataTableRoot.displayName = "DataTable.Root";

// =============================================================================
// DataTable.Headers
// =============================================================================

/** @internal */
function DataTableHeaders({ className: headerClassName }: { className?: string }) {
  const ctx = useContext(DataTableContext);
  if (!ctx) {
    throw new Error("<DataTable.Headers> must be used within <DataTable.Root>");
  }
  const {
    columns: allColumns,
    visibleColumns: columns,
    pinnedColumns,
    sortStates,
    onSort,
    rowActions,
    toggleRowSelection,
    selectAllRows,
    clearSelection,
    isAllSelected,
    isIndeterminate,
  } = ctx;
  const t = useDataTableT();
  const widths = useContext(PinMeasureContext);
  const hasSelection = !!toggleRowSelection;
  const hasRowActions = !!(rowActions && rowActions.length > 0);
  const columnKeys = useMemo(() => buildColumnKeys(allColumns), [allColumns]);
  const { ordered, keys, placements, selection, actions } = useMemo(
    () =>
      computePinLayout(columns, pinnedColumns, { hasSelection, hasRowActions, widths, columnKeys }),
    [columns, pinnedColumns, hasSelection, hasRowActions, widths, columnKeys],
  );

  return (
    // Sticky within the DataTable.Table scroll container so column headers
    // stay visible while rows scroll beneath. bg-card keeps rows from showing
    // through; the inset shadow re-draws the bottom border, which Chrome drops
    // from sticky rows under `border-collapse: collapse`.
    <Table.Header
      data-slot="data-table-header"
      className={cn(
        "astw:sticky astw:top-0 astw:z-10 astw:bg-card",
        "astw:shadow-[inset_0_-1px_0_0_var(--border)] astw:[&_tr]:border-b-0",
        headerClassName,
      )}
    >
      <Table.Row className="astw:group">
        {hasSelection &&
          (() => {
            const { style, className } = pinCellProps(
              selection,
              { style: { width: SELECTION_WIDTH }, className: "astw:pl-3!" },
              "header",
            );
            return (
              <Table.Head data-col-key={SELECTION_KEY} style={style} className={className}>
                <Checkbox.Root
                  checked={isAllSelected}
                  indeterminate={isIndeterminate}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      selectAllRows?.();
                    } else {
                      clearSelection?.();
                    }
                  }}
                  aria-label={t("selectAll")}
                  className={cn(
                    "astw:flex astw:size-4 astw:items-center astw:justify-center astw:rounded-xs astw:border astw:border-input",
                    "astw:data-checked:bg-primary astw:data-checked:border-primary astw:data-checked:text-primary-foreground",
                    "astw:data-indeterminate:bg-primary astw:data-indeterminate:border-primary astw:data-indeterminate:text-primary-foreground",
                  )}
                >
                  <Checkbox.Indicator className="astw:flex astw:data-unchecked:hidden">
                    {isIndeterminate ? (
                      <Minus className="astw:size-3" />
                    ) : (
                      <Check className="astw:size-3" />
                    )}
                  </Checkbox.Indicator>
                </Checkbox.Root>
              </Table.Head>
            );
          })()}
        {ordered?.map((col) => {
          const key = keys.get(col) as string;
          const label = col.label;

          const isSortable = !!col.sort;
          const currentSort = col.sort
            ? sortStates?.find((s) => s.field === (col.sort as SortConfig).field)
            : undefined;

          const handleClick = () => {
            if (!isSortable || !onSort || !col.sort) return;
            onSort(col.sort.field, nextSortDirection(currentSort?.direction));
          };

          const align = resolveAlign(col);
          const { style, className } = pinCellProps(
            placements.get(col),
            {
              style: col.width ? { width: col.width } : undefined,
              className: cn(
                isSortable && "astw:cursor-pointer astw:select-none",
                align === "right" && "astw:text-right",
              ),
            },
            "header",
          );
          return (
            <Table.Head
              key={key}
              data-col-key={key}
              style={style}
              className={className}
              onClick={isSortable ? handleClick : undefined}
            >
              <span
                className={cn(
                  "astw:inline-flex astw:items-center astw:gap-1",
                  align === "right" && "astw:justify-end",
                )}
              >
                {label}
                {currentSort && <SortIndicator direction={currentSort.direction} />}
              </span>
            </Table.Head>
          );
        })}
        {hasRowActions &&
          (() => {
            const { style, className } = pinCellProps(
              actions,
              { style: { width: ACTIONS_WIDTH }, className: "astw:pr-2!" },
              "header",
            );
            return (
              <Table.Head data-col-key={ACTIONS_KEY} style={style} className={className}>
                <span className="astw:sr-only">{t("actionsHeader")}</span>
              </Table.Head>
            );
          })()}
      </Table.Row>
    </Table.Header>
  );
}
DataTableHeaders.displayName = "DataTable.Headers";

/** @internal */
function SortIndicator({ direction }: { direction: "Asc" | "Desc" }) {
  return (
    <span
      data-slot="data-table-sort-indicator"
      className="astw:text-muted-foreground astw:text-xs"
      aria-hidden
    >
      {direction === "Asc" ? "▲" : "▼"}
    </span>
  );
}

// =============================================================================
// DataTable.Body
// =============================================================================

/** @internal */
function DataTableBody({ className }: { className?: string }) {
  const ctx = useContext(DataTableContext);
  if (!ctx) {
    throw new Error("<DataTable.Body> must be used within <DataTable.Root>");
  }
  const {
    columns: allColumns,
    visibleColumns: columns,
    pinnedColumns,
    rows,
    loading,
    error,
    onClickRow,
    rowActions,
    isRowSelected,
    toggleRowSelection,
    pageSize,
  } = ctx;
  const t = useDataTableT();
  const widths = useContext(PinMeasureContext);
  const hasRowActions = !!(rowActions && rowActions.length > 0);
  const hasSelection = !!toggleRowSelection;
  const totalColSpan = (columns?.length ?? 1) + (hasRowActions ? 1 : 0) + (hasSelection ? 1 : 0);
  const rowCount = pageSize > 0 ? pageSize : DEFAULT_ROWS;
  const columnKeys = useMemo(() => buildColumnKeys(allColumns), [allColumns]);
  const pinLayout = useMemo(
    () =>
      computePinLayout(columns, pinnedColumns, { hasSelection, hasRowActions, widths, columnKeys }),
    [columns, pinnedColumns, hasSelection, hasRowActions, widths, columnKeys],
  );
  const tableBodyProps = {
    "data-slot": "data-table-body",
    className,
  };

  if (loading) {
    return (
      <Table.Body {...tableBodyProps}>
        <DataTableLoaderRows
          rowCount={rowCount}
          pinLayout={pinLayout}
          hasSelection={hasSelection}
          hasRowActions={hasRowActions}
        />
      </Table.Body>
    );
  }

  if (error) {
    return (
      <Table.Body {...tableBodyProps}>
        <DataTableStatusRow totalColSpan={totalColSpan} state="error">
          <span className="astw:text-destructive">
            {t("errorPrefix")} {error.message}
          </span>
        </DataTableStatusRow>
      </Table.Body>
    );
  }

  if (!rows || rows.length === 0) {
    return (
      <Table.Body {...tableBodyProps}>
        <DataTableStatusRow totalColSpan={totalColSpan} state="empty">
          <span className="astw:text-muted-foreground">{t("noData")}</span>
        </DataTableStatusRow>
      </Table.Body>
    );
  }

  return (
    <Table.Body {...tableBodyProps}>
      <DataTableRows
        rows={rows}
        pinLayout={pinLayout}
        hasSelection={hasSelection}
        hasRowActions={hasRowActions}
        isRowSelected={isRowSelected}
        toggleRowSelection={toggleRowSelection}
        rowActions={rowActions}
        onClickRow={onClickRow}
      />
    </Table.Body>
  );
}
DataTableBody.displayName = "DataTable.Body";

// =============================================================================
// Row rendering
// =============================================================================

interface DataTableRowsProps<TRow extends Record<string, unknown>> {
  rows: TRow[];
  pinLayout: PinLayout<TRow>;
  hasSelection: boolean;
  hasRowActions: boolean;
  isRowSelected: (row: TRow) => boolean;
  toggleRowSelection?: (row: TRow) => void;
  rowActions?: RowAction<TRow>[];
  onClickRow?: (row: TRow) => void;
}

/** @internal */
function DataTableRows<TRow extends Record<string, unknown>>({
  rows,
  pinLayout,
  hasSelection,
  hasRowActions,
  isRowSelected,
  toggleRowSelection,
  rowActions,
  onClickRow,
}: DataTableRowsProps<TRow>) {
  const t = useDataTableT();
  const { ordered, keys, placements, selection, actions } = pinLayout;

  return (
    <>
      {rows.map((row, rowIndex) => {
        const rowId = (row as Record<string, unknown>)["id"];
        const selected = isRowSelected?.(row) ?? false;
        return (
          <Table.Row
            key={rowId != null ? String(rowId) : rowIndex}
            data-slot="data-table-row"
            aria-selected={hasSelection ? selected : undefined}
            className={cn("astw:group", onClickRow && "astw:cursor-pointer")}
            onClick={onClickRow ? () => onClickRow(row) : undefined}
          >
            {hasSelection &&
              toggleRowSelection &&
              (() => {
                const { style, className } = pinCellProps(
                  selection,
                  { style: { width: SELECTION_WIDTH }, className: "astw:pl-3!" },
                  "body",
                );
                return (
                  <Table.Cell
                    style={style}
                    className={className}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Checkbox.Root
                      checked={selected}
                      onCheckedChange={() => toggleRowSelection(row)}
                      aria-label={t("selectRow")}
                      className={cn(
                        "astw:flex astw:size-4 astw:items-center astw:justify-center astw:rounded-xs astw:border astw:border-input",
                        "astw:data-checked:bg-primary astw:data-checked:border-primary astw:data-checked:text-primary-foreground",
                      )}
                    >
                      <Checkbox.Indicator className="astw:flex astw:data-unchecked:hidden">
                        <Check className="astw:size-3" />
                      </Checkbox.Indicator>
                    </Checkbox.Root>
                  </Table.Cell>
                );
              })()}
            {ordered?.map((col) => {
              const key = keys.get(col) as string;
              const content = col.render ? col.render(row) : renderTypedCell(row, col);

              const { style: cellStyle, className: cellClassName } = pinCellProps(
                placements.get(col),
                {
                  style: col.width ? { width: col.width } : undefined,
                  className: cn(
                    resolveAlign(col) === "right" && "astw:text-right",
                    // Keep the width constraint on the cell, but move the
                    // `overflow: hidden` truncation to an inner span (below) — a
                    // truncating cell would otherwise clip the freeze-shadow
                    // `::after`, which is drawn just outside the cell edge.
                    col.truncate && "astw:max-w-0",
                  ),
                },
                "body",
              );
              // Truncate via an inner element so the cell's overflow stays visible.
              const cellBody = col.truncate ? (
                <span className="astw:block astw:truncate">{content}</span>
              ) : (
                content
              );

              // Surface the full value on hover when the cell is truncated
              // and the resolved cell value is a stringifiable primitive.
              // `getCellValue` is the same precedence rule the built-in
              // renderers use (`accessor` first, then `row[col.id]`), so
              // typed and inferred columns get tooltip wiring for free.
              // Objects / arrays / no value are skipped — pass a custom
              // `render` for those cases.
              let tooltipLabel: string | undefined;
              if (col.truncate) {
                const raw = getCellValue(row, col);
                if (typeof raw === "string" || typeof raw === "number") {
                  tooltipLabel = String(raw);
                }
              }

              if (tooltipLabel !== undefined) {
                return (
                  <Tooltip.Root key={key}>
                    <Tooltip.Trigger
                      render={
                        <Table.Cell
                          data-slot="data-table-cell"
                          style={cellStyle}
                          className={cellClassName}
                        />
                      }
                    >
                      {cellBody}
                    </Tooltip.Trigger>
                    <Tooltip.Content>{tooltipLabel}</Tooltip.Content>
                  </Tooltip.Root>
                );
              }

              return (
                <Table.Cell
                  key={key}
                  data-slot="data-table-cell"
                  style={cellStyle}
                  className={cellClassName}
                >
                  {cellBody}
                </Table.Cell>
              );
            })}
            {hasRowActions &&
              rowActions &&
              (() => {
                const { style, className } = pinCellProps(
                  actions,
                  { style: { width: ACTIONS_WIDTH }, className: "astw:pr-2!" },
                  "body",
                );
                return (
                  <Table.Cell
                    style={style}
                    className={className}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <RowActionsMenu actions={rowActions} row={row} />
                  </Table.Cell>
                );
              })()}
          </Table.Row>
        );
      })}
    </>
  );
}

// =============================================================================
// RowActionsMenu (internal — uses app-shell Menu)
// =============================================================================

function RowActionsMenu<TRow extends Record<string, unknown>>({
  actions,
  row,
}: {
  actions: RowAction<TRow>[];
  row: TRow;
}) {
  const t = useDataTableT();

  return (
    <div data-slot="data-table-row-actions">
      <Menu.Root>
        <Menu.Trigger
          render={
            <Button variant="ghost" size="icon" aria-label={t("rowActions")}>
              <Ellipsis className="astw:size-4" />
            </Button>
          }
        />
        <Menu.Content>
          {actions.map((action) => {
            const disabled = action.isDisabled?.(row) ?? false;
            return (
              <Menu.Item
                key={action.id}
                disabled={disabled}
                onClick={() => {
                  if (!disabled) {
                    action.onClick(row);
                  }
                }}
                className={cn(action.variant === "destructive" && "astw:text-destructive")}
              >
                {action.icon}
                {action.label}
              </Menu.Item>
            );
          })}
        </Menu.Content>
      </Menu.Root>
    </div>
  );
}

// =============================================================================
// DataTable.Table
// =============================================================================

/** Use `DataTable.Table` instead of calling this directly. */
function DataTableTable({ className }: { className?: string }) {
  const ctx = useContext(DataTableContext);
  const containerRef = useRef<HTMLDivElement>(null);
  const [widths, setWidths] = useState<ColumnWidths>({});

  const visibleColumns = ctx?.visibleColumns;
  const pinnedColumns = ctx?.pinnedColumns;

  // Measure each column's *rendered* width from the (always-present) header row
  // and publish it via PinMeasureContext, so sticky offsets reflect real
  // geometry rather than declared `width`. This keeps the table on its natural
  // `table-auto` sizing — pinning no longer forces `table-fixed` (which would
  // require every column to set an explicit width or collapse). Runs before
  // paint and re-measures on container/column changes.
  useIsomorphicLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const measure = () => {
      const cells = el.querySelectorAll<HTMLElement>(
        "[data-slot='data-table-header'] [data-col-key]",
      );
      const next: ColumnWidths = {};
      cells.forEach((cell) => {
        const key = cell.dataset.colKey;
        if (key) next[key] = cell.offsetWidth;
      });
      setWidths((prev) => (sameWidths(prev, next) ? prev : next));
    };
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    const table = el.querySelector("table");
    if (table) observer.observe(table);
    return () => observer.disconnect();
  }, [visibleColumns, pinnedColumns]);

  // Reflect horizontal scroll position onto the container as data attributes so
  // the pinned-column freeze shadows show only while there is content scrolled
  // under that edge (left once scrolled from the start; right while more remains
  // to the right). Re-runs when the column set changes and observes size changes.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => {
      const maxScroll = el.scrollWidth - el.clientWidth;
      el.toggleAttribute("data-pin-shadow-left", el.scrollLeft > 0);
      el.toggleAttribute("data-pin-shadow-right", el.scrollLeft < maxScroll - 1);
    };
    update();
    el.addEventListener("scroll", update, { passive: true });
    if (typeof ResizeObserver === "undefined") {
      return () => el.removeEventListener("scroll", update);
    }
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => {
      el.removeEventListener("scroll", update);
      observer.disconnect();
    };
  }, [visibleColumns, pinnedColumns]);

  return (
    // min-h-0 lets the scroll container shrink within DataTable.Root's flex
    // column; combined with the container's overflow-auto this is the region
    // that scrolls vertically when height is constrained. The sticky header
    // (DataTableHeaders) stays pinned to the top of this scrollport.
    <PinMeasureContext.Provider value={widths}>
      <Table.Root
        data-slot="data-table-table"
        containerRef={containerRef}
        containerClassName="astw:min-h-0 astw:overflow-auto"
        className={className}
      >
        <DataTableHeaders />
        <DataTableBody />
      </Table.Root>
    </PinMeasureContext.Provider>
  );
}
DataTableTable.displayName = "DataTable.Table";

// =============================================================================
// DataTable.Footer
// =============================================================================

/** Use `DataTable.Footer` instead of calling this directly. */
function DataTableFooter({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      data-slot="data-table-footer"
      className={cn(
        "astw:flex astw:shrink-0 astw:items-center astw:border-t astw:border-border astw:px-4 astw:py-2",
        className,
      )}
    >
      {children}
    </div>
  );
}
DataTableFooter.displayName = "DataTable.Footer";

// =============================================================================
// DataTable namespace
// =============================================================================

export const DataTable = {
  /**
   * Context/provider root. Wraps all other `DataTable.*` components and
   * wires state from `useDataTable()` into context.
   */
  Root: DataTableRoot,
  /**
   * Container for toolbar content (filters, column settings, search, etc.).
   * Place inside `DataTable.Root`, before `DataTable.Table`. Lays children out
   * in a row; `DataTable.ColumnSettings` right-aligns itself within it.
   */
  Toolbar: DataTableToolbar,
  /**
   * Auto-generated filter chips from column filter configs.
   *
   * **Requires `control`** — `useDataTable()` must receive `control` from
   * `useCollectionVariables()`, otherwise this component throws at render time.
   */
  Filters: DataTableFilters,
  /**
   * Column controls popover — show/hide columns, drag to reorder, and drag
   * between the Fixed left / Scrollable / Fixed right zones to pin them.
   * Persists per-user when `useDataTable` has a `tableId`. Place inside
   * `DataTable.Toolbar` (it right-aligns itself).
   */
  ColumnSettings: DataTableColumnSettings,
  /**
   * Renders `<table>` with built-in `Headers` and `Body`.
   * Place inside `DataTable.Root`.
   */
  Table: DataTableTable,
  /**
   * Footer container for pagination and other footer content.
   * Place inside `DataTable.Root`, after `DataTable.Table`.
   */
  Footer: DataTableFooter,
  /**
   * Pre-built pagination controls. Place inside `DataTable.Footer`.
   *
   * **Requires `control`** — `useDataTable()` must receive `control` from
   * `useCollectionVariables()`, otherwise this component throws at render time.
   *
   * **Go-to-first / go-to-last buttons** — Rendered only when `totalPages` is
   * non-null (i.e. the backend returns a total count). When `totalPages` is
   * `null`, these buttons and the page counter are omitted.
   */
  Pagination: DataTablePagination,
} as const;
