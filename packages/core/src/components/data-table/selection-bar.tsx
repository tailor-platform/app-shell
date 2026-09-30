import { useLayoutEffect, useRef } from "react";
import { Ellipsis } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/button";
import { Menu } from "@/components/menu";
import { Toolbar } from "@/components/toolbar";
import { useDataTableContext, type DataTableContextValue } from "./data-table-context";
import { useDataTableT } from "./i18n";
import type { SelectionAction } from "./types";

/** Actions past this many collapse into the "More actions" menu. */
const MAX_INLINE_ACTIONS = 3;

/**
 * Whether the table offers bulk actions at all: selection is on and the hook
 * was given at least one `selectionActions` entry.
 */
export function hasSelectionActions<TRow extends Record<string, unknown>>(
  ctx: DataTableContextValue<TRow> | null,
): boolean {
  return !!ctx?.toggleRowSelection && (ctx.selectionActions?.length ?? 0) > 0;
}

/** Whether `DataTable.Footer` is currently showing the bulk-action bar. */
export function isSelectionBarOpen<TRow extends Record<string, unknown>>(
  ctx: DataTableContextValue<TRow> | null,
): boolean {
  return hasSelectionActions(ctx) && (ctx?.selectedIds.length ?? 0) > 0;
}

/** "3 of 240 selected", or "3 selected" when the backend returns no total. */
function useSelectionCountText(): string {
  const { selectedIds, total } = useDataTableContext();
  const t = useDataTableT();
  return t("selectionCount", { selected: selectedIds.length, total });
}

type ResolvedAction<TRow extends Record<string, unknown>> = {
  action: SelectionAction<TRow>;
  /** The selected rows this action applies to — what `onClick` receives. */
  rows: TRow[];
  /** Shown as "(n)" only when the action narrows the selection. */
  count: number | null;
};

/**
 * The bulk-action bar `DataTable.Footer` renders while rows are selected:
 * count · actions · overflow menu · Clear.
 */
export function DataTableSelectionBar<TRow extends Record<string, unknown>>() {
  const { selectionActions = [], selectedRows = [], clearSelection } = useDataTableContext<TRow>();
  const t = useDataTableT();
  const countText = useSelectionCountText();
  const rowRef = useRef<HTMLDivElement>(null);

  // The bar unmounts as soon as the selection empties, usually from its own
  // Clear button or an action that clears. Hand focus to the header checkbox
  // instead of letting it drop to <body>. Layout-effect cleanup runs while the
  // bar is still in the document, so `contains` sees the focused button.
  useLayoutEffect(() => {
    const bar = rowRef.current;
    return () => {
      if (!bar?.contains(document.activeElement)) return;
      bar
        .closest<HTMLElement>('[data-slot="data-table"]')
        ?.querySelector<HTMLElement>('[data-slot="data-table-header"] [data-slot="checkbox"]')
        ?.focus();
    };
  }, []);

  const clear = () => clearSelection?.();
  const resolved: ResolvedAction<TRow>[] = selectionActions.map((action) => {
    const { appliesTo } = action;
    const rows = appliesTo ? selectedRows.filter((row) => appliesTo(row)) : selectedRows;
    return { action, rows, count: appliesTo ? rows.length : null };
  });
  const inline = resolved.slice(0, MAX_INLINE_ACTIONS);
  const overflow = resolved.slice(MAX_INLINE_ACTIONS);

  return (
    // max-w-full + shrink-0: next to Pagination in the footer's wrapping row,
    // the bar keeps its actions on one line and lets Pagination drop below it,
    // and only wraps its own buttons once it is wider than the whole footer.
    <Toolbar.Row
      ref={rowRef}
      aria-label={t("selectionActionsLabel")}
      className="astw:max-w-full astw:shrink-0"
    >
      <Toolbar.Group>
        <span className="astw:text-sm astw:font-medium astw:whitespace-nowrap astw:tabular-nums">
          {countText}
        </span>
        <Toolbar.Separator className="astw:mx-0.5 astw:h-4" />
        {inline.map(({ action, rows, count }) => (
          <Button
            key={action.id}
            size="sm"
            variant={action.variant === "destructive" ? "destructive" : "outline"}
            disabled={rows.length === 0}
            onClick={() => action.onClick(rows, { clearSelection: clear })}
          >
            {action.icon}
            {action.label}
            {count !== null && <span className="astw:tabular-nums">({count})</span>}
          </Button>
        ))}
        {overflow.length > 0 && (
          <Menu.Root>
            <Menu.Trigger
              render={
                <Button variant="ghost" size="sm" aria-label={t("selectionMoreActions")}>
                  <Ellipsis className="astw:size-4" />
                </Button>
              }
            />
            {/* Opens upward: the bar sits at the bottom of the table, and often
                at the bottom of the viewport while it is stuck there. */}
            <Menu.Content position={{ side: "top", align: "end" }}>
              {overflow.map(({ action, rows, count }) => {
                const disabled = rows.length === 0;
                return (
                  <Menu.Item
                    key={action.id}
                    disabled={disabled}
                    onClick={() => {
                      if (!disabled) action.onClick(rows, { clearSelection: clear });
                    }}
                    className={cn(action.variant === "destructive" && "astw:text-destructive")}
                  >
                    {action.icon}
                    {action.label}
                    {count !== null && <span className="astw:tabular-nums">({count})</span>}
                  </Menu.Item>
                );
              })}
            </Menu.Content>
          </Menu.Root>
        )}
        <Toolbar.Separator className="astw:mx-0.5 astw:h-4" />
        <Button size="sm" variant="ghost" aria-label={t("selectionClearLabel")} onClick={clear}>
          {t("selectionClear")}
        </Button>
      </Toolbar.Group>
    </Toolbar.Row>
  );
}
DataTableSelectionBar.displayName = "DataTable.SelectionBar";

/**
 * Polite live region for the selection count. It stays mounted while the table
 * offers bulk actions, so the first tick (0 → 1, when the bar itself mounts) is
 * announced too — a region that mounts together with its text is not.
 */
export function DataTableSelectionAnnouncer({ open }: { open: boolean }) {
  const countText = useSelectionCountText();
  return (
    <span className="astw:sr-only" aria-live="polite" aria-atomic="true">
      {open ? countText : ""}
    </span>
  );
}
