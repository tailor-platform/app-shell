import { useCallback, useLayoutEffect, useRef, type ReactNode } from "react";
import { Text } from "@/components/text";
import { TableFooterSurface } from "@/components/internals/table-core/frame";
import { TableSelectionBar } from "@/components/internals/table-core/selection-bar";
import { useLineItemsContext } from "./line-items-context";
import { useLineItemsT } from "./i18n";

export type LineItemsFooterProps = { children?: ReactNode; className?: string };

export function LineItemsFooter({ children, className }: LineItemsFooterProps) {
  const value = useLineItemsContext("LineItems.Footer");
  const t = useLineItemsT();
  const actions = value.rowSelection?.actions ?? [];
  const selectionEnabled = !!value.toggleRowSelection && actions.length > 0;
  const selecting = selectionEnabled && value.selectedIds.length > 0;
  const count = t("selectionCount", {
    selected: value.selectedIds.length,
    total: value.allLines.length,
  });
  const footerRef = useRef<HTMLDivElement>(null);
  const restoreFocus = useRef(false);
  const onFocusedUnmount = useCallback(() => {
    restoreFocus.current = true;
  }, []);
  useLayoutEffect(() => {
    if (selecting || !restoreFocus.current) return;
    restoreFocus.current = false;
    const checkbox = footerRef.current
      ?.closest('[data-slot="line-items"]')
      ?.querySelector<HTMLElement>('[data-slot="line-items-selection-header"] [role="checkbox"]');
    if (checkbox && !checkbox.matches('[data-disabled], [aria-disabled="true"]')) {
      checkbox.focus();
      return;
    }
    const fallback = footerRef.current?.querySelector<HTMLElement>(
      'button:not(:disabled):not([aria-disabled="true"]), input:not(:disabled):not([type="hidden"]):not([tabindex="-1"]), a[href]:not([aria-disabled="true"]), [tabindex]:not([tabindex="-1"]):not([aria-disabled="true"]):not([data-disabled])',
    );
    (fallback ?? footerRef.current)?.focus();
  }, [selecting]);

  return (
    <TableFooterSurface
      ref={footerRef}
      data-slot="line-items-footer"
      tabIndex={-1}
      className={className}
      selectionEnabled={selectionEnabled}
      selecting={selecting}
    >
      {selecting && (
        <TableSelectionBar
          countText={count}
          actions={actions}
          selectedIds={value.selectedIds}
          clearSelection={() => value.clearSelection?.()}
          pendingActionId={value.pendingActionId}
          runSelectionAction={value.runSelectionAction}
          buttonSize="xs"
          labels={{
            bulkActions: t("bulkActions"),
            moreActions: t("moreActions"),
            clear: t("clear"),
            clearSelection: t("clearSelection"),
          }}
          onFocusedUnmount={onFocusedUnmount}
        />
      )}
      {children}
      {selectionEnabled && (
        <Text.span className="astw:sr-only" aria-live="polite" aria-atomic="true">
          {selecting ? count : ""}
        </Text.span>
      )}
    </TableFooterSurface>
  );
}
LineItemsFooter.displayName = "LineItems.Footer";
