import { Fragment, useId, useMemo, useRef, type CSSProperties, type ReactNode } from "react";
import { Ellipsis } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTimeZone } from "@/contexts/appshell-context";
import { Table } from "@/components/table";
import { Button } from "@/components/button";
import { Checkbox } from "@/components/checkbox";
import { Menu } from "@/components/menu";
import { Tooltip } from "@/components/tooltip";
import type { RowAction, RowExpansionOptions } from "./types";
import { getCellValue, createTypedCellRenderer } from "./cell-renderers";
import { DataTableCellContextMenu, getCellContextValue } from "./context-menu";
import { useCellContextMenu } from "./use-cell-context-menu";
import { DataTableEditableCell, hasEditorIcon, isEditableColumn } from "./editing/cell";
import { ICON_SPACE_CLASS_NAME } from "./editing/shared";
import { useCellEditNavigation } from "./editing/use-navigation";
import { RowExpandToggle, DataTableExpandedRow } from "./expanded-row";
import { useDataTableT } from "./i18n";
import {
  SELECTION_WIDTH,
  EXPAND_WIDTH,
  ACTIONS_WIDTH,
  pinCellProps,
  resolveAlign,
  type PinLayout,
} from "./column-layout";

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
  const { value: timeZone } = useTimeZone();
  const hasExpand = !!rowExpansion;
  const { ordered, keys, placements, selection, expand, actions } = pinLayout;
  // Intl formatter construction is costly; avoid repeating it for every cell render.
  const cellRenderers = useMemo(
    () =>
      new Map(
        ordered
          .filter((col) => !col.render)
          .map((col) => [col, createTypedCellRenderer(col, timeZone)]),
      ),
    [ordered, timeZone],
  );
  const {
    contextMenu: cellContextMenu,
    contextMenuOpen: cellContextMenuOpen,
    handleContextMenuOpenChange: handleCellContextMenuOpenChange,
    handleContextMenuCloseComplete: handleCellContextMenuCloseComplete,
    getCellContextMenuHandlers,
  } = useCellContextMenu();
  const navigation = useCellEditNavigation();
  // Namespaced so an id-less row's index fallback can't collide with a real
  // id of the same digits — React reconciles duplicate keys by position,
  // pairing a detail panel with the wrong row.
  const rowKeys = rows.map((row, rowIndex) => {
    const rowId = (row as Record<string, unknown>)["id"];
    return rowId != null ? `id:${String(rowId)}` : `idx:${rowIndex}`;
  });
  // Tab / Shift+Tab move between editable cells in the order they render.
  navigation.setOrder(rowKeys, ordered?.map((col) => keys.get(col) as string) ?? []);
  // In a table people edit, every data cell says what a click does: editors
  // show a text or pointer cursor, and the rest show "not allowed". Skipped when
  // rows are clickable, where the row click is what the cursor should promise.
  const blockReadOnlyCells = !onClickRow && (ordered?.some(isEditableColumn) ?? false);
  const warnedMissingIdRef = useRef(false);

  return (
    <>
      {rows.map((row, rowIndex) => {
        const rowId = (row as Record<string, unknown>)["id"];
        const selected = isRowSelected?.(row) ?? false;
        const rowKey = rowKeys[rowIndex];
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
              const editableColumn = isEditableColumn(col);
              if (editableColumn && rowId == null && !warnedMissingIdRef.current) {
                warnedMissingIdRef.current = true;
                console.warn(
                  `[DataTable] Column "${key}" has an \`edit\` config, but a row has no \`id\`. Rows without an \`id\` are shown read-only.`,
                );
              }
              const editable =
                editableColumn &&
                rowId != null &&
                // A badge dropdown picks one value; a cell holding several stays
                // read-only rather than have its list replaced by a single pick.
                !(col.type === "badge" && Array.isArray(getCellValue(row, col))) &&
                (col.edit?.canEdit?.(row, { selected }) ?? true);
              // An editable cell renders its own display; skip rendering it twice.
              let content: ReactNode;
              if (!editable) content = col.render ? col.render(row) : cellRenderers.get(col)?.(row);

              const customCellProps = col.cellProps?.(row);
              const { style: cellStyle, className: cellClassName } = pinCellProps(
                placements.get(col),
                {
                  style: {
                    ...customCellProps?.style,
                    ...(col.width ? { width: col.width } : {}),
                  },
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
              // A read-only cell of a dropdown / date column keeps the icon's
              // space like its editable neighbours, so the column's width never shifts.
              const iconSpace = editableColumn && hasEditorIcon(col);
              const cellBody =
                col.truncate || iconSpace ? (
                  <span
                    className={cn(
                      "astw:block",
                      col.truncate && "astw:truncate",
                      iconSpace && ICON_SPACE_CLASS_NAME,
                    )}
                  >
                    {content}
                  </span>
                ) : (
                  content
                );
              const menuValue = getCellContextValue(row, col, content);
              const headerLabel = col.label ?? key;

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

              const cellContextMenuHandlers = getCellContextMenuHandlers({
                headerLabel,
                value: menuValue,
                filterConfig: col.filter,
              });
              const cellProps = {
                "data-slot": "data-table-cell" as const,
                title: customCellProps?.title,
                style: { ...cellStyle, WebkitTouchCallout: "none" } satisfies CSSProperties,
                className: cn(
                  cellClassName,
                  blockReadOnlyCells && !editable && "astw:cursor-not-allowed",
                  customCellProps?.className,
                ),
                ...cellContextMenuHandlers,
              };
              if (editable) {
                return (
                  <DataTableEditableCell
                    key={key}
                    row={row}
                    col={col}
                    rowKey={rowKey}
                    colKey={key}
                    label={headerLabel}
                    align={resolveAlign(col)}
                    navigation={navigation}
                    dateRenderer={col.type === "date" ? cellRenderers.get(col) : undefined}
                    tooltipLabel={tooltipLabel}
                    cellProps={cellProps}
                  />
                );
              }

              const cellElement = <Table.Cell {...cellProps} />;

              if (tooltipLabel !== undefined) {
                return (
                  <Tooltip.Root key={key}>
                    <Tooltip.Trigger render={cellElement}>{cellBody}</Tooltip.Trigger>
                    <Tooltip.Content>{tooltipLabel}</Tooltip.Content>
                  </Tooltip.Root>
                );
              }

              return (
                <Table.Cell key={key} {...cellProps}>
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
      <DataTableCellContextMenu
        context={cellContextMenu}
        open={cellContextMenuOpen}
        onOpenChange={handleCellContextMenuOpenChange}
        onCloseComplete={handleCellContextMenuCloseComplete}
      />
    </>
  );
}

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
            // `canApply` is the positive form; the deprecated
            // `isDisabled` still counts, so either one can switch it off.
            const disabled =
              (action.canApply ? !action.canApply(row) : false) ||
              (action.isDisabled?.(row) ?? false);
            return (
              <Menu.Item
                key={action.id}
                disabled={disabled}
                onClick={() => {
                  if (!disabled) {
                    action.onClick(row);
                  }
                }}
                className={cn(action.variant === "destructive" && "astw:text-danger-text")}
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

export { DataTableRows };
