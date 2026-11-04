import { useEffect, useState, useSyncExternalStore } from "react";
import { createCellEditSession } from "@/components/internals/table-core/cell-session";

export type {
  CellEditFailure,
  CellEditSessionState,
} from "@/components/internals/table-core/cell-session";

/** DataTable owns sessions for one mounted cell; LineItems owns them for its document. */
export function useCellEditSession<TDraft>(enabled: boolean) {
  const [session] = useState(() => createCellEditSession<TDraft>(enabled));
  const state = useSyncExternalStore(session.subscribe, session.getState, session.getState);
  useEffect(() => {
    session.activate(enabled);
    return session.deactivate;
  }, [enabled, session]);
  // Preserve DT's void callback contract; only document owners await preparation.
  const confirm = (callback: () => unknown, onSuccess?: () => void) => {
    void session.confirm(callback, onSuccess);
  };
  return { ...session, state, confirm };
}
