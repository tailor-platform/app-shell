import { DataTableRoot } from "./root";
import { DataTableToolbar } from "./toolbar";
import { DataTableFilters } from "./filters/filters";
import { DataTableColumnSettings } from "./column-settings";
import { DataTableTable } from "./table";
import { DataTableFooter } from "./footer";
import { DataTablePagination } from "./pagination";

export type { DataTableRootProps } from "./root";
export type { DataTablePaginationProps } from "./pagination";

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
  /** Built-in column visibility, ordering, and pinning controls. */
  ColumnSettings: DataTableColumnSettings,
  /**
   * Renders `<table>` with built-in headers, body, and a sticky footer row
   * when a visible column defines `footer`.
   * Place inside `DataTable.Root`.
   */
  Table: DataTableTable,
  /**
   * Footer container for pagination and other footer content.
   * Place inside `DataTable.Root`, after `DataTable.Table`.
   *
   * When `useDataTable()` is given `rowSelection.actions`, the footer becomes the
   * bulk-action bar while rows are selected — the selection count, the
   * actions, and a Clear button — with its own children (usually
   * `DataTable.Pagination`) kept alongside.
   */
  Footer: DataTableFooter,
  /**
   * Pre-built pagination controls. Place inside `DataTable.Footer`.
   *
   * **Requires `control`** — `useDataTable()` must receive `control` from
   * `useCollectionVariables()`, otherwise this component throws at render time.
   *
   * **Go-to-first / go-to-last buttons** — The first-page button is always
   * rendered. The last-page button and page counter are rendered only when
   * `totalPages` is non-null (i.e. the backend returns a `total` count).
   */
  Pagination: DataTablePagination,
} as const;
