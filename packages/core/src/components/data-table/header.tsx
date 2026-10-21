import { useContext, useMemo, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Table } from "@/components/table";
import { Checkbox } from "@/components/checkbox";
import type { HeaderRenderContext } from "./types";
import { DataTableContext, PinMeasureContext } from "./context";
import { DataTableHeaderContextMenu } from "./context-menu";
import { useDataTableT } from "./i18n";
import {
  SELECTION_WIDTH,
  SELECTION_KEY,
  EXPAND_WIDTH,
  EXPAND_KEY,
  ACTIONS_WIDTH,
  ACTIONS_KEY,
  buildColumnKeys,
  computePinLayout,
  pinCellProps,
  resolveAlign,
} from "./column-layout";

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
    setPin,
    toggleRowSelection,
    selectAllRows,
    deselectAllRows,
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
                      // Page-scoped, so rows selected on other pages survive.
                      // Hand-built contexts that predate it fall back to clearing.
                      (deselectAllRows ?? clearSelection)?.();
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

          const customHeaderProps = col.headerProps?.(headerContext);
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
              style: {
                ...customHeaderProps?.style,
                ...(col.width ? { width: col.width } : {}),
              },
              className: cn(align === "right" && "astw:text-right"),
            },
            "header",
          );
          return (
            <Table.Head
              key={key}
              data-col-key={key}
              title={customHeaderProps?.title}
              style={style}
              className={cn(className, customHeaderProps?.className)}
            >
              <DataTableHeaderContextMenu
                align={align}
                column={col}
                columnKey={key}
                pinnedColumns={pinnedColumns}
                setPin={setPin}
                sortDirection={currentSort?.direction}
                onSortDirectionChange={
                  isSortable ? (direction) => onSort(sortField, direction) : undefined
                }
              >
                {content}
              </DataTableHeaderContextMenu>
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
      className="astw:text-muted-foreground astw:text-label-sm"
      aria-hidden
    >
      {direction === "Asc" ? "▲" : "▼"}
    </span>
  );
}

export { DataTableHeaders };
