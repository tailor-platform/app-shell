import * as React from "react";

/**
 * Tracks the one bulk action whose request is in flight, the same way
 * DataTable does: the bar disables its actions (and Clear) and shows a spinner
 * until the request settles. Neither success nor failure changes the selection.
 * Lives in the hook rather than the bar, so it survives the bar unmounting and
 * remounting mid-request.
 */
export function usePendingAction(enabled: boolean) {
  const [pendingActionId, setPendingActionId] = React.useState<string | null>(null);
  const pendingRef = React.useRef(pendingActionId);
  pendingRef.current = pendingActionId;

  const runSelectionAction = enabled
    ? (action: { id: string }, request: PromiseLike<unknown>) => {
        // One request at a time: the bar disables its actions while one runs.
        if (pendingRef.current !== null) return;
        pendingRef.current = action.id;
        setPendingActionId(action.id);
        const settle = () => {
          pendingRef.current = null;
          setPendingActionId(null);
        };
        request.then(settle, (reason: unknown) => {
          // Report rather than rethrow: a rethrow from this chain would surface
          // as an unhandled rejection even when the app already handled it.
          settle();
          console.error(`[LineItems] Selection action "${action.id}" failed:`, reason);
        });
      }
    : undefined;

  return { pendingActionId, runSelectionAction };
}
