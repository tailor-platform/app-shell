import { useContext, type ComponentProps, type ReactNode } from "react";
import { Ellipsis } from "lucide-react";
import { cn } from "@/lib/utils";
import { CollectionControlProvider } from "@/contexts/collection-control-context";
import { Table } from "@/components/table";
import { Button } from "@/components/button";
import { Menu } from "@/components/menu";
import type { RowAction, SortConfig, UseDataTableReturn } from "./types";
import { DataTableContext, type DataTableContextValue } from "./data-table-context";
import { useDataTableT } from "./i18n";

// =============================================================================
// DataTable.Root
// =============================================================================

function DataTableRoot({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <Table.Root
      data-slot="data-table"
      className={cn("astw:border astw:rounded-md astw:bg-card", className)}
    >
      {children}
    </Table.Root>
  );
}
DataTableRoot.displayName = "DataTable.Root";

// =============================================================================
// DataTable.Provider
// =============================================================================

function DataTableProviderComponent<TRow extends Record<string, unknown>>({
  value,
  children,
}: {
  value: UseDataTableReturn<TRow>;
  children: ReactNode;
}) {
  const dataTableValue: DataTableContextValue<TRow> = {
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
    onClickRow: value.onClickRow,
    rowActions: value.rowActions,
  };

  const controlValue = value.control ?? null;

  const inner = (
    <DataTableContext.Provider value={dataTableValue}>{children}</DataTableContext.Provider>
  );

  if (controlValue) {
    return <CollectionControlProvider value={controlValue}>{inner}</CollectionControlProvider>;
  }

  return inner;
}
DataTableProviderComponent.displayName = "DataTable.Provider";

// =============================================================================
// DataTable.Headers
// =============================================================================

function DataTableHeaders({ className }: { className?: string }) {
  const ctx = useContext(DataTableContext);
  if (!ctx) {
    throw new Error("<DataTable.Headers> must be used within <DataTable.Provider>");
  }
  const { columns, sortStates, onSort, rowActions } = ctx;
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

function DataTableBody({ children, className }: { children?: ReactNode; className?: string }) {
  const ctx = useContext(DataTableContext);
  if (!ctx) {
    throw new Error("<DataTable.Body> must be used within <DataTable.Provider>");
  }
  const { columns, rows, loading, error, onClickRow, rowActions } = ctx;
  const t = useDataTableT();
  const hasRowActions = rowActions && rowActions.length > 0;
  const totalColSpan = (columns?.length ?? 1) + (hasRowActions ? 1 : 0);

  if (children) {
    return (
      <Table.Body data-slot="data-table-body" className={className}>
        {children}
      </Table.Body>
    );
  }

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
      {rows?.map((row, rowIndex) => (
        <Table.Row
          key={rowIndex}
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
      ))}
    </Table.Body>
  );
}
DataTableBody.displayName = "DataTable.Body";

// =============================================================================
// DataTable.Row
// =============================================================================

function DataTableRow(props: ComponentProps<"tr">) {
  return <Table.Row data-slot="data-table-row" {...props} />;
}
DataTableRow.displayName = "DataTable.Row";

// =============================================================================
// DataTable.Cell
// =============================================================================

function DataTableCell(props: ComponentProps<"td">) {
  return <Table.Cell data-slot="data-table-cell" {...props} />;
}
DataTableCell.displayName = "DataTable.Cell";

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
// DataTable namespace
// =============================================================================

export const DataTable = {
  Provider: DataTableProviderComponent,
  Root: DataTableRoot,
  Headers: DataTableHeaders,
  Body: DataTableBody,
  Row: DataTableRow,
  Cell: DataTableCell,
} as const;
