import { useEffect, useState, useSyncExternalStore } from "react";
import { createCellEditSession } from "@/components/internals/table-core/cell-session";

export type {
  CellEditFailure,
  CellEditSessionState,
} from "@/components/internals/table-core/cell-session";

/**
 * Adapts one mounted DataTable cell to the React-independent edit session.
 * Lazy initialization fixes its owner; useSyncExternalStore observes its cached state.
 * Effect cleanup invalidates pending work on unmount or policy changes, while activation
 * allows StrictMode effect replay to reuse the session without accepting stale callbacks.
 * @internal
 */
export function useCellEditSession<TDraft>(enabled: boolean) {
  const [session] = useState(() => createCellEditSession<TDraft>(enabled));
  const state = useSyncExternalStore(session.subscribe, session.getState, session.getState);
  useEffect(() => {
    session.activate(enabled);
    return session.deactivate;
  }, [enabled, session]);
  return {
    state,
    getState: session.getState,
    getFailure: session.getFailure,
    begin: session.begin,
    change: session.change,
    confirm: session.confirm,
    fail: session.fail,
    cancel: session.cancel,
  };
}
