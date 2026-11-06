import { useRef, useState, type ReactNode } from "react";
import { ContextMenu } from "@base-ui/react/context-menu";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ColumnMeta, ColumnPinOverride } from "./column-state";
import { resolvePin } from "./pin-layout";
import { useColumnSettingsT } from "./column-settings-labels";

export const HEADER_CONTEXT_MENU_POPUP_CLASS = cn(
  "astw:bg-popover astw:text-popover-foreground astw:z-(--z-popup) astw:min-w-[10rem] astw:origin-(--transform-origin) astw:overflow-hidden astw:rounded-md astw:border astw:border-border astw:p-1 astw:shadow-md",
  "astw:animate-in astw:fade-in-0 astw:zoom-in-95 astw:data-ending-style:animate-out astw:data-ending-style:fade-out-0 astw:data-ending-style:zoom-out-95",
);
export const HEADER_CONTEXT_MENU_ITEM_CLASS = cn(
  "astw:relative astw:flex astw:w-full astw:cursor-default astw:select-none astw:items-center astw:gap-2 astw:rounded-sm astw:px-2 astw:py-1.5 astw:text-body-md astw:outline-hidden",
  "astw:data-highlighted:bg-accent astw:data-highlighted:text-accent-foreground",
  "astw:data-disabled:pointer-events-none astw:data-disabled:opacity-50",
);
export const HEADER_CONTEXT_MENU_SUBMENU_TRIGGER_CLASS = cn(
  HEADER_CONTEXT_MENU_ITEM_CLASS,
  "astw:justify-between astw:gap-4",
  "astw:data-popup-open:bg-accent astw:data-popup-open:text-accent-foreground",
);
export const HEADER_CONTEXT_MENU_SEPARATOR_CLASS = "astw:bg-border astw:-mx-1 astw:my-1 astw:h-px";

export function copyTextToClipboard(text: string) {
  if (typeof navigator === "undefined" || !navigator.clipboard?.writeText) return;
  void navigator.clipboard.writeText(text).catch(() => {
    // Silently fail if clipboard access is denied.
  });
}

/** The DataTable header menu, shared without document/filter dependencies. */
export function TableHeaderContextMenu({
  align,
  children,
  column,
  columnKey,
  pinnedColumns,
  setPin,
  sortDirection,
  onSortDirectionChange,
  slotPrefix = "data-table",
}: {
  align: "left" | "center" | "right";
  children: ReactNode;
  column: Pick<ColumnMeta, "label" | "pin">;
  columnKey: string;
  pinnedColumns: Readonly<Record<string, ColumnPinOverride>>;
  setPin: (key: string, side: ColumnPinOverride | null) => void;
  sortDirection?: "Asc" | "Desc";
  onSortDirectionChange?: (direction: "Asc" | "Desc" | undefined) => void;
  slotPrefix?: "data-table" | "line-items";
}) {
  const t = useColumnSettingsT();
  const label = column.label ?? columnKey;
  const pin = resolvePin(pinnedColumns[columnKey], column.pin);
  const triggerRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [keyboardAnchor, setKeyboardAnchor] = useState<HTMLElement | null>(null);

  return (
    <ContextMenu.Root
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) setKeyboardAnchor(null);
      }}
    >
      <ContextMenu.Trigger
        ref={triggerRef}
        tabIndex={slotPrefix === "line-items" ? 0 : undefined}
        data-slot={`${slotPrefix}-header-context-menu-trigger`}
        onKeyDown={(event) => {
          if (event.key !== "ContextMenu" && !(event.key === "F10" && event.shiftKey)) return;
          event.preventDefault();
          setKeyboardAnchor(event.currentTarget);
          setOpen(true);
        }}
        className={cn(
          "astw:flex astw:h-full astw:w-full astw:items-center",
          align === "right" && "astw:justify-end astw:text-right",
          align === "center" && "astw:justify-center astw:text-center",
          align === "left" && "astw:text-left",
        )}
      >
        {children}
      </ContextMenu.Trigger>
      <ContextMenu.Portal style={{ position: "relative", zIndex: "var(--z-popup)" }}>
        <ContextMenu.Positioner className="astw:outline-hidden" anchor={keyboardAnchor}>
          <ContextMenu.Popup
            finalFocus={slotPrefix === "line-items" ? triggerRef : undefined}
            data-slot={`${slotPrefix}-header-context-menu`}
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
TableHeaderContextMenu.displayName = "TableCore.HeaderContextMenu";
