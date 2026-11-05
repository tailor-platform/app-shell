import { createContext, useContext } from "react";
import type {
  Column,
  DataTableTreeRow,
  RowAction,
  RowExpansionOptions,
  RowSelectionOptions,
  SubRowsOptions,
} from "./types";
import type { PageInfo, SortState } from "@/types/collection";
import type { ColumnWidths } from "./column-layout";

/**
 * Context value provided by `DataTable.Root`.
 *
 * `control` is intentionally excluded from this context: collection control
 * (filters, sort, and pagination) is managed by `CollectionControlProvider`
 * via a separate context. Keeping them separate means `DataTable.Root` works
 * without any collection control (read-only / static tables), while
 * `CollectionControlProvider` can optionally wrap it when filtering and
 * pagination are needed. This also avoids coupling `DataTableContextValue`
 * to `UseDataTableReturn` — changes to `UseDataTableReturn` require an
 * explicit decision about whether they should appear in the context.
 */
export interface DataTableContextValue<TRow extends Record<string, unknown>> {
  // Data
  rows: TRow[];
  loading: boolean;
  error: Error | null;
  sortStates: SortState[];
  onSort?: (field: string, direction?: "Asc" | "Desc") => void;

  // Pagination (derived from data)
  pageInfo: PageInfo;
  total: number | null;
  totalPages: number | null;
  /** 1-based page counter, automatically kept in sync by navigation actions. */
  currentPage: number;
  goToNextPage: (pageInfo: Pick<PageInfo, "endCursor">) => void;
  goToPrevPage: (pageInfo: Pick<PageInfo, "startCursor">) => void;
  /** Jump to the first page. */
  goToFirstPage: () => void;
  /** Jump to the last page. Only functional when `totalPages` is known. */
  goToLastPage: () => void;
  hasPrevPage: boolean;
  hasNextPage: boolean;
  /**
   * The resolved page size from the collection control. `0` when no control is
   * configured. Used to render the correct number of skeleton / ghost rows.
   */
  pageSize: number;
  /** Change the page size and reset to the first page. */
  setPageSize: (size: number) => void;

  // Column management
  columns: Column<TRow>[];
  visibleColumns: Column<TRow>[];
  toggleColumn: (fieldOrId: string) => void;
  showAllColumns: () => void;
  hideAllColumns: () => void;
  isColumnVisible: (fieldOrId: string) => boolean;
  columnOrder: string[];
  moveColumn: (key: string, toIndex: number) => void;
  setColumnOrder: (keys: string[]) => void;
  pinnedColumns: Record<string, "left" | "right" | "none">;
  setPin: (key: string, side: "left" | "right" | "none" | null) => void;

  // Row interaction
  onClickRow?: (row: TRow) => void;
  rowActions?: RowAction<TRow>[];

  // Row selection
  // toggleRowSelection / selectAllRows / deselectAllRows / clearSelection are undefined
  // when selection is not enabled (no rowSelection or onSelectionChange).
  // New members are optional for the hand-constructible reason noted under Row expansion.
  /** Selection config, including bulk actions shown by `DataTable.Footer`. */
  rowSelection?: RowSelectionOptions;
  selectedIds: string[];
  isRowSelected: (row: TRow) => boolean;
  toggleRowSelection?: (row: TRow) => void;
  /**
   * Adds every row on the **current page** to the selection; rows selected on
   * other pages are kept.
   */
  selectAllRows?: () => void;
  /**
   * Removes the **current page's** rows from the selection; rows selected on
   * other pages stay selected.
   */
  deselectAllRows?: () => void;
  /** Empties the selection across all pages. */
  clearSelection?: () => void;
  /** Id of the selection action whose request is in flight, or `null`. */
  pendingActionId?: string | null;
  /** See `UseDataTableReturn.runSelectionAction`. */
  runSelectionAction?: (action: { id: string }, request: PromiseLike<unknown>) => void;
  isAllSelected: boolean;
  isIndeterminate: boolean;

  // Row expansion
  // toggleRowExpansion / collapseAllRows are undefined when renderExpandedRow is not provided.
  // Every member here is optional: this interface is documented as hand-constructible
  // (custom providers, test doubles, adapters over another data source), so adding a
  // required member would break those callers' `tsc` on a minor release.
  /** Ids of the currently expanded rows. */
  expandedIds?: string[];
  /** Whether `row` is currently expanded. Always `false` for rows without an `id`. */
  isRowExpanded?: (row: TRow) => boolean;
  toggleRowExpansion?: (row: TRow) => void;
  collapseAllRows?: () => void;
  /** Expansion config. Its presence enables the expand column and detail rows. */
  rowExpansion?: RowExpansionOptions<TRow>;

  // Sub-rows (optional for the same hand-constructible reason; see UseDataTableReturn)
  /** Sub-rows config. Its presence turns the table into a tree. */
  subRows?: SubRowsOptions<TRow>;
  /** The rows to render with sub-rows: each page row followed by its open sub-rows. */
  visibleRows?: DataTableTreeRow<TRow>[];
  /** Key of the hierarchy column: locked first, pinned left, always shown. */
  treeColumnKey?: string;
  /** Ids of the rows whose sub-rows are open. */
  expandedSubRowIds?: string[];
  /** Opens or closes `row`'s sub-rows. */
  toggleSubRows?: (row: TRow) => void;
  /** A row's checkbox, derived as `rowSelection.selectionPropagation` says. */
  getRowCheckState?: (row: TRow) => { checked: boolean; indeterminate: boolean };
}

/**
 * Whether the table draws a hierarchy column. A hand-built context needs the
 * rows to draw and the column that holds them, not just `subRows`.
 */
export function hasTreeColumn(
  ctx: Pick<
    DataTableContextValue<Record<string, unknown>>,
    "subRows" | "visibleRows" | "treeColumnKey"
  >,
): boolean {
  return !!ctx.subRows && !!ctx.visibleRows && ctx.treeColumnKey !== undefined;
}

/**
 * Where a tree's selection checkboxes go. When selection propagates ("full" or
 * "down"), they sit in the hierarchy column, indented with the row, so a parent
 * and the rows it ticks line up. With "none", or without sub-rows, every row is
 * independent and they stay in the left-hand selection column.
 */
export function selectionInTreeColumn(
  ctx: Pick<
    DataTableContextValue<Record<string, unknown>>,
    "subRows" | "visibleRows" | "treeColumnKey" | "toggleRowSelection" | "rowSelection"
  >,
): boolean {
  return (
    hasTreeColumn(ctx) &&
    !!ctx.toggleRowSelection &&
    (ctx.rowSelection?.selectionPropagation ?? "full") !== "none"
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const DataTableContext = createContext<DataTableContextValue<any> | null>(null);

export { DataTableContext };

/**
 * Rendered column widths (px) keyed by column key, published by `DataTable.Table`
 * after it measures the header row. Empty until the first measurement; consumers
 * fall back to each column's declared `width` (or 0) meanwhile.
 */
export const PinMeasureContext = createContext<ColumnWidths>({});

/**
 * Hook to access the full DataTable state (rows, columns, sorting, pagination,
 * column visibility, and row operations) from the nearest `DataTable.Root`.
 *
 * This hook is intentionally part of the public API to support **custom
 * sub-components** rendered inside `DataTable.Root`. Use it when the built-in
 * `DataTable.*` sub-components (Table, Toolbar, Pagination, etc.) are not
 * sufficient and you need to build your own compound component that reads from
 * or writes to the same DataTable context — for example, a column-visibility
 * toggle panel or a custom row-action toolbar.
 *
 * For most use cases, prefer passing values from `useDataTable()` as props
 * rather than reaching into the context directly.
 *
 * @throws Error if used outside of `DataTable.Root`.
 */
export function useDataTableContext<
  TRow extends Record<string, unknown>,
>(): DataTableContextValue<TRow> {
  const ctx = useContext(DataTableContext);
  if (!ctx) {
    throw new Error("useDataTableContext must be used within <DataTable.Root>");
  }
  return ctx as DataTableContextValue<TRow>;
}
