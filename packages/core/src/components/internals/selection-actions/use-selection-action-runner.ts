import { useRef, useState } from "react";

/**
 * Tracks the one selection action whose request is in flight, for a bulk-action
 * bar. It lives in the owning hook rather than the bar so it survives the bar
 * unmounting and remounting (the selection emptying and refilling mid-request),
 * and so a request handed back later — from a confirm dialog, via `run` — is
 * tracked the same way.
 *
 * Shared by `useDataTable` and `useLineItems`; `owner` prefixes the error log.
 */
export function useSelectionActionRunner({
  enabled,
  clearSelection,
  owner,
}: {
  enabled: boolean;
  clearSelection: (() => void) | undefined;
  owner: string;
}) {
  const [pendingActionId, setPendingActionId] = useState<string | null>(null);
  const pendingActionIdRef = useRef(pendingActionId);
  pendingActionIdRef.current = pendingActionId;

  const runSelectionAction = enabled
    ? (action: { id: string; keepSelection?: boolean }, request: PromiseLike<unknown>) => {
        // One request at a time: the bar disables its actions while one runs,
        // so a second call here only comes from app code racing itself.
        if (pendingActionIdRef.current !== null) return;
        pendingActionIdRef.current = action.id;
        setPendingActionId(action.id);
        const settle = () => {
          pendingActionIdRef.current = null;
          setPendingActionId(null);
        };
        request.then(
          () => {
            settle();
            // The rows it acted on may have changed — clear rather than keep
            // stale rows.
            if (!action.keepSelection) clearSelection?.();
          },
          (reason: unknown) => {
            // Keep the selection so the action can be retried. Report rather
            // than rethrow: a rethrow from this chain would surface as an
            // unhandled rejection even when the app already handled the error.
            settle();
            console.error(`[${owner}] Selection action "${action.id}" failed:`, reason);
          },
        );
      }
    : undefined;

  return { pendingActionId, runSelectionAction };
}
