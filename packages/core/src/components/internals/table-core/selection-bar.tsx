import { useLayoutEffect, useRef } from "react";
import { Ellipsis } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/button";
import { Menu } from "@/components/menu";
import { Spinner } from "@/components/spinner";
import type { SelectionAction, SelectionActionHelpers } from "./selection-types";

function isPromiseLike(value: unknown): value is PromiseLike<unknown> {
  return typeof (value as PromiseLike<unknown> | null | undefined)?.then === "function";
}

export function TableSelectionBar({
  countText,
  actions,
  selectedIds,
  clearSelection,
  pendingActionId = null,
  runSelectionAction,
  labels,
  buttonSize = "sm",
  onFocusedUnmount,
}: {
  countText: string;
  actions: readonly SelectionAction[];
  selectedIds: readonly string[];
  clearSelection: () => void;
  pendingActionId?: string | null;
  runSelectionAction?: (action: { id: string }, request: PromiseLike<unknown>) => void;
  labels: { bulkActions: string; moreActions: string; clear: string; clearSelection: string };
  buttonSize?: "sm" | "xs";
  onFocusedUnmount?: (bar: HTMLElement) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const bar = ref.current;
    return () => {
      if (bar?.contains(document.activeElement)) onFocusedUnmount?.(bar);
    };
  }, [onFocusedUnmount]);
  const busy = pendingActionId !== null;
  const inline = actions.slice(0, 3);
  const overflow = actions.slice(3);
  const run = (action: SelectionAction) => {
    if (busy || selectedIds.length === 0) return;
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
    // oxlint-disable jsx-a11y/prefer-tag-over-role -- A group of action buttons is not a form fieldset.
    <div
      role="group"
      ref={ref}
      aria-label={labels.bulkActions}
      aria-busy={busy || undefined}
      className="astw:flex astw:min-w-0 astw:max-w-full astw:shrink-0 astw:flex-wrap astw:items-center astw:gap-1.5"
    >
      <span className="astw:text-label-md astw:whitespace-nowrap astw:tabular-nums">
        {countText}
      </span>
      <span
        aria-hidden="true"
        className="astw:mx-0.5 astw:h-4 astw:w-px astw:shrink-0 astw:bg-border"
      />
      {inline.map((action) => (
        <Button
          key={action.id}
          size={buttonSize}
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
              <Button variant="ghost" size={buttonSize} aria-label={labels.moreActions}>
                {overflow.some((action) => action.id === pendingActionId) ? (
                  <Spinner />
                ) : (
                  <Ellipsis className="astw:size-4" />
                )}
              </Button>
            }
          />
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
      <span
        aria-hidden="true"
        className="astw:mx-0.5 astw:h-4 astw:w-px astw:shrink-0 astw:bg-border"
      />
      <Button
        size={buttonSize}
        variant="ghost"
        aria-label={labels.clearSelection}
        disabled={busy}
        onClick={clearSelection}
      >
        {labels.clear}
      </Button>
    </div>
    // oxlint-enable jsx-a11y/prefer-tag-over-role
  );
}
