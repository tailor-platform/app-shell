import { useContext, type ReactNode } from "react";
import { Ellipsis, ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { CollectionControlProvider } from "@/contexts/collection-control-context";
import { useCollectionControlOptional } from "@/contexts/collection-control-context";
import { Table } from "@/components/table";
import { Button } from "@/components/button";
import { Menu } from "@/components/menu";
import { Select } from "@/components/select-standalone";
import type { SortConfig } from "@/types/collection";
import type { RowAction, UseDataTableReturn } from "./types";
import {
  DataTableContext,
  useDataTableContext,
  type DataTableContextValue,
} from "./data-table-context";
import { useDataTableT } from "./i18n";
import { DataTableToolbar, DataTableFilters } from "./toolbar";

// =============================================================================
// DataTable.Root
// =============================================================================

function DataTableRoot<TRow extends Record<string, unknown>, TRowId = string>({
  value,
  children,
  className,
}: {
  value: UseDataTableReturn<TRow, TRowId>;
  children: ReactNode;
  className?: string;
}) {
  const dataTableValue: DataTableContextValue<TRow, TRowId> = {
    columns: value.columns,
    rows: value.rows,
    loading: value.loading,
    error: value.error,
    sortStates: value.sortStates ?? [],
    onSort: value.onSort,
    updateRow: value.updateRow,
    deleteRow: value.deleteRow,
    insertRow: value.insertRow,
    visibleColumns: value.visibleColumns,
    isColumnVisible: value.isColumnVisible,
    toggleColumn: value.toggleColumn,
    showAllColumns: value.showAllColumns,
    hideAllColumns: value.hideAllColumns,
    pageInfo: value.pageInfo,
    total: value.total,
    totalPages: value.totalPages,
    nextPage: value.nextPage,
    prevPage: value.prevPage,
    hasPrevPage: value.hasPrevPage,
    hasNextPage: value.hasNextPage,
    onClickRow: value.onClickRow,
    rowActions: value.rowActions,
    rowKey: value.rowKey,
  };

  const controlValue = value.control ?? null;

  const inner = (
    <DataTableContext.Provider value={dataTableValue}>
      <div
        data-slot="data-table"
        className={cn("astw:border astw:rounded-md astw:bg-card", className)}
      >
        {children}
      </div>
    </DataTableContext.Provider>
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

function DataTableHeaders({ className }: { className?: string }) {
  const ctx = useContext(DataTableContext);
  if (!ctx) {
    throw new Error("<DataTable.Headers> must be used within <DataTable.Root>");
  }
  const { visibleColumns: columns, sortStates, onSort, rowActions } = ctx;
  const t = useDataTableT();

  return (
    <Table.Header data-slot="data-table-header" className={className}>
      <Table.Row>
        {columns?.map((col, colIndex) => {
          const key = col.id ?? col.label ?? String(colIndex);
          const label = col.label;

          const isSortable = !!col.sort;
          const currentSort = col.sort
            ? sortStates?.find((s) => s.field === (col.sort as SortConfig).field)
            : undefined;

          const handleClick = () => {
            if (!isSortable || !onSort || !col.sort) return;
            const nextDirection =
              currentSort?.direction === "Asc"
                ? "Desc"
                : currentSort?.direction === "Desc"
                  ? undefined
                  : "Asc";
            onSort(col.sort.field, nextDirection);
          };

          return (
            <Table.Head
              key={key}
              style={col.width ? { width: col.width } : undefined}
              className={cn(isSortable && "astw:cursor-pointer astw:select-none")}
              onClick={isSortable ? handleClick : undefined}
            >
              <span className="astw:inline-flex astw:items-center astw:gap-1">
                {label}
                {currentSort && <SortIndicator direction={currentSort.direction} />}
              </span>
            </Table.Head>
          );
        })}
        {rowActions && rowActions.length > 0 && (
          <Table.Head style={{ width: 50 }}>
            <span className="astw:sr-only">{t("actionsHeader")}</span>
          </Table.Head>
        )}
      </Table.Row>
    </Table.Header>
  );
}
DataTableHeaders.displayName = "DataTable.Headers";

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

function DataTableBody({ className }: { className?: string }) {
  const ctx = useContext(DataTableContext);
  if (!ctx) {
    throw new Error("<DataTable.Body> must be used within <DataTable.Root>");
  }
  const { visibleColumns: columns, rows, loading, error, onClickRow, rowActions } = ctx;
  const t = useDataTableT();
  const hasRowActions = rowActions && rowActions.length > 0;
  const totalColSpan = (columns?.length ?? 1) + (hasRowActions ? 1 : 0);

  return (
    <Table.Body data-slot="data-table-body" className={className}>
      {loading && (!rows || rows.length === 0) && (
        <Table.Row>
          <Table.Cell colSpan={totalColSpan} className="astw:h-24 astw:text-center">
            <span className="astw:text-muted-foreground" data-datatable-state="loading">
              {t("loading")}
            </span>
          </Table.Cell>
        </Table.Row>
      )}
      {error && (
        <Table.Row>
          <Table.Cell colSpan={totalColSpan} className="astw:h-24 astw:text-center">
            <span className="astw:text-destructive" data-datatable-state="error">
              {t("errorPrefix")} {error.message}
            </span>
          </Table.Cell>
        </Table.Row>
      )}
      {!loading && !error && (!rows || rows.length === 0) && (
        <Table.Row>
          <Table.Cell colSpan={totalColSpan} className="astw:h-24 astw:text-center">
            <span className="astw:text-muted-foreground" data-datatable-state="empty">
              {t("noData")}
            </span>
          </Table.Cell>
        </Table.Row>
      )}
      {rows?.map((row, rowIndex) => {
        const rowId = (row as Record<string, unknown>)[ctx.rowKey];
        return (
          <Table.Row
            key={rowId != null ? String(rowId) : rowIndex}
            data-slot="data-table-row"
            className={cn(onClickRow && "astw:cursor-pointer")}
            onClick={onClickRow ? () => onClickRow(row) : undefined}
          >
            {columns?.map((col, colIndex) => {
              const key = col.id ?? col.label ?? String(colIndex);
              return (
                <Table.Cell
                  key={key}
                  data-slot="data-table-cell"
                  style={col.width ? { width: col.width } : undefined}
                >
                  {col.render(row)}
                </Table.Cell>
              );
            })}
            {hasRowActions && (
              <Table.Cell style={{ width: 50 }} onClick={(e) => e.stopPropagation()}>
                <RowActionsMenu actions={rowActions} row={row} />
              </Table.Cell>
            )}
          </Table.Row>
        );
      })}
    </Table.Body>
  );
}
DataTableBody.displayName = "DataTable.Body";

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
// =============================================================================
// DataTable.Table
// =============================================================================

/**
 * Table component that renders `<table>` with built-in Headers and Body.
 * Place inside `DataTable.Root`.
 */
function DataTableTable({ className }: { className?: string }) {
  return (
    <Table.Root data-slot="data-table-table" className={className}>
      <DataTableHeaders />
      <DataTableBody />
    </Table.Root>
  );
}
DataTableTable.displayName = "DataTable.Table";

// =============================================================================
// DataTable.Footer
// =============================================================================

/**
 * Footer container for pagination and other footer content.
 * Place inside `DataTable.Root`, after `DataTable.Table`.
 */
function DataTableFooter({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      data-slot="data-table-footer"
      className={cn("astw:flex astw:items-center astw:border-t astw:px-4 astw:py-2", className)}
    >
      {children}
    </div>
  );
}
DataTableFooter.displayName = "DataTable.Footer";

// =============================================================================
// DataTable.Pagination
// =============================================================================

export interface DataTablePaginationProps {
  /**
   * Available page-size options shown in a dropdown selector.
   * When provided, a page-size switcher is rendered.
   */
  pageSizeOptions?: number[];
}

/**
 * Pre-built pagination controls. Place inside `DataTable.Footer`.
 *
 * **Requires `control`** — `useDataTable()` must receive `control` from
 * `useCollectionVariables()`, otherwise this component throws at render time.
 */
function DataTablePagination({ pageSizeOptions }: DataTablePaginationProps = {}) {
  const { pageInfo, totalPages, nextPage, prevPage, hasPrevPage, hasNextPage } =
    useDataTableContext();
  const control = useCollectionControlOptional();
  // Intentional throw: <DataTable.Pagination> cannot function without collection
  // control (needs pageSize, currentPage, goToFirstPage, etc.). Rendering a
  // disabled/empty fallback would silently hide a misconfiguration, so we fail
  // loudly instead. Consumers must pass `control` from useCollectionVariables()
  // to useDataTable() when using this component.
  if (!control) {
    throw new Error(
      "<DataTable.Pagination> requires collection control. Pass `control` from `useCollectionVariables()` to `useDataTable()`.",
    );
  }
  const { currentPage, goToFirstPage, goToLastPage, pageSize, setPageSize } = control;
  const t = useDataTableT();

  return (
    <div className="astw:flex astw:items-center astw:justify-end astw:gap-2 astw:ml-auto">
      {pageSizeOptions && pageSizeOptions.length > 0 && (
        <div className="astw:flex astw:items-center astw:gap-1.5">
          <span className="astw:text-sm astw:text-muted-foreground astw:whitespace-nowrap">
            {t("paginationRowsPerPage")}
          </span>
          <Select
            items={pageSizeOptions.map(String)}
            value={String(pageSize)}
            onValueChange={(item) => {
              if (item) setPageSize(Number(item));
            }}
            className="astw:w-[70px]"
          />
        </div>
      )}
      {totalPages !== null && (
        <span className="astw:text-sm astw:text-muted-foreground astw:tabular-nums">
          {t("paginationPage")} {currentPage} / {totalPages}
        </span>
      )}
      <Button
        variant="outline"
        size="icon"
        onClick={goToFirstPage}
        disabled={!hasPrevPage}
        aria-label={t("paginationFirst")}
      >
        <ChevronsLeft className="astw:size-4" />
      </Button>
      <Button
        variant="outline"
        size="icon"
        onClick={() => {
          if (pageInfo.previousPageToken) {
            prevPage(pageInfo.previousPageToken);
          }
        }}
        disabled={!hasPrevPage}
        aria-label={t("paginationPrevious")}
      >
        <ChevronLeft className="astw:size-4" />
      </Button>
      <Button
        variant="outline"
        size="icon"
        onClick={() => {
          if (pageInfo.nextPageToken) {
            nextPage(pageInfo.nextPageToken);
          }
        }}
        disabled={!hasNextPage}
        aria-label={t("paginationNext")}
      >
        <ChevronRight className="astw:size-4" />
      </Button>
      <Button
        variant="outline"
        size="icon"
        onClick={goToLastPage}
        disabled={!hasNextPage}
        aria-label={t("paginationLast")}
      >
        <ChevronsRight className="astw:size-4" />
      </Button>
    </div>
  );
}
DataTablePagination.displayName = "DataTable.Pagination";

// =============================================================================
// DataTable namespace
// =============================================================================

export const DataTable = {
  Root: DataTableRoot,
  Toolbar: DataTableToolbar,
  Filters: DataTableFilters,
  Table: DataTableTable,
  Footer: DataTableFooter,
  Pagination: DataTablePagination,
} as const;
