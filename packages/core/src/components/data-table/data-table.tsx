import { useContext, type ReactNode } from "react";
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
// DataTableLoaderRows (internal)
// =============================================================================

interface DataTableLoaderRowsProps<TRow extends Record<string, unknown>> {
  rowCount: number;
  columns: Column<TRow>[] | undefined;
  hasSelection: boolean;
  hasRowActions: boolean;
}

// Skeleton cell widths (%) — varied per row+col to look natural
const SKELETON_WIDTHS = [75, 55, 85, 65, 70];

/** @internal */
function DataTableLoaderRows<TRow extends Record<string, unknown>>({
  rowCount,
  columns,
  hasSelection,
  hasRowActions,
}: DataTableLoaderRowsProps<TRow>) {
  // No fixed row height: each cell's placeholder matches the height of the
  // real content it stands in for (text line, badge, icon button), so the
  // skeleton rows resolve to exactly the same row height as loaded rows and
  // the table doesn't shift when data arrives.
  return (
    <>
      {Array.from({ length: rowCount }).map((_, rowIndex) => (
        <Table.Row key={rowIndex} data-datatable-state="loading">
          {hasSelection && (
            <Table.Cell style={{ width: 52 }} className="astw:pl-3!">
              <div className="astw:size-4 astw:rounded-xs astw:bg-muted astw:animate-pulse" />
            </Table.Cell>
          )}
          {columns?.map((col, colIndex) => {
            const key = col.id ?? col.label ?? String(colIndex);
            const skeletonWidth = SKELETON_WIDTHS[(rowIndex + colIndex) % SKELETON_WIDTHS.length];
            const isBadge = col.type === "badge";
            return (
              <Table.Cell key={key} style={col.width ? { width: col.width } : undefined}>
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
          {hasRowActions && (
            <Table.Cell style={{ width: 50 }}>
              {/* size-9 box = the real icon Button's footprint; the visible
                  pulse stays 24px to read as an ellipsis placeholder */}
              <div className="astw:mx-auto astw:flex astw:size-9 astw:items-center astw:justify-center">
                <div className="astw:size-6 astw:rounded astw:bg-muted astw:animate-pulse" />
              </div>
            </Table.Cell>
          )}
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
function DataTableHeaders({ className }: { className?: string }) {
  const ctx = useContext(DataTableContext);
  if (!ctx) {
    throw new Error("<DataTable.Headers> must be used within <DataTable.Root>");
  }
  const {
    visibleColumns: columns,
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
  const hasSelection = !!toggleRowSelection;

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
        className,
      )}
    >
      <Table.Row>
        {hasSelection && (
          <Table.Head style={{ width: 52 }} className="astw:pl-3!">
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
        )}
        {columns?.map((col, colIndex) => {
          const key = col.id ?? col.label ?? String(colIndex);
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
          return (
            <Table.Head
              key={key}
              style={col.width ? { width: col.width } : undefined}
              className={cn(
                isSortable && "astw:cursor-pointer astw:select-none",
                align === "right" && "astw:text-right",
              )}
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
    visibleColumns: columns,
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
  const hasRowActions = !!(rowActions && rowActions.length > 0);
  const hasSelection = !!toggleRowSelection;
  const totalColSpan = (columns?.length ?? 1) + (hasRowActions ? 1 : 0) + (hasSelection ? 1 : 0);
  const rowCount = pageSize > 0 ? pageSize : DEFAULT_ROWS;
  const tableBodyProps = {
    "data-slot": "data-table-body",
    className,
  };

  if (loading) {
    return (
      <Table.Body {...tableBodyProps}>
        <DataTableLoaderRows
          rowCount={rowCount}
          columns={columns}
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
      {rows.map((row, rowIndex) => {
        const rowId = (row as Record<string, unknown>)["id"];
        const selected = isRowSelected?.(row) ?? false;
        return (
          <Table.Row
            key={rowId != null ? String(rowId) : rowIndex}
            data-slot="data-table-row"
            aria-selected={hasSelection ? selected : undefined}
            className={cn(onClickRow && "astw:cursor-pointer")}
            onClick={onClickRow ? () => onClickRow(row) : undefined}
          >
            {hasSelection && (
              <Table.Cell
                style={{ width: 52 }}
                className="astw:pl-3!"
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
            )}
            {columns?.map((col, colIndex) => {
              const key = col.id ?? col.label ?? String(colIndex);
              const content = col.render ? col.render(row) : renderTypedCell(row, col);
              const cellClassName = cn(
                resolveAlign(col) === "right" && "astw:text-right",
                col.truncate && "astw:truncate astw:max-w-0",
              );
              const cellStyle = col.width ? { width: col.width } : undefined;

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
                      {content}
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
                  {content}
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

/** Use `DataTable.Table` instead of calling this directly. */
function DataTableTable({ className }: { className?: string }) {
  return (
    // min-h-0 lets the scroll container shrink within DataTable.Root's flex
    // column; combined with the container's overflow-auto this is the region
    // that scrolls vertically when height is constrained. The sticky header
    // (DataTableHeaders) stays pinned to the top of this scrollport.
    <Table.Root
      data-slot="data-table-table"
      containerClassName="astw:min-h-0 astw:overflow-auto"
      className={className}
    >
      <DataTableHeaders />
      <DataTableBody />
    </Table.Root>
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
   * Container for toolbar content (column visibility, search, etc.).
   * Place inside `DataTable.Root`, before `DataTable.Table`.
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
