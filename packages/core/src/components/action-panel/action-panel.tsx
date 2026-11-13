import { useId, useRef, useState } from "react";
import { useT } from "@/i18n-labels";
import { cn } from "../../lib/utils";
import { Card } from "../card";
import { Spinner } from "../spinner";
import { Button } from "../button";
import { Dialog, DialogContent } from "../dialog/dialog";
import type { ActionPanelProps, ActionItem } from "./types";
import { Text } from "../text";

const iconSlotClasses = "astw:flex astw:size-4 astw:items-center astw:justify-center";

// ============================================================================
// ACTION ROW
// ============================================================================

const actionRowBaseClasses = cn(
  "astw:flex astw:items-center astw:gap-2 astw:w-full astw:rounded-md astw:px-3 astw:py-2",
  "astw:text-label-md astw:transition-colors astw:border-0",
  "astw:bg-transparent astw:text-left astw:cursor-pointer astw:[&_svg]:size-4 astw:[&_svg]:shrink-0",
);

const actionRowInteractiveClasses =
  "astw:hover:bg-accent astw:hover:text-accent-foreground astw:outline-none astw:focus-visible:ring-2 astw:focus-visible:ring-ring astw:focus-visible:ring-offset-2";

const actionRowDestructiveClasses =
  "astw:text-danger-text astw:hover:bg-danger-surface astw:hover:text-danger-text";

const actionRowDisabledClasses = "astw:pointer-events-none astw:opacity-50";

function ActionRow({ action }: { action: ActionItem }) {
  const { key, label, icon, onClick, disabled, loading, variant, confirmation } = action;
  const t = useT();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inFlightRef = useRef(false);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const errorId = useId();
  const isLoading = Boolean(loading) || pending;
  const isDisabled = Boolean(disabled) || isLoading;

  // Discard invalid decisions; failed attempts survive lagging external loading for retry.
  if (open && (!confirmation || !onClick || (!pending && (disabled || (loading && !error))))) {
    setOpen(false);
    setError(null);
  }

  const handleConfirm = async () => {
    if (!open || inFlightRef.current || disabled || loading || !onClick || !confirmation) return;
    inFlightRef.current = true;
    setPending(true);
    setError(null);
    try {
      // Normalize synchronous throws so the re-entry guard also spans the current event.
      await Promise.resolve().then(onClick);
      setOpen(false);
    } catch (failure) {
      setError(
        failure instanceof Error && failure.message
          ? failure.message
          : t("actionPanelActionFailed"),
      );
    } finally {
      inFlightRef.current = false;
      setPending(false);
    }
  };

  const content = (
    <>
      <span className={iconSlotClasses} aria-hidden>
        {isLoading ? <Spinner data-testid="action-panel-spinner" /> : icon}
      </span>
      <span className="astw:min-w-0 astw:truncate">{label}</span>
    </>
  );

  const rowClasses = cn(
    actionRowBaseClasses,
    isDisabled ? actionRowDisabledClasses : actionRowInteractiveClasses,
    variant === "destructive" && !isDisabled && actionRowDestructiveClasses,
  );

  const row = (
    <button
      type="button"
      className={rowClasses}
      onClick={isDisabled || confirmation ? undefined : onClick}
      disabled={isDisabled}
      aria-disabled={isDisabled}
      aria-busy={isLoading}
      data-slot="action-panel-item"
      data-key={key}
    >
      {content}
    </button>
  );

  if (!confirmation || !onClick) return row;

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(nextOpen, details) => {
        if (inFlightRef.current || isLoading || (nextOpen && isDisabled)) {
          details.cancel();
          return;
        }
        setError(null);
        setOpen(nextOpen);
      }}
    >
      <Dialog.Trigger disabled={isDisabled} render={row} />
      <DialogContent initialFocus={cancelRef} closeDisabled={isLoading} aria-busy={isLoading}>
        <Dialog.Header>
          <Dialog.Title>{confirmation.title}</Dialog.Title>
          <Dialog.Description>{confirmation.description}</Dialog.Description>
        </Dialog.Header>
        {error && (
          <Text.div id={errorId} role="alert" variant="body-sm" className="astw:text-danger-text">
            {error}
          </Text.div>
        )}
        <Dialog.Footer>
          <Dialog.Close disabled={isLoading} render={<Button ref={cancelRef} variant="outline" />}>
            {confirmation.cancelLabel ?? t("actionPanelCancel")}
          </Dialog.Close>
          <Button
            type="button"
            variant={variant}
            disabled={isDisabled}
            aria-describedby={error ? errorId : undefined}
            onClick={handleConfirm}
          >
            {isLoading
              ? (confirmation.busyLabel ?? t("actionPanelWorking"))
              : (confirmation.confirmLabel ?? label)}
          </Button>
        </Dialog.Footer>
      </DialogContent>
    </Dialog.Root>
  );
}

// ============================================================================
// ACTION PANEL
// ============================================================================

/**
 * ActionPanel — Card with title and list of actions (icon + label).
 *
 * Each row has an icon and label and is triggered by onClick. For navigation, use
 * useNavigate() inside the callback (e.g. onClick: () => navigate("/path")).
 * The panel already fills the width of its parent container.
 *
 * When an action has `loading: true`, the row shows a spinner in the icon slot and is
 * non-interactive (useful for backend-driven actions: parent sets loading from mutation/request state).
 *
 * Set an action's `confirmation` to ask before executing its `onClick`. Confirmed
 * callbacks are awaited: fulfillment closes the dialog, while failure stays open for retry.
 * Return the Promise and throw a user-facing Error to display its message.
 *
 * Actions are not registered to the CommandPalette. To expose actions there,
 * register them explicitly with `useRegisterCommandPaletteActions` inside `AppShell`.
 * ActionPanel itself can be rendered outside `AppShell`.
 *
 * @example
 * ```tsx
 * const navigate = useNavigate();
 * <ActionPanel
 *   title="Actions"
 *   actions={[
 *     { key: "1", label: "Create invoice", icon: <ReceiptIcon />, onClick: () => openModal() },
 *     { key: "2", label: "View docs", icon: <DocIcon />, onClick: () => navigate("/docs") },
 *     { key: "3", label: "Saving…", icon: <SaveIcon />, onClick: () => {}, loading: true },
 *   ]}
 * />
 * ```
 */
export function ActionPanel({ title, actions, emptyContent, className }: ActionPanelProps) {
  const t = useT();
  const resolvedEmptyContent =
    emptyContent === undefined ? t("actionPanelNoActions") : emptyContent;
  const renderedEmptyContent =
    typeof resolvedEmptyContent === "string" ? (
      <Text variant="body-md" className="astw:text-muted-foreground">
        {resolvedEmptyContent}
      </Text>
    ) : (
      resolvedEmptyContent
    );
  const hasEmptyContent =
    actions.length === 0 &&
    resolvedEmptyContent != null &&
    typeof resolvedEmptyContent !== "boolean";

  return (
    <Card.Root className={cn("astw:min-w-69.5 astw:w-full", className)}>
      <Card.Header title={title} className="astw:px-8" />
      <Card.Content className={cn("astw:px-8 astw:pb-4", hasEmptyContent && "astw:pt-2 astw:pb-6")}>
        {actions.length === 0 ? (
          renderedEmptyContent
        ) : (
          <ul className="astw:flex astw:flex-col astw:gap-0 astw:list-none astw:my-0 astw:-mx-3 astw:p-0">
            {actions.map((action) => (
              <li key={action.key}>
                <ActionRow action={action} />
              </li>
            ))}
          </ul>
        )}
      </Card.Content>
    </Card.Root>
  );
}

// ============================================================================
// EXPORTS
// ============================================================================

export default ActionPanel;
