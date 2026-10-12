import { useLayoutEffect, useRef } from "react";
import { Ellipsis } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/button";
import { Menu } from "@/components/menu";
import { Spinner } from "@/components/spinner";
import { Toolbar } from "@/components/toolbar";
// Loaded before the labels on purpose: `@/hooks/i18n` reaches back to itself
// through this context, so a module graph entered via the labels first sees
// `defineI18nLabels` as undefined. Entering via the context is safe.
import "@/contexts/appshell-context";
import { useDataTableT } from "@/components/data-table/i18n";
import type { SelectionAction, SelectionActionHelpers } from "@/components/data-table/types";

/** Actions past this many collapse into the "More actions" menu. */
const MAX_INLINE_ACTIONS = 3;

/**
 * The tinted surface a bulk-action bar sits on while a selection is open.
 * Sticky, so on a page-scrolling table it rides the bottom of the viewport
 * until the table's own end scrolls into view.
 */
export const selectionBarSurfaceClasses = [
  "astw:bg-accent astw:text-accent-foreground",
  "astw:sticky astw:bottom-0 astw:z-20",
  // The bar's surface, captured for the token wrapper below: a token can't be
  // re-pointed in terms of itself on a single element.
  "astw:[--selection-bar-surface:var(--accent)]",
];

/**
 * Re-points the hover and secondary-text tokens for everything on the tinted
 * bar, which would otherwise hover to the bar's colour and lose contrast on it.
 * Put it on a `contents` wrapper inside the surface.
 */
export const selectionBarTokenClasses = [
  "astw:[--accent:color-mix(in_srgb,var(--accent-foreground)_8%,var(--selection-bar-surface))]",
  "astw:[--muted-foreground:color-mix(in_srgb,var(--accent-foreground)_70%,var(--selection-bar-surface))]",
];

export type SelectionActionsBarProps<TRow extends Record<string, unknown>> = {
  actions: SelectionAction<TRow>[];
  selectedRows: TRow[];
  /** Shown as "3 of 240 selected"; `null` shows "3 selected". */
  total: number | null;
  clearSelection: (() => void) | undefined;
  pendingActionId: string | null;
  runSelectionAction:
    | ((action: { id: string; keepSelection?: boolean }, request: PromiseLike<unknown>) => void)
    | undefined;
  /**
   * Where focus goes when the bar closes while focus is inside it — after
   * Clear, or an action that clears — so it doesn't drop to `<body>`.
   */
  returnFocusTo?: (bar: HTMLElement) => HTMLElement | null | undefined;
  className?: string;
};

type ResolvedAction<TRow extends Record<string, unknown>> = {
  action: SelectionAction<TRow>;
  /** The selected rows this action can act on — what `onClick` receives. */
  rows: TRow[];
  /** Shown as "(n)" only when the action narrows the selection. */
  count: number | null;
};

function isPromiseLike(value: unknown): value is PromiseLike<unknown> {
  return typeof (value as PromiseLike<unknown> | null | undefined)?.then === "function";
}

/** "3 of 240 selected", or "3 selected" when there is no total. */
export function useSelectionCountText(selected: number, total: number | null): string {
  const t = useDataTableT();
  return t("selectionCount", { selected, total });
}

/**
 * The bulk-action bar shown while rows are selected:
 * count · actions · overflow menu · Clear.
 *
 * Shared by `DataTable.Footer` and `LineItems.Table`, so selection reads the
 * same in both.
 */
export function SelectionActionsBar<TRow extends Record<string, unknown>>({
  actions,
  selectedRows,
  total,
  clearSelection,
  pendingActionId,
  runSelectionAction,
  returnFocusTo,
  className,
}: SelectionActionsBarProps<TRow>) {
  const t = useDataTableT();
  const countText = useSelectionCountText(selectedRows.length, total);
  const rowRef = useRef<HTMLDivElement>(null);
  const returnFocusToRef = useRef(returnFocusTo);
  returnFocusToRef.current = returnFocusTo;

  // The bar unmounts as soon as the selection empties, usually from its own
  // Clear button or an action that clears. Layout-effect cleanup runs while the
  // bar is still in the document, so `contains` sees the focused button.
  useLayoutEffect(() => {
    const bar = rowRef.current;
    return () => {
      if (!bar?.contains(document.activeElement)) return;
      returnFocusToRef.current?.(bar)?.focus();
    };
  }, []);

  // While an action is pending, every action — and Clear — is disabled, so a
  // slow request can't be fired twice or overlapped by another action against
  // the same selection.
  const busy = pendingActionId !== null;

  const clear = () => clearSelection?.();
  const resolved: ResolvedAction<TRow>[] = actions.map((action) => {
    const { canApply } = action;
    const rows = canApply ? selectedRows.filter((row) => canApply(row)) : selectedRows;
    return { action, rows, count: canApply ? rows.length : null };
  });
  const inline = resolved.slice(0, MAX_INLINE_ACTIONS);
  const overflow = resolved.slice(MAX_INLINE_ACTIONS);

  const run = ({ action, rows }: ResolvedAction<TRow>) => {
    if (busy || rows.length === 0) return;
    // `run` lets a handler that only opens a confirm dialog hand the request
    // back later, from the dialog's confirm button, and still get the pending
    // state and clear-on-success.
    const helpers: SelectionActionHelpers = {
      clearSelection: clear,
      run: (request) => {
        runSelectionAction?.(action, request);
        return request;
      },
    };
    const result = action.onClick(rows, helpers);
    // A synchronous handler that never calls `run` owns the selection.
    if (isPromiseLike(result)) runSelectionAction?.(action, result);
  };

  return (
    // max-w-full + shrink-0: next to other footer content in a wrapping row,
    // the bar keeps its actions on one line and lets that content drop below
    // it, and only wraps its own buttons once it is wider than the whole row.
    <Toolbar.Row
      ref={rowRef}
      aria-label={t("selectionActionsLabel")}
      aria-busy={busy || undefined}
      className={cn("astw:max-w-full astw:shrink-0", className)}
    >
      <Toolbar.Group>
        <span className="astw:text-sm astw:font-medium astw:whitespace-nowrap astw:tabular-nums">
          {countText}
        </span>
        <Toolbar.Separator className="astw:mx-0.5 astw:h-4" />
        {inline.map((resolvedAction) => {
          const { action, rows, count } = resolvedAction;
          return (
            <Button
              key={action.id}
              size="sm"
              variant={action.variant === "destructive" ? "destructive" : "outline"}
              disabled={busy || rows.length === 0}
              onClick={() => run(resolvedAction)}
            >
              {pendingActionId === action.id ? <Spinner /> : action.icon}
              {action.label}
              {count !== null && <span className="astw:tabular-nums">({count})</span>}
            </Button>
          );
        })}
        {overflow.length > 0 && (
          <Menu.Root>
            <Menu.Trigger
              disabled={busy}
              render={
                <Button variant="ghost" size="sm" aria-label={t("selectionMoreActions")}>
                  {overflow.some(({ action }) => action.id === pendingActionId) ? (
                    <Spinner />
                  ) : (
                    <Ellipsis className="astw:size-4" />
                  )}
                </Button>
              }
            />
            {/* Opens upward: the bar sits at the bottom of the table, and often
                at the bottom of the viewport while it is stuck there. */}
            <Menu.Content position={{ side: "top", align: "end" }}>
              {overflow.map((resolvedAction) => {
                const { action, rows, count } = resolvedAction;
                return (
                  <Menu.Item
                    key={action.id}
                    disabled={busy || rows.length === 0}
                    onClick={() => run(resolvedAction)}
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
        <Button
          size="sm"
          variant="ghost"
          aria-label={t("selectionClearLabel")}
          disabled={busy}
          onClick={clear}
        >
          {t("selectionClear")}
        </Button>
      </Toolbar.Group>
    </Toolbar.Row>
  );
}

/**
 * Polite live region for the selection count. Keep it mounted while the table
 * offers bulk actions, so the first tick (0 → 1, when the bar itself mounts) is
 * announced too — a region that mounts together with its text is not.
 */
export function SelectionActionsAnnouncer({
  open,
  selected,
  total,
}: {
  open: boolean;
  selected: number;
  total: number | null;
}) {
  const countText = useSelectionCountText(selected, total);
  return (
    <span className="astw:sr-only" aria-live="polite" aria-atomic="true">
      {open ? countText : ""}
    </span>
  );
}
