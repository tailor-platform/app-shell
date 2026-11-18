import { useEffect, useState, useSyncExternalStore } from "react";
import { createCellEditSession } from "../cell-session";

/** Mounted cells own local sessions; document adapters retain external sessions across view detach. */
export function useCellEditSession<TDraft>(
  enabled: boolean,
  external?: ReturnType<typeof createCellEditSession<unknown>>,
) {
  const [local] = useState(() => external ?? createCellEditSession<TDraft>(enabled));
  // External sessions must retain one editor's draft shape while a draft is active.
  const session = (external ?? local) as ReturnType<typeof createCellEditSession<TDraft>>;
  const state = useSyncExternalStore(session.subscribe, session.getState, session.getState);
  useEffect(() => {
    if (external) return;
    session.activate(enabled);
    return session.deactivate;
  }, [enabled, external, session]);
  return { state, ...session };
}
