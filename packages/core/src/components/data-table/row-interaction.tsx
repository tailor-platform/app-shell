import type { MouseEvent } from "react";
import { Link } from "react-router";
import { Button, buttonVariants } from "@/components/button";
import { cn } from "@/lib/utils";
import { ACTIONS_KEY } from "./column-layout";
import { useNavigationRef } from "./editing/cell/shared";
import type { CellEditNavigation } from "./editing/use-navigation";
import type { RowInteraction } from "./types";

/** Activate the real control so routing and drawer focus return have one source of truth. */
export function activateRowPrimaryAction(event: MouseEvent<HTMLTableRowElement>) {
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

  const control = target.closest(
    'a, button, input, select, textarea, label, summary, [tabindex], [contenteditable]:not([contenteditable="false"]), [data-editable], ' +
      '[role="button"], [role="link"], [role="checkbox"], [role="radio"], [role="switch"], [role="combobox"], [role="textbox"], ' +
      '[role="slider"], [role="spinbutton"], [role="menuitem"], [role="menuitemcheckbox"], [role="menuitemradio"], [role="tab"], [role="treeitem"], [role="option"]',
  );
  if (control && currentTarget.contains(control)) return;

  const selection = currentTarget.ownerDocument.getSelection();
  if (
    selection &&
    !selection.isCollapsed &&
    (currentTarget.contains(selection.anchorNode) || currentTarget.contains(selection.focusNode))
  )
    return;

  const action = currentTarget.lastElementChild?.querySelector<HTMLElement>(
    '[data-slot="data-table-row-primary-action"]',
  );
  if (!action?.matches("a[href], button:not(:disabled)")) return;
  action.focus({ preventScroll: true });
  action.click();
}

export function DataTableRowPrimaryAction<TRow extends Record<string, unknown>>({
  interaction,
  row,
  enabled,
  navigation,
  rowKey,
}: {
  interaction: RowInteraction<TRow>;
  row: TRow;
  enabled: boolean;
  navigation: CellEditNavigation;
  rowKey: string;
}) {
  const navigationRef = useNavigationRef<HTMLElement>(navigation, rowKey, ACTIONS_KEY);
  const identity = interaction.getLabel?.(row);
  const accessibleName = identity ? `${interaction.label}: ${identity}` : interaction.label;
  const props = {
    "data-slot": "data-table-row-primary-action",
    "aria-label": accessibleName,
    ref: enabled ? navigationRef : undefined,
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
      aria-disabled="true"
      className={cn(className, "astw:cursor-not-allowed astw:opacity-50")}
    >
      {interaction.label}
    </span>
  );
}
