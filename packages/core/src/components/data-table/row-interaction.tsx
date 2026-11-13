import type { MouseEvent } from "react";
import { Link } from "react-router";
import { Button, buttonVariants } from "@/components/button";
import { cn } from "@/lib/utils";
import type { RowInteraction } from "./types";

/** Activate the real control so routing and drawer focus return have one source of truth. */
export function activateRowPrimaryAction(
  event: MouseEvent<HTMLTableRowElement>,
  primaryActionId: string,
) {
  const { currentTarget, target } = event;
  if (
    event.defaultPrevented ||
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey ||
    !(target instanceof Element) ||
    !currentTarget.contains(target) ||
    target.closest("tr") !== currentTarget
  )
    return;

  const selection = currentTarget.ownerDocument.getSelection();
  if (
    selection &&
    !selection.isCollapsed &&
    (currentTarget.contains(selection.anchorNode) || currentTarget.contains(selection.focusNode))
  )
    return;

  const action = currentTarget.ownerDocument.getElementById(primaryActionId);
  if (!action?.matches("a[href], button:not(:disabled)") || !currentTarget.contains(action)) return;
  action.focus({ preventScroll: true });
  action.click();
}

export function DataTableRowPrimaryAction<TRow extends Record<string, unknown>>({
  id,
  interaction,
  row,
  enabled,
}: {
  id: string;
  interaction: RowInteraction<TRow>;
  row: TRow;
  enabled: boolean;
}) {
  const identity = interaction.getLabel?.(row);
  const accessibleName = identity ? `${interaction.label}: ${identity}` : interaction.label;
  const props = {
    id,
    "data-slot": "data-table-row-primary-action",
    "aria-label": accessibleName,
  };

  if (interaction.type === "click") {
    return (
      <Button
        {...props}
        type="button"
        variant="ghost"
        size="sm"
        disabled={!enabled}
        onClick={() => interaction.onClick(row)}
      >
        {interaction.label}
      </Button>
    );
  }

  const className = buttonVariants({ variant: "ghost", size: "sm" });
  return enabled ? (
    <Link {...props} to={interaction.href(row)} className={className}>
      {interaction.label}
    </Link>
  ) : (
    <span
      {...props}
      // eslint-disable-next-line jsx-a11y/prefer-tag-over-role -- HTML has no native disabled link; keep its name and role without a destination.
      role="link"
      aria-disabled="true"
      className={cn(className, "astw:cursor-not-allowed astw:opacity-50")}
    >
      {interaction.label}
    </span>
  );
}
