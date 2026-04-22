import { useContext, type ReactNode } from "react";
import { Ellipsis } from "lucide-react";
import { cn } from "@/lib/utils";
import { CollectionControlProvider } from "@/contexts/collection-control-context";
import { Table } from "@/components/table";
import { Button } from "@/components/button";
import { Menu } from "@/components/menu";
import type { SortConfig } from "@/types/collection";
import type { RowAction, UseDataTableReturn } from "./types";
import { DataTableContext, type DataTableContextValue } from "./data-table-context";
import { useDataTableT } from "./i18n";
import { DataTableToolbar, DataTableFilters } from "./toolbar";
import { DataTablePagination } from "./pagination";
export type { DataTablePaginationProps } from "./pagination";

// =============================================================================
// DataTable.Root
// =============================================================================

export interface DataTableRootProps<TRow extends Record<string, unknown>> {
  value: UseDataTableReturn<TRow>;
  children: ReactNode;
  className?: string;
}

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
    pageInfo: value.pageInfo,
    total: value.total,
    totalPages: value.totalPages,
    nextPage: value.nextPage,
    prevPage: value.prevPage,
    hasPrevPage: value.hasPrevPage,
    hasNextPage: value.hasNextPage,
    onClickRow: value.onClickRow,
    rowActions: value.rowActions,
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
        const rowId = (row as Record<string, unknown>)["id"];
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
