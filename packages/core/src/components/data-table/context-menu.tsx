import type { ReactNode } from "react";
import { ContextMenu } from "@base-ui/react/context-menu";
import { ChevronRight } from "lucide-react";
import {
  TableHeaderContextMenu as DataTableHeaderContextMenu,
  HEADER_CONTEXT_MENU_POPUP_CLASS,
  HEADER_CONTEXT_MENU_ITEM_CLASS,
  HEADER_CONTEXT_MENU_SUBMENU_TRIGGER_CLASS,
  HEADER_CONTEXT_MENU_SEPARATOR_CLASS,
  copyTextToClipboard,
} from "@/components/internals/table-core/header-context-menu";
import { useTimeZone } from "@/contexts/appshell-context";
import { useCollectionControlOptional } from "@/contexts/collection-control-context";
import { isTemporalFilterType, normalizeTemporalFilterValue } from "@/lib/temporal-filter-values";
import type { Column, DataTableFilterConfig } from "./types";
import { getCellValue } from "./cell-renderers";
import { getOperatorLabel, getVisibleFilterOperators } from "./filters/operators";
import { isDecimalFilterValueValid } from "./filters/values";
import { useDataTableT } from "./i18n";
import type { CellContextMenuState } from "./use-cell-context-menu";

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
