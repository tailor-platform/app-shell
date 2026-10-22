import { useEffect, useRef, useState } from "react";

/** @internal */
export interface CellEditFailure {
  error: unknown;
  source: "parse" | "change" | "commit";
}

/** @internal */
export type CellEditSessionState<TDraft> =
  | { status: "idle" }
  | { status: "editing"; draft: TDraft }
  | { status: "confirming"; draft: TDraft }
  | ({ status: "failed"; draft: TDraft } & CellEditFailure);

function isPromiseLike(value: unknown): value is PromiseLike<unknown> {
  return typeof (value as PromiseLike<unknown> | null | undefined)?.then === "function";
}

/** Owns the draft and its failure together; consumer data remains authoritative. @internal */
export function useCellEditSession<TDraft>(enabled: boolean) {
  const [state, setState] = useState<CellEditSessionState<TDraft>>({ status: "idle" });
  const { current: session } = useRef({
    state,
    revision: 0,
    mounted: false,
    pendingChange: null as Promise<boolean> | null,
  });
  const transition = (next: CellEditSessionState<TDraft>) => {
    session.state = next;
    setState(next);
  };
  const isCurrent = (revision: number) => session.mounted && session.revision === revision;

  useEffect(() => {
    session.mounted = true;
    return () => {
      session.mounted = false;
      session.revision++;
      session.pendingChange = null;
    };
  }, [enabled, session]);

  const begin = (draft: TDraft) => {
    if (session.state.status !== "idle") return;
    session.revision++;
    transition({ status: "editing", draft });
  };

  const change = (draft: TDraft, callback?: () => unknown) => {
    const revision = ++session.revision;
    session.pendingChange = null;
    transition({ status: "editing", draft });
    if (!callback) return;
    if (!enabled) {
      callback();
      return;
    }
    const reject = (error: unknown) => {
      if (isCurrent(revision)) transition({ status: "failed", draft, error, source: "change" });
    };
    try {
      const result = callback();
      if (isPromiseLike(result)) {
        const pending = Promise.resolve(result).then(
          () => {
            if (isCurrent(revision) && session.pendingChange === pending)
              session.pendingChange = null;
            return true;
          },
          (error: unknown) => {
            if (isCurrent(revision) && session.pendingChange === pending)
              session.pendingChange = null;
            reject(error);
            return false;
          },
        );
        if (isCurrent(revision)) session.pendingChange = pending;
      }
    } catch (error) {
      reject(error);
    }
  };

  const discard = () => {
    session.revision++;
    session.pendingChange = null;
    transition({ status: "idle" });
  };

  const confirm = (callback: () => unknown, onSuccess?: () => void) => {
    const current = session.state;
    if (
      current.status === "idle" ||
      current.status === "confirming" ||
      (current.status === "failed" && current.source !== "commit")
    )
      return;
    if (!enabled) {
      discard();
      onSuccess?.();
      callback();
      return;
    }
    const { draft } = current;
    const revision = session.revision;
    const pendingChange = session.pendingChange;
    transition({ status: "confirming", draft });
    const isConfirming = () => isCurrent(revision) && session.state.status === "confirming";
    const complete = () => {
      if (!isConfirming()) return;
      transition({ status: "idle" });
      onSuccess?.();
    };
    const reject = (error: unknown) => {
      if (isConfirming()) transition({ status: "failed", draft, error, source: "commit" });
    };
    const run = () => {
      if (!isConfirming()) return;
      try {
        const result = callback();
        if (isPromiseLike(result)) {
          void Promise.resolve(result).then(complete, reject);
          return;
        }
      } catch (error) {
        reject(error);
        return;
      }
      complete();
    };
    if (pendingChange) {
      void pendingChange.then((valid) => {
        if (valid) run();
      });
    } else {
      run();
    }
  };

  const fail = (error: unknown, source: "parse") => {
    const current = session.state;
    if (current.status === "idle") return;
    session.revision++;
    session.pendingChange = null;
    transition({ status: "failed", draft: current.draft, error, source });
  };

  const cancel = (callback?: () => unknown) => {
    discard();
    if (!callback) return;
    if (!enabled) {
      callback();
      return;
    }
    // Restoration failures have no draft to attach to and must not recreate an orphan error.
    try {
      const result = callback();
      if (isPromiseLike(result)) void Promise.resolve(result).catch(() => {});
    } catch {
      // The edit has already been cancelled.
    }
  };

  return { state, getState: () => session.state, begin, change, confirm, fail, cancel };
}
