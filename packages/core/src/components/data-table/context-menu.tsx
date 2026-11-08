import type { ReactNode } from "react";
import { ContextMenu } from "@base-ui/react/context-menu";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTimeZone } from "@/contexts/appshell-context";
import { useCollectionControlOptional } from "@/contexts/collection-control-context";
import { isTemporalFilterType, normalizeTemporalFilterValue } from "@/lib/temporal-filter-values";
import type { Column, DataTableFilterConfig } from "./types";
import { getCellValue } from "./cell-renderers";
import { resolvePin } from "./column-layout";
import { getOperatorLabel, getVisibleFilterOperators } from "./filters/operators";
import { isDecimalFilterValueValid } from "./filters/values";
import { useDataTableT } from "./i18n";
import type { CellContextMenuState } from "./use-cell-context-menu";

const HEADER_CONTEXT_MENU_POPUP_CLASS = cn(
  "astw:bg-popover astw:text-popover-foreground astw:z-(--z-popup) astw:min-w-[10rem] astw:origin-(--transform-origin) astw:overflow-hidden astw:rounded-md astw:border astw:border-border astw:p-1 astw:shadow-md",
  "astw:animate-in astw:fade-in-0 astw:zoom-in-95 astw:data-ending-style:animate-out astw:data-ending-style:fade-out-0 astw:data-ending-style:zoom-out-95",
);
const HEADER_CONTEXT_MENU_ITEM_CLASS = cn(
  "astw:relative astw:flex astw:w-full astw:cursor-default astw:select-none astw:items-center astw:gap-2 astw:rounded-sm astw:px-2 astw:py-1.5 astw:text-body-md astw:outline-hidden",
  "astw:data-highlighted:bg-accent astw:data-highlighted:text-accent-foreground",
  "astw:data-disabled:pointer-events-none astw:data-disabled:opacity-50",
);
const HEADER_CONTEXT_MENU_SUBMENU_TRIGGER_CLASS = cn(
  HEADER_CONTEXT_MENU_ITEM_CLASS,
  "astw:justify-between astw:gap-4",
  "astw:data-popup-open:bg-accent astw:data-popup-open:text-accent-foreground",
);
const HEADER_CONTEXT_MENU_SEPARATOR_CLASS = "astw:bg-border astw:-mx-1 astw:my-1 astw:h-px";

function copyTextToClipboard(text: string) {
  if (typeof navigator === "undefined" || !navigator.clipboard?.writeText) return;
  void navigator.clipboard.writeText(text).catch(() => {
    // Silently fail if clipboard access is denied.
  });
}

function primitiveCellContentValue(content: ReactNode): unknown {
  if (
    typeof content === "string" ||
    typeof content === "number" ||
    typeof content === "boolean" ||
    typeof content === "bigint"
  ) {
    return content;
  }
  return undefined;
}

function getCellContextValue<TRow extends Record<string, unknown>>(
  row: TRow,
  col: Column<TRow>,
  content: ReactNode,
): unknown {
  const raw = getCellValue(row, col);
  return raw !== undefined ? raw : primitiveCellContentValue(content);
}

function toClipboardText(value: unknown): string | undefined {
  if (value == null || value === "") return undefined;
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) {
    const items = value
      .map((item) => toClipboardText(item))
      .filter((item) => item != null && item !== "");
    return items.length > 0 ? items.join(", ") : undefined;
  }
  if (typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  return String(value);
}

function toFilterValue(value: unknown, config: DataTableFilterConfig, timeZone: string): unknown {
  if (value == null || value === "") return undefined;
  if (isTemporalFilterType(config.type)) {
    return normalizeTemporalFilterValue(config.type, value, timeZone);
  }

  switch (config.type) {
    case "number": {
      const parsed = typeof value === "number" ? value : Number(value);
      return Number.isNaN(parsed) ? undefined : parsed;
    }
    case "decimal": {
      const decimal = String(value).trim();
      return isDecimalFilterValueValid(decimal) ? decimal : undefined;
    }
    case "boolean": {
      if (typeof value === "boolean") return value;
      if (value === "true" || value === "false") return value === "true";
      return undefined;
    }
    case "enum": {
      if (Array.isArray(value)) {
        const values = value.map((item) => String(item)).filter((item) => item !== "");
        return values.length > 0 ? values : undefined;
      }
      return [String(value)];
    }
    case "string":
    case "uuid":
    default:
      return String(value);
  }
}

function supportsCellFilterOperator(operator: string): boolean {
  return operator !== "between";
}

function DataTableHeaderContextMenu<TRow extends Record<string, unknown>>({
  align,
  children,
  column,
  columnKey,
  pinnedColumns,
  setPin,
  sortDirection,
  onSortDirectionChange,
}: {
  align: "left" | "right";
  children: ReactNode;
  column: Column<TRow>;
  columnKey: string;
  pinnedColumns: Record<string, "left" | "right" | "none">;
  setPin: (key: string, side: "left" | "right" | "none" | null) => void;
  sortDirection?: "Asc" | "Desc";
  onSortDirectionChange?: (direction: "Asc" | "Desc" | undefined) => void;
}) {
  const t = useDataTableT();
  const label = column.label ?? columnKey;
  const pin = resolvePin(pinnedColumns[columnKey], column.pin);

  return (
    <ContextMenu.Root>
      <ContextMenu.Trigger
        data-slot="data-table-header-context-menu-trigger"
        className={cn(
          "astw:flex astw:h-full astw:w-full astw:items-center",
          align === "right" ? "astw:justify-end astw:text-right" : "astw:text-left",
        )}
      >
        {children}
      </ContextMenu.Trigger>
      <ContextMenu.Portal style={{ position: "relative", zIndex: "var(--z-popup)" }}>
        <ContextMenu.Positioner className="astw:outline-hidden">
          <ContextMenu.Popup
            data-slot="data-table-header-context-menu"
            className={HEADER_CONTEXT_MENU_POPUP_CLASS}
          >
            <ContextMenu.Item
              className={HEADER_CONTEXT_MENU_ITEM_CLASS}
              onClick={() => copyTextToClipboard(label)}
            >
              {t("copyColumnLabel")}
            </ContextMenu.Item>
            <ContextMenu.Separator className={HEADER_CONTEXT_MENU_SEPARATOR_CLASS} />
            <ContextMenu.SubmenuRoot>
              <ContextMenu.SubmenuTrigger
                className={HEADER_CONTEXT_MENU_SUBMENU_TRIGGER_CLASS}
                delay={0}
              >
                {t("pinColumn")}
                <ChevronRight className="astw:size-4" />
              </ContextMenu.SubmenuTrigger>
              <ContextMenu.Portal>
                <ContextMenu.Positioner
                  className="astw:outline-hidden"
                  sideOffset={-4}
                  alignOffset={-4}
                >
                  <ContextMenu.Popup className={HEADER_CONTEXT_MENU_POPUP_CLASS}>
                    <ContextMenu.Item
                      className={HEADER_CONTEXT_MENU_ITEM_CLASS}
                      disabled={pin === "left"}
                      onClick={() => setPin(columnKey, "left")}
                    >
                      {t("pinColumnLeft")}
                    </ContextMenu.Item>
                    <ContextMenu.Item
                      className={HEADER_CONTEXT_MENU_ITEM_CLASS}
                      disabled={pin === "right"}
                      onClick={() => setPin(columnKey, "right")}
                    >
                      {t("pinColumnRight")}
                    </ContextMenu.Item>
                    <ContextMenu.Item
                      className={HEADER_CONTEXT_MENU_ITEM_CLASS}
                      disabled={pin == null}
                      onClick={() => setPin(columnKey, "none")}
                    >
                      {t("unpinColumn")}
                    </ContextMenu.Item>
                  </ContextMenu.Popup>
                </ContextMenu.Positioner>
              </ContextMenu.Portal>
            </ContextMenu.SubmenuRoot>
            {onSortDirectionChange && (
              <ContextMenu.SubmenuRoot>
                <ContextMenu.SubmenuTrigger
                  className={HEADER_CONTEXT_MENU_SUBMENU_TRIGGER_CLASS}
                  delay={0}
                >
                  {t("sortColumn")}
                  <ChevronRight className="astw:size-4" />
                </ContextMenu.SubmenuTrigger>
                <ContextMenu.Portal>
                  <ContextMenu.Positioner
                    className="astw:outline-hidden"
                    sideOffset={-4}
                    alignOffset={-4}
                  >
                    <ContextMenu.Popup className={HEADER_CONTEXT_MENU_POPUP_CLASS}>
                      <ContextMenu.Item
                        className={HEADER_CONTEXT_MENU_ITEM_CLASS}
                        disabled={sortDirection === "Asc"}
                        onClick={() => onSortDirectionChange("Asc")}
                      >
                        {t("sortColumnAsc")}
                      </ContextMenu.Item>
                      <ContextMenu.Item
                        className={HEADER_CONTEXT_MENU_ITEM_CLASS}
                        disabled={sortDirection === "Desc"}
                        onClick={() => onSortDirectionChange("Desc")}
                      >
                        {t("sortColumnDesc")}
                      </ContextMenu.Item>
                      <ContextMenu.Item
                        className={HEADER_CONTEXT_MENU_ITEM_CLASS}
                        disabled={sortDirection == null}
                        onClick={() => onSortDirectionChange(undefined)}
                      >
                        {t("sortColumnReset")}
                      </ContextMenu.Item>
                    </ContextMenu.Popup>
                  </ContextMenu.Positioner>
                </ContextMenu.Portal>
              </ContextMenu.SubmenuRoot>
            )}
          </ContextMenu.Popup>
        </ContextMenu.Positioner>
      </ContextMenu.Portal>
    </ContextMenu.Root>
  );
}
DataTableHeaderContextMenu.displayName = "DataTable.HeaderContextMenu";

function DataTableCellContextMenu({
  context,
  open,
  onOpenChange,
  onCloseComplete,
}: {
  context: CellContextMenuState | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCloseComplete: () => void;
}) {
  const t = useDataTableT();
  const control = useCollectionControlOptional();
  const { value: timeZone } = useTimeZone();
  const filterConfig = context?.filterConfig;
  const copyText = context ? toClipboardText(context.value) : undefined;
  const headerAndValueText = copyText ? `${context?.headerLabel} ${copyText}` : undefined;
  const filterValue =
    filterConfig && context ? toFilterValue(context.value, filterConfig, timeZone) : undefined;
  const filterOperators =
    control && filterConfig && filterValue !== undefined
      ? getVisibleFilterOperators(filterConfig).filter(supportsCellFilterOperator)
      : [];
  const hasFilterMenu = !!filterConfig && filterValue !== undefined && filterOperators.length > 0;

  return (
    <ContextMenu.Root
      open={open}
      onOpenChange={onOpenChange}
      onOpenChangeComplete={(nextOpen) => !nextOpen && onCloseComplete()}
    >
      <ContextMenu.Portal style={{ position: "relative", zIndex: "var(--z-popup)" }}>
        <ContextMenu.Positioner className="astw:outline-hidden" anchor={context?.anchor ?? null}>
          <ContextMenu.Popup className={HEADER_CONTEXT_MENU_POPUP_CLASS}>
            <ContextMenu.Item
              className={HEADER_CONTEXT_MENU_ITEM_CLASS}
              disabled={copyText == null}
              onClick={() => copyText && copyTextToClipboard(copyText)}
            >
              {t("copyCellValue")}
            </ContextMenu.Item>
            <ContextMenu.Item
              className={HEADER_CONTEXT_MENU_ITEM_CLASS}
              disabled={headerAndValueText == null}
              onClick={() => headerAndValueText && copyTextToClipboard(headerAndValueText)}
            >
              {t("copyCellHeaderValue")}
            </ContextMenu.Item>
            {hasFilterMenu && control && filterConfig && (
              <>
                <ContextMenu.Separator className={HEADER_CONTEXT_MENU_SEPARATOR_CLASS} />
                <ContextMenu.SubmenuRoot>
                  <ContextMenu.SubmenuTrigger
                    className={HEADER_CONTEXT_MENU_SUBMENU_TRIGGER_CLASS}
                    delay={0}
                  >
                    {t("addFilter")}
                    <ChevronRight className="astw:size-4" />
                  </ContextMenu.SubmenuTrigger>
                  <ContextMenu.Portal>
                    <ContextMenu.Positioner
                      className="astw:outline-hidden"
                      sideOffset={-4}
                      alignOffset={-4}
                    >
                      <ContextMenu.Popup className={HEADER_CONTEXT_MENU_POPUP_CLASS}>
                        {filterOperators.map((operator) => (
                          <ContextMenu.Item
                            key={operator}
                            className={HEADER_CONTEXT_MENU_ITEM_CLASS}
                            onClick={() =>
                              control.addFilter(filterConfig.field, operator, filterValue)
                            }
                          >
                            {getOperatorLabel(operator, t, filterConfig.type)}
                          </ContextMenu.Item>
                        ))}
                      </ContextMenu.Popup>
                    </ContextMenu.Positioner>
                  </ContextMenu.Portal>
                </ContextMenu.SubmenuRoot>
              </>
            )}
          </ContextMenu.Popup>
        </ContextMenu.Positioner>
      </ContextMenu.Portal>
    </ContextMenu.Root>
  );
}
DataTableCellContextMenu.displayName = "DataTable.CellContextMenu";

export { DataTableHeaderContextMenu, DataTableCellContextMenu, getCellContextValue };
