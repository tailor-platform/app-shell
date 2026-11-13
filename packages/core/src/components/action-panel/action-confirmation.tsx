import { useId, useRef, useState, type ReactElement } from "react";
import { useT } from "@/i18n-labels";
import { Button } from "../button";
import { Dialog, DialogContent } from "../dialog/dialog";
import { Text } from "../text";
import type { ActionItem } from "./types";

export function ActionConfirmation({
  action,
  pending,
  onPendingChange,
  trigger,
}: {
  action: ActionItem;
  pending: boolean;
  onPendingChange: (pending: boolean) => void;
  trigger: ReactElement;
}) {
  const { label, onClick, disabled, loading, variant, confirmation } = action;
  const t = useT();
  const [open, setOpen] = useState(false);
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
    onPendingChange(true);
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
      onPendingChange(false);
    }
  };

  if (!confirmation || !onClick) return trigger;

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
      <Dialog.Trigger disabled={isDisabled} render={trigger} />
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
