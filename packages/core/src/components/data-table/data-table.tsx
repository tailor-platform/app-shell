import {
  createContext,
  Fragment,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { ChevronRight, Ellipsis } from "lucide-react";
import { cn } from "@/lib/utils";
import { CollectionControlProvider } from "@/contexts/collection-control-context";
import { Table } from "@/components/table";
import { Button } from "@/components/button";
import { Checkbox } from "@/components/checkbox";
import { Menu } from "@/components/menu";
import { Tooltip } from "@/components/tooltip";
import type {
  Column,
  HeaderRenderContext,
  RowAction,
  RowExpansionOptions,
  UseDataTableReturn,
} from "./types";
import { DataTableContext, type DataTableContextValue } from "./data-table-context";
import { useDataTableT } from "./i18n";
import { getCellValue, renderTypedCell } from "./cell-renderers";
import { DataTableToolbar, DataTableFilters } from "./toolbar";
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

function renderDefaultHeader(
  content: ReactNode,
  ctx: HeaderRenderContext,
  align: "left" | "right",
  edges?: { bleedLeft?: boolean; bleedRight?: boolean },
): ReactNode {
  if (!ctx.sortable) return content;

  return (
    <button
      type="button"
      onClick={ctx.activateSort}
      className={cn(
        "astw:flex astw:h-10 astw:w-full astw:cursor-pointer astw:select-none astw:items-center astw:gap-1 astw:border-0 astw:bg-transparent astw:-mx-2 astw:p-0 astw:px-2 astw:text-inherit astw:outline-none astw:focus-visible:ring-ring/50 astw:focus-visible:ring-[3px]",
        edges?.bleedLeft && "astw:-ml-6 astw:pl-6",
        edges?.bleedRight && "astw:-mr-6 astw:pr-6",
        align === "right" ? "astw:justify-end astw:text-right" : "astw:text-left",
      )}
    >
      {content}
      {ctx.sortDirection && <SortIndicator direction={ctx.sortDirection} />}
    </button>
  );
}

// =============================================================================
// Column pinning (sticky columns)
// =============================================================================

// Fallback widths of the built-in selection / row-actions columns, used as the
// innermost anchors before the real widths are measured.
const SELECTION_WIDTH = 52;
const ACTIONS_WIDTH = 50;
const EXPAND_WIDTH = 44;
// Keys for the built-in selection / row-actions columns in the measured-width map.
const SELECTION_KEY = "__datatable_selection__";
const ACTIONS_KEY = "__datatable_actions__";
const EXPAND_KEY = "__datatable_expand__";

// Drives both the CSS transition and how long the detail row stays mounted while
// collapsing, so the two cannot drift apart.
const EXPAND_TRANSITION_MS = 300;

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
  /** Placement for the built-in expand column, when present. */
  expand?: PinPlacement;
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
 * The selection and expand columns (when present) auto-pin to the left edge and
 * row-actions (if present) auto-pins to the right edge, with user-pinned columns
 * stacking outward from them.
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
    hasExpand: boolean;
    hasRowActions: boolean;
    widths: ColumnWidths;
    columnKeys: Map<Column<TRow>, string>;
  },
): PinLayout<TRow> {
  const { hasSelection, hasExpand, hasRowActions, widths, columnKeys } = opts;

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

  // Left group, visually [selection?, expand?, ...left]; offsets accumulate
  // rightward using the measured (or declared) width of each preceding pinned
  // column. `isBoundary` marks the outermost cell of the group — the one that
  // draws the freeze seam — so it moves to `expand` as soon as that column exists.
  let leftOffset = 0;
  let selection: PinPlacement | undefined;
  let expand: PinPlacement | undefined;
  if (hasSelection) {
    selection = { side: "left", offset: 0, isBoundary: !hasExpand && left.length === 0 };
    leftOffset = resolveWidth(SELECTION_KEY, SELECTION_WIDTH, widths);
  }
  if (hasExpand) {
    expand = { side: "left", offset: leftOffset, isBoundary: left.length === 0 };
    leftOffset += resolveWidth(EXPAND_KEY, EXPAND_WIDTH, widths);
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

  return { ordered: [...left, ...middle, ...right], keys, placements, selection, expand, actions };
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
  hasExpand: boolean;
  hasRowActions: boolean;
}

// Skeleton cell widths (%) — varied per row+col to look natural
const SKELETON_WIDTHS = [75, 55, 85, 65, 70];

/** @internal */
function DataTableLoaderRows<TRow extends Record<string, unknown>>({
  rowCount,
  pinLayout,
  hasSelection,
  hasExpand,
  hasRowActions,
}: DataTableLoaderRowsProps<TRow>) {
  const { ordered: columns, keys, placements, selection, expand, actions } = pinLayout;
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
          {hasExpand &&
            (() => {
              const { style, className } = pinCellProps(
                expand,
                { style: { width: EXPAND_WIDTH } },
                "body",
              );
              return (
                <Table.Cell style={style} className={className}>
                  {/* size-9 box = the real chevron Button's footprint, so the
                      skeleton row resolves to the same height as a loaded row */}
                  <div className="astw:mx-auto astw:flex astw:size-9 astw:items-center astw:justify-center">
                    <div className="astw:size-4 astw:rounded astw:bg-muted astw:animate-pulse" />
                  </div>
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
      {/* Reserve a fixed 3-row height (acts as a minimum — the cell grows if a
          bounded container makes the row taller), independent of pageSize so
          large page sizes don't create a huge blank/scrollable region.
          `align-middle` centres the message vertically within that height. */}
      <Table.Cell
        colSpan={totalColSpan}
        style={{ height: `${STATUS_ROWS * ROW_HEIGHT_PX}px` }}
        className="astw:text-center astw:align-middle"
      >
        {children}
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
    expandedIds: value.expandedIds,
    isRowExpanded: value.isRowExpanded,
    toggleRowExpansion: value.toggleRowExpansion,
    collapseAllRows: value.collapseAllRows,
    rowExpansion: value.rowExpansion,
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
    rowExpansion,
  } = ctx;
  const t = useDataTableT();
  const widths = useContext(PinMeasureContext);
  const hasSelection = !!toggleRowSelection;
  const hasExpand = !!rowExpansion;
  const hasRowActions = !!(rowActions && rowActions.length > 0);
  const columnKeys = useMemo(() => buildColumnKeys(allColumns), [allColumns]);
  const { ordered, keys, placements, selection, expand, actions } = useMemo(
    () =>
      computePinLayout(columns, pinnedColumns, {
        hasSelection,
        hasExpand,
        hasRowActions,
        widths,
        columnKeys,
      }),
    [columns, pinnedColumns, hasSelection, hasExpand, hasRowActions, widths, columnKeys],
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
                <Checkbox
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
                />
              </Table.Head>
            );
          })()}
        {hasExpand &&
          (() => {
            const { style, className } = pinCellProps(
              expand,
              { style: { width: EXPAND_WIDTH } },
              "header",
            );
            return (
              <Table.Head data-col-key={EXPAND_KEY} style={style} className={className}>
                <span className="astw:sr-only">{t("expandColumnHeader")}</span>
              </Table.Head>
            );
          })()}
        {ordered?.map((col, index) => {
          const key = keys.get(col) as string;
          const label = col.label;
          const sortField = col.sort?.field;
          const currentSort = sortField
            ? sortStates?.find((s) => s.field === sortField)
            : undefined;
          const isSortable = !!sortField && !!onSort;

          const activateSort = () => {
            if (!sortField || !onSort) return;
            onSort(sortField, nextSortDirection(currentSort?.direction));
          };

          const headerContext: HeaderRenderContext = isSortable
            ? {
                label,
                sortable: true,
                sortDirection: currentSort?.direction,
                activateSort,
              }
            : { label, sortable: false };

          const align = resolveAlign(col);
          const content = col.header
            ? col.header(headerContext)
            : renderDefaultHeader(label, headerContext, align, {
                bleedLeft: !hasSelection && !hasExpand && index === 0,
                bleedRight: !hasRowActions && index === ordered.length - 1,
              });

          const { style, className } = pinCellProps(
            placements.get(col),
            {
              style: col.width ? { width: col.width } : undefined,
              className: cn(align === "right" && "astw:text-right"),
            },
            "header",
          );
          return (
            <Table.Head key={key} data-col-key={key} style={style} className={className}>
              {content}
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
    rowExpansion,
    isRowExpanded,
    toggleRowExpansion,
  } = ctx;
  const t = useDataTableT();
  const widths = useContext(PinMeasureContext);
  const hasRowActions = !!(rowActions && rowActions.length > 0);
  const hasSelection = !!toggleRowSelection;
  const hasExpand = !!rowExpansion;
  const totalColSpan =
    (columns?.length ?? 1) + (hasRowActions ? 1 : 0) + (hasSelection ? 1 : 0) + (hasExpand ? 1 : 0);
  const rowCount = pageSize > 0 ? pageSize : DEFAULT_ROWS;
  const columnKeys = useMemo(() => buildColumnKeys(allColumns), [allColumns]);
  const pinLayout = useMemo(
    () =>
      computePinLayout(columns, pinnedColumns, {
        hasSelection,
        hasExpand,
        hasRowActions,
        widths,
        columnKeys,
      }),
    [columns, pinnedColumns, hasSelection, hasExpand, hasRowActions, widths, columnKeys],
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
          hasExpand={hasExpand}
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
        totalColSpan={totalColSpan}
        rowExpansion={rowExpansion}
        isRowExpanded={isRowExpanded}
        toggleRowExpansion={toggleRowExpansion}
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
  totalColSpan: number;
  rowExpansion?: RowExpansionOptions<TRow>;
  /** Optional — `DataTableContextValue` may be hand-constructed without it. */
  isRowExpanded?: (row: TRow) => boolean;
  toggleRowExpansion?: (row: TRow) => void;
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
  totalColSpan,
  rowExpansion,
  isRowExpanded,
  toggleRowExpansion,
}: DataTableRowsProps<TRow>) {
  const t = useDataTableT();
  const baseId = useId();
  const hasExpand = !!rowExpansion;
  const { ordered, keys, placements, selection, expand, actions } = pinLayout;

  return (
    <>
      {rows.map((row, rowIndex) => {
        const rowId = (row as Record<string, unknown>)["id"];
        const selected = isRowSelected?.(row) ?? false;
        // Namespaced so an id-less row's index fallback can't collide with a real
        // id of the same digits — React reconciles duplicate keys by position,
        // pairing a detail panel with the wrong row.
        const rowKey = rowId != null ? `id:${String(rowId)}` : `idx:${rowIndex}`;
        // Expansion is keyed by id, so a row without one gets no chevron at all
        // rather than a disabled one — it must never be un-toggleable (D5).
        const expandable = hasExpand && rowId != null && (rowExpansion?.canExpand?.(row) ?? true);
        // Gated on `canExpand` in both directions, so a stale id (restored from
        // a URL, say) can't open a panel for a row the consumer excluded. Such an
        // id stays in `expandedIds` inert until `collapseAllRows()`.
        const expanded = expandable && (isRowExpanded?.(row) ?? false);
        // `aria-controls` is an IDREF *list*, so whitespace in a row id would split
        // it into dead references (and make the `id` itself invalid).
        const domKey = rowKey.replace(/\s+/g, "_");
        const panelId = `${baseId}-panel-${domKey}`;
        const triggerId = `${baseId}-trigger-${domKey}`;
        const dataRow = (
          <Table.Row
            data-slot="data-table-row"
            aria-selected={hasSelection ? selected : undefined}
            // `Table.Row` styles the selected background off `data-[state=selected]`,
            // so set it here too. Without it, only the pinned cells (which carry
            // their own `group-aria-selected:bg-muted`) tint on selection, leaving
            // the scrollable cells un-highlighted. `aria-selected` stays for a11y.
            data-state={hasSelection && selected ? "selected" : undefined}
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
                    <Checkbox
                      checked={selected}
                      onCheckedChange={() => toggleRowSelection(row)}
                      aria-label={t("selectRow")}
                    />
                  </Table.Cell>
                );
              })()}
            {hasExpand &&
              (() => {
                const { style, className } = pinCellProps(
                  expand,
                  { style: { width: EXPAND_WIDTH } },
                  "body",
                );
                return (
                  // `stopPropagation` so using the chevron never fires `onClickRow`
                  // (the selection cell does the same). Non-expandable rows still
                  // render the cell — empty — so the column count stays consistent.
                  <Table.Cell
                    style={style}
                    className={className}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {expandable && toggleRowExpansion && (
                      <RowExpandToggle
                        id={triggerId}
                        expanded={expanded}
                        label={rowExpansion?.getLabel?.(row)}
                        panelId={panelId}
                        onToggle={() => toggleRowExpansion(row)}
                      />
                    )}
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

        // `expanded` is always false without `rowExpansion`, so a table
        // that doesn't use the feature renders exactly the rows it did before.
        return (
          <Fragment key={rowKey}>
            {dataRow}
            {expandable && rowExpansion && (
              // Mounted whenever the row could be open, not only while it is —
              // the component owns the open/closed transition and renders
              // nothing until there is something to show.
              <DataTableExpandedRow
                open={expanded}
                totalColSpan={totalColSpan}
                panelId={panelId}
                triggerId={triggerId}
                label={rowExpansion.getLabel?.(row)}
                render={() => rowExpansion.render(row)}
              />
            )}
          </Fragment>
        );
      })}
    </>
  );
}

// =============================================================================
// RowExpandToggle (internal)
// =============================================================================

interface RowExpandToggleProps {
  id: string;
  expanded: boolean;
  label: string | undefined;
  panelId: string;
  onToggle: () => void;
}

/**
 * The chevron trigger. A native `<button>` (via app-shell's `Button`), so
 * Enter/Space activation and the focus ring come for free — no custom key
 * handling. `aria-expanded` is what announces the state change on activation.
 *
 * @internal
 */
function RowExpandToggle({ id, expanded, label, panelId, onToggle }: RowExpandToggleProps) {
  const t = useDataTableT();
  // A contextual name ("Expand row INV-1001") — "Expand row" repeated down the
  // column conveys nothing. The locale owns word order and the unnamed fallback.
  const name = t(expanded ? "collapseRow" : "expandRow", { label });

  return (
    <Button
      id={id}
      type="button"
      variant="ghost"
      size="icon"
      aria-expanded={expanded}
      // Only while expanded — it must never point at an id absent from the DOM.
      aria-controls={expanded ? panelId : undefined}
      aria-label={name}
      onClick={onToggle}
    >
      <ChevronRight
        className={cn(
          "astw:size-4 astw:transition-transform astw:motion-reduce:transition-none",
          expanded && "astw:rotate-90",
        )}
      />
    </Button>
  );
}

// =============================================================================
// DataTableExpandedRow (internal)
// =============================================================================

interface DataTableExpandedRowProps {
  open: boolean;
  totalColSpan: number;
  panelId: string;
  triggerId: string;
  label: string | undefined;
  render: () => ReactNode;
}

/**
 * The detail row: one full-width `<tr>` with a single `colSpan` cell, rendered
 * immediately after its parent row so forward-tabbing reaches the panel next.
 *
 * Mounted for every expandable row (returning `null` while closed) so the
 * collapse has something to animate. `render` is a thunk, not `children`, so
 * `rowExpansion.render` only runs while the panel is on screen.
 *
 * @internal
 */
function DataTableExpandedRow({
  open,
  totalColSpan,
  panelId,
  triggerId,
  label,
  render,
}: DataTableExpandedRowProps) {
  // `present` is DOM presence, `entered` the visual state. Opening must mount
  // collapsed so the transition has a "from" value; closing must stay mounted
  // until it has played out.
  const [present, setPresent] = useState(open);
  const [entered, setEntered] = useState(false);

  useIsomorphicLayoutEffect(() => {
    if (open) setPresent(true);
  }, [open]);

  // One frame after mounting, so `0fr → 1fr` is a transition, not an initial value.
  useIsomorphicLayoutEffect(() => {
    if (!open || !present) return;
    if (typeof requestAnimationFrame !== "function") {
      // No frame scheduler — reveal immediately rather than stay stuck collapsed.
      setEntered(true);
      return;
    }
    const frame = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(frame);
  }, [open, present]);

  // A timer rather than `transitionend`: under `prefers-reduced-motion` there is
  // no transition, so the event would never fire and the row would never unmount.
  useEffect(() => {
    if (open || !present) return;
    setEntered(false);
    const timer = setTimeout(() => setPresent(false), EXPAND_TRANSITION_MS);
    return () => clearTimeout(timer);
  }, [open, present]);

  if (!present) return null;

  return (
    <ExpandedRowContent
      open={open}
      entered={entered}
      totalColSpan={totalColSpan}
      panelId={panelId}
      triggerId={triggerId}
      label={label}
      render={render}
    />
  );
}

interface ExpandedRowContentProps extends DataTableExpandedRowProps {
  entered: boolean;
}

/**
 * The rendered detail row. Split from the presence owner above so that it truly
 * unmounts when the collapse finishes: the focus handoff runs from a layout
 * effect's cleanup, which only fires before React detaches the nodes when the
 * component itself is removed. Keeping it in the always-mounted parent would run
 * the cleanup after the panel had already left the DOM, by which point
 * `document.activeElement` has fallen back to `<body>` and the handoff is a
 * no-op — the exact bug it exists to prevent.
 *
 * @internal
 */
function ExpandedRowContent({
  open,
  entered,
  totalColSpan,
  panelId,
  triggerId,
  label,
  render,
}: ExpandedRowContentProps) {
  const t = useDataTableT();
  const panelRef = useRef<HTMLElement>(null);

  // Hand focus back when the collapse starts, before the panel goes `inert`
  // below — making an element inert while it holds focus drops focus to <body>.
  useIsomorphicLayoutEffect(() => {
    if (open) return;
    const panel = panelRef.current;
    if (!panel || !panel.contains(document.activeElement)) return;
    document.getElementById(triggerId)?.focus();
  }, [open, triggerId]);

  // Safety net for the row unmounting outright (refetch, filter, pagination).
  // Both targets are resolved at setup, while still in the document; by cleanup
  // the trigger may be gone too, so the scroll container is the fallback.
  useIsomorphicLayoutEffect(() => {
    const panel = panelRef.current;
    const trigger = document.getElementById(triggerId);
    const container = panel?.closest<HTMLElement>("[data-slot='table-container']") ?? null;
    return () => {
      if (!panel || !panel.contains(document.activeElement)) return;
      if (trigger?.isConnected) {
        trigger.focus();
        return;
      }
      if (container?.isConnected) {
        // Borrow `tabindex` only for the focus call: a scrollable div is tabbable
        // by default *unless* the author sets one, and this container is shared
        // by every `Table.Root` consumer.
        const hadTabIndex = container.hasAttribute("tabindex");
        if (!hadTabIndex) container.setAttribute("tabindex", "-1");
        container.focus();
        if (!hadTabIndex) container.removeAttribute("tabindex");
      }
    };
  }, [triggerId]);

  return (
    <Table.Row
      data-slot="data-table-expanded-row"
      data-state={open ? "open" : "closed"}
      className="astw:bg-muted/30 astw:hover:bg-transparent"
    >
      {/* `p-0!` — this cell is both first and last, and `Table.Cell`'s
          `first:pl-6 last:pr-6` outranks a plain `p-0` on specificity, insetting
          the sticky panel by 24px. */}
      <Table.Cell colSpan={totalColSpan} className="astw:p-0!">
        {/* The colSpan cell spans the whole table, so pin the panel to the left
            edge of the scrollport or it sits off-screen once scrolled. The
            `min(100%, …)` makes this a no-op when the table already fits. */}
        <div
          className="astw:sticky astw:left-0"
          style={{ width: "min(100%, var(--data-table-viewport, 100%))" }}
        >
          {/* `0fr → 1fr` resolves to the panel's exact natural height, so consumer
              content of any size is neither clipped nor left with dead time at the
              end. The `<tr>`/`<td>` are left alone — rows size to their content,
              and animating row heights under `border-collapse` is unreliable. */}
          <div
            className="astw:grid astw:transition-[grid-template-rows,opacity] astw:ease-out astw:motion-reduce:transition-none"
            style={{
              gridTemplateRows: entered ? "1fr" : "0fr",
              opacity: entered ? 1 : 0,
              transitionDuration: `${EXPAND_TRANSITION_MS}ms`,
            }}
          >
            {/* `min-h-0` — grid items default to `min-height: auto` and would
                refuse to collapse. `overflow-y-hidden` clips mid-reveal;
                `overflow-x-auto` keeps wide content reachable. */}
            <div className="astw:min-h-0 astw:overflow-x-auto astw:overflow-y-hidden">
              {/* A named `<section>` maps to `role="region"`. `inert` covers the
                  closing window — zero height and opacity still leave descendants
                  focusable and announced. */}
              <section
                ref={panelRef}
                id={panelId}
                inert={open ? undefined : true}
                aria-label={t("expandedDetails", { label })}
                className="astw:px-6 astw:py-3"
              >
                {render()}
              </section>
            </div>
          </div>
        </div>
      </Table.Cell>
    </Table.Row>
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
  const currentPage = ctx?.currentPage;
  const pageSize = ctx?.pageSize;

  // Measure each column's *rendered* width from the (always-present) header row
  // and publish it via PinMeasureContext, so sticky offsets reflect real
  // geometry rather than declared `width`. This keeps the table on its natural
  // `table-auto` sizing — pinning no longer forces `table-fixed` (which would
  // require every column to set an explicit width or collapse). Runs before
  // paint and re-measures on container/column changes.
  useIsomorphicLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    // The observer fires on every frame of a detail row's reveal, which is a pure
    // height change. Without this guard each toggle re-ran the whole scan dozens
    // of times.
    let lastWidth = -1;
    let lastTableWidth = -1;

    const measure = () => {
      // Own table only: `rowExpansion.render` can nest a DataTable, and the built-in
      // column keys are module constants, so an unscoped query would let an inner
      // header overwrite these widths. `querySelector` is pre-order.
      const ownTable = el.querySelector("table");
      const width = el.clientWidth;
      const tableWidth = ownTable?.offsetWidth ?? 0;
      if (width === lastWidth && tableWidth === lastTableWidth) return;
      lastWidth = width;
      lastTableWidth = tableWidth;
      const cells = el.querySelectorAll<HTMLElement>(
        "[data-slot='data-table-header'] [data-col-key]",
      );
      const next: ColumnWidths = {};
      cells.forEach((cell) => {
        if (cell.closest("table") !== ownTable) return;
        const key = cell.dataset.colKey;
        // Fractional width (not the integer-rounded offsetWidth) so accumulated
        // sticky offsets land exactly on each column's real edge — otherwise the
        // rounding drift opens a sub-pixel gap between adjacent pinned columns
        // where scrolling rows bleed through.
        if (key) next[key] = cell.getBoundingClientRect().width;
      });
      setWidths((prev) => (sameWidths(prev, next) ? prev : next));
      // Publish the scrollport width for an expanded row's sticky panel to cap
      // itself to. Skipping zero keeps a hidden-tab mount from collapsing every
      // panel via `min(100%, 0px)`; writing only on change keeps this mutation
      // from feeding back into the ResizeObserver.
      if (width > 0) {
        const value = `${width}px`;
        if (el.style.getPropertyValue("--data-table-viewport") !== value) {
          el.style.setProperty("--data-table-viewport", value);
        }
      }
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

  // Pagination swaps the visible row window; keep the internal scrollport at
  // the first row of the new page instead of preserving a stale vertical offset.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.scrollTop = 0;
  }, [currentPage, pageSize]);

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
   * Container for toolbar content (filters, search, etc.). Place inside
   * `DataTable.Root`, before `DataTable.Table`. Pass `columnSettings` to render
   * the built-in "Columns" control (show/hide, reorder, pin) at the top-right.
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
