// Retain reachable session declarations in the bundle; package entrypoints do not export them.
/** A failure belongs to its draft, not to the control displaying it. */
export interface CellEditFailure {
  error: unknown;
  source: "parse" | "change" | "commit";
}

/** The cached view of one logical edit; committed row values remain owned by the caller. */
export type CellEditSessionState<TDraft> =
  | { status: "idle" }
  | { status: "editing"; draft: TDraft }
  | { status: "confirming"; draft: TDraft }
  | ({ status: "failed"; draft: TDraft } & CellEditFailure);

function isPromiseLike(value: unknown): value is PromiseLike<unknown> {
  return typeof (value as PromiseLike<unknown> | null | undefined)?.then === "function";
}

/**
 * Owns one edit's draft, failure, and in-flight callback checks without React or row state.
 * getState returns a cached snapshot suitable for useSyncExternalStore. A transition adopts
 * that snapshot before notifying subscribers synchronously; reads do not notify.
 *
 * The caller owns the lifetime: detaching a subscriber leaves the edit intact, whereas
 * deactivate invalidates pending callbacks and blocks commands. activate resumes the same
 * draft with the caller's error-interception policy. Returned methods do not depend on this.
 */
export function createCellEditSession<TDraft>(interceptErrors = true) {
  let state: CellEditSessionState<TDraft> = { status: "idle" };
  let revision = 0;
  let cancellationRevision = 0;
  let active = true;
  let enabled = interceptErrors;
  let pendingChange: Promise<boolean> | null = null;
  const listeners = new Set<() => void>();

  function transition(next: CellEditSessionState<TDraft>) {
    state = next;
    // oxlint-disable-next-line unicorn/no-useless-spread -- Subscriptions can change during notification.
    for (const listener of [...listeners]) listener();
  }
  function invalidate() {
    revision++;
    pendingChange = null;
  }
  const isCurrent = (candidate: number) => active && revision === candidate;

  function begin(draft: TDraft) {
    if (!active || state.status !== "idle") return;
    invalidate();
    transition({ status: "editing", draft });
  }

  function change(draft: TDraft, callback?: () => unknown) {
    if (!active) return;
    invalidate();
    const candidate = revision;
    transition({ status: "editing", draft });
    if (!callback) return;
    if (!enabled) {
      callback();
      return;
    }
    function reject(error: unknown) {
      if (isCurrent(candidate)) transition({ status: "failed", draft, error, source: "change" });
    }
    try {
      const result = callback();
      if (isPromiseLike(result)) {
        const pending = Promise.resolve(result).then(
          () => {
            if (isCurrent(candidate) && pendingChange === pending) pendingChange = null;
            return true;
          },
          (error: unknown) => {
            if (isCurrent(candidate) && pendingChange === pending) pendingChange = null;
            reject(error);
            return false;
          },
        );
        if (isCurrent(candidate)) pendingChange = pending;
      }
    } catch (error) {
      reject(error);
    }
  }

  function discard() {
    cancellationRevision++;
    invalidate();
    transition({ status: "idle" });
  }

  /** Waits for an outstanding change check; repeated confirmation does not repeat callbacks. */
  function confirm(callback: () => unknown, onSuccess?: () => void) {
    const current = state;
    if (
      !active ||
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
    const candidate = revision;
    const waiting = pendingChange;
    transition({ status: "confirming", draft });
    const isConfirming = () => isCurrent(candidate) && state.status === "confirming";
    function complete() {
      if (!isConfirming()) return;
      transition({ status: "idle" });
      onSuccess?.();
    }
    function reject(error: unknown) {
      if (isConfirming()) transition({ status: "failed", draft, error, source: "commit" });
    }
    function run() {
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
    }
    if (waiting) {
      void waiting.then((valid) => {
        if (valid) run();
      });
    } else run();
  }

  function fail(error: unknown, source: "parse") {
    if (!active || state.status === "idle") return;
    const { draft } = state;
    invalidate();
    transition({ status: "failed", draft, error, source });
  }

  function cancel(callback?: () => unknown) {
    if (!active) return;
    discard();
    if (!callback) return;
    if (!enabled) {
      callback();
      return;
    }
    // Restoration failures cannot recreate an error for a draft that has been discarded.
    try {
      const result = callback();
      if (isPromiseLike(result)) void Promise.resolve(result).catch(() => {});
    } catch {
      // There is no longer a draft to attach a restoration error to.
    }
  }

  return {
    getRevision: () => revision,
    /** Explicit discard also retires local popup/search state in retained editor controls. */
    getCancellationRevision: () => cancellationRevision,
    getState: () => state,
    getFailure: () => (state.status === "failed" ? state : undefined),
    /** Registers a listener without invoking it; cleanup is idempotent and does not cancel. */
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    begin,
    change,
    confirm,
    fail,
    cancel,
    /** Resumes the retained draft; an invalidated confirmation requires an explicit retry. */
    activate(intercept: boolean) {
      const resuming = !active;
      enabled = intercept;
      active = true;
      if (resuming && state.status === "confirming")
        transition({ status: "editing", draft: state.draft });
    },
    /** Invalidates async work without changing the retained draft or notifying subscribers. */
    deactivate() {
      active = false;
      invalidate();
    },
  };
}
