import { useLayoutEffect, useRef } from "react";
import { Ellipsis } from "lucide-react";

import { Button } from "@/components/button";
import { useDataTableT } from "@/components/data-table/i18n";
import type { SelectionAction, SelectionActionHelpers } from "@/components/data-table/types";
import { Menu } from "@/components/menu";
import { Spinner } from "@/components/spinner";
import { Toolbar } from "@/components/toolbar";
import { cn } from "@/lib/utils";

/** Actions past this many collapse into the "More actions" menu. */
const MAX_INLINE_ACTIONS = 3;

/**
 * The tinted surface a bulk-action bar sits on, matching DataTable.Footer while
 * a selection is open.
 */
export const selectionBarSurfaceClasses = [
  "astw:bg-accent astw:text-accent-foreground",
  // The bar's surface, captured for the token wrapper below: a token can't be
  // re-pointed in terms of itself on a single element.
  "astw:[--line-items-selection-surface:var(--accent)]",
];

/** Keeps hover and secondary text readable on the tinted surface. */
export const selectionBarTokenClasses = [
  "astw:[--accent:color-mix(in_srgb,var(--accent-foreground)_8%,var(--line-items-selection-surface))]",
  "astw:[--muted-foreground:color-mix(in_srgb,var(--accent-foreground)_70%,var(--line-items-selection-surface))]",
];

function isPromiseLike(value: unknown): value is PromiseLike<unknown> {
  return typeof (value as PromiseLike<unknown> | null | undefined)?.then === "function";
}

type LineItemsSelectionBarProps = {
  actions: SelectionAction[];
  selectedIds: string[];
  total: number;
  clearSelection: () => void;
  pendingActionId: string | null;
  runSelectionAction: ((action: { id: string }, request: PromiseLike<unknown>) => void) | undefined;
};

/**
 * The bulk-action bar at the foot of LineItems.Table while lines are
 * selected: count · actions · overflow menu · Clear. Mirrors DataTable's
 * footer bar — same ID-based `SelectionAction` shape, labels, and behaviour —
 * so selection reads the same in both.
 */
export function LineItemsSelectionBar({
  actions,
  selectedIds,
  total,
  clearSelection,
  pendingActionId,
  runSelectionAction,
}: LineItemsSelectionBarProps) {
  const t = useDataTableT();
  const rowRef = useRef<HTMLDivElement>(null);

  // The bar unmounts as soon as the selection empties, usually from its own
  // Clear. Hand focus to the header checkbox instead of letting it drop to
  // <body>; layout-effect cleanup runs while the bar is still in the document.
  useLayoutEffect(() => {
    const bar = rowRef.current;
    return () => {
      if (!bar?.contains(document.activeElement)) return;
      bar
        .closest<HTMLElement>('[data-slot="line-items-table"]')
        ?.querySelector<HTMLElement>("thead [data-slot=checkbox]")
        ?.focus();
    };
  }, []);

  const busy = pendingActionId !== null;
  const inline = actions.slice(0, MAX_INLINE_ACTIONS);
  const overflow = actions.slice(MAX_INLINE_ACTIONS);

  const run = (action: SelectionAction) => {
    if (busy || selectedIds.length === 0) return;
    // `run` lets a handler that only opens a confirm dialog hand the request
    // back later, from the dialog's confirm button, and still get pending state.
    const helpers: SelectionActionHelpers = {
      clearSelection,
      run: (request) => {
        runSelectionAction?.(action, request);
        return request;
      },
    };
    const result = action.onClick([...selectedIds], helpers);
    if (isPromiseLike(result)) runSelectionAction?.(action, result);
  };

  return (
    <Toolbar.Row
      ref={rowRef}
      aria-label={t("bulkActionsLabel")}
      aria-busy={busy || undefined}
      className="astw:max-w-full astw:shrink-0"
    >
      <Toolbar.Group>
        <span className="astw:text-sm astw:font-medium astw:whitespace-nowrap astw:tabular-nums">
          {t("selectionCount", { selected: selectedIds.length, total })}
        </span>
        <Toolbar.Separator className="astw:mx-0.5 astw:h-4" />
        {inline.map((action) => (
          <Button
            key={action.id}
            size="sm"
            variant={action.variant === "destructive" ? "destructive" : "outline"}
            disabled={busy}
            onClick={() => run(action)}
          >
            {pendingActionId === action.id ? <Spinner /> : action.icon}
            {action.label}
          </Button>
        ))}
        {overflow.length > 0 && (
          <Menu.Root>
            <Menu.Trigger
              disabled={busy}
              render={
                <Button variant="ghost" size="sm" aria-label={t("selectionMoreActions")}>
                  {overflow.some((action) => action.id === pendingActionId) ? (
                    <Spinner />
                  ) : (
                    <Ellipsis className="astw:size-4" />
                  )}
                </Button>
              }
            />
            {/* Opens upward: the bar sits at the bottom of the table. */}
            <Menu.Content position={{ side: "top", align: "end" }}>
              {overflow.map((action) => (
                <Menu.Item
                  key={action.id}
                  disabled={busy}
                  onClick={() => run(action)}
                  className={cn(action.variant === "destructive" && "astw:text-danger-text")}
                >
                  {action.icon}
                  {action.label}
                </Menu.Item>
              ))}
            </Menu.Content>
          </Menu.Root>
        )}
        <Toolbar.Separator className="astw:mx-0.5 astw:h-4" />
        <Button
          size="sm"
          variant="ghost"
          aria-label={t("selectionClearLabel")}
          disabled={busy}
          onClick={clearSelection}
        >
          {t("selectionClear")}
        </Button>
      </Toolbar.Group>
    </Toolbar.Row>
  );
}

/**
 * Polite live region for the selection count. It stays mounted while bulk
 * actions are offered, so the first tick (0 → 1, when the bar mounts) is
 * announced too — a region that mounts together with its text is not.
 */
export function LineItemsSelectionAnnouncer({
  open,
  selected,
  total,
}: {
  open: boolean;
  selected: number;
  total: number;
}) {
  const t = useDataTableT();
  return (
    <span className="astw:sr-only" aria-live="polite" aria-atomic="true">
      {open ? t("selectionCount", { selected, total }) : ""}
    </span>
  );
}
