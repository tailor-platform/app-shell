/** Callback/parse failure belongs to the logical edit, not its mounted control. */
export interface CellEditFailure {
  error: unknown;
  source: "parse" | "change" | "commit";
}

export type CellEditSessionState<TDraft> =
  | { status: "idle" }
  | { status: "editing"; draft: TDraft }
  | { status: "confirming"; draft: TDraft }
  | ({ status: "failed"; draft: TDraft } & CellEditFailure);

function isPromiseLike(value: unknown): value is PromiseLike<unknown> {
  return typeof (value as PromiseLike<unknown> | null | undefined)?.then === "function";
}

/**
 * Owns one logical edit without React or committed row state. getState is a cached
 * useSyncExternalStore snapshot, adopted before synchronous listener notification.
 * Detaching a view does not cancel its draft or callbacks; the owner explicitly
 * activates/deactivates the session at its own lifetime boundary.
 *
 * confirm preserves synchronous callback timing while returning an awaitable result.
 * False means failure or invalidation, not callback return values. Private revisions
 * reject stale completions; cancellation tokens also dismiss portaled editor UI.
 * @internal
 */
export function createCellEditSession<TDraft>(interceptErrors = true) {
  let state: CellEditSessionState<TDraft> = { status: "idle" };
  let revision = 0;
  let cancellationRevision = 0;
  let active = true;
  let enabled = interceptErrors;
  let pendingChange: Promise<boolean> | null = null;
  let confirmation: { promise: Promise<boolean>; resolve: (success: boolean) => void } | null =
    null;
  const listeners = new Set<() => void>();

  function transition(next: CellEditSessionState<TDraft>) {
    state = next;
    // oxlint-disable-next-line unicorn/no-useless-spread -- Subscribers can detach or resubscribe during notification.
    for (const listener of [...listeners]) listener();
  }
  function invalidate() {
    revision++;
    pendingChange = null;
    confirmation?.resolve(false);
    confirmation = null;
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

  function confirm(callback: () => unknown, onSuccess?: () => void): Promise<boolean> {
    if (!active) return Promise.resolve(false);
    const current = state;
    if (current.status === "idle") return Promise.resolve(true);
    if (current.status === "confirming") return confirmation?.promise ?? Promise.resolve(false);
    if (current.status === "failed" && current.source !== "commit") return Promise.resolve(false);
    if (!enabled) {
      discard();
      onSuccess?.();
      callback();
      return Promise.resolve(true);
    }

    const { draft } = current;
    const candidate = revision;
    const waiting = pendingChange;
    let resolve!: (success: boolean) => void;
    const promise = new Promise<boolean>((done) => {
      resolve = done;
    });
    const attempt = { promise, resolve };
    confirmation = attempt;
    transition({ status: "confirming", draft });
    const isConfirming = () =>
      isCurrent(candidate) && state.status === "confirming" && confirmation === attempt;
    function finish(success: boolean) {
      if (confirmation === attempt) confirmation = null;
      resolve(success);
    }
    function complete() {
      if (!isConfirming()) return;
      transition({ status: "idle" });
      finish(true);
      onSuccess?.();
    }
    function reject(error: unknown) {
      if (!isConfirming()) return;
      transition({ status: "failed", draft, error, source: "commit" });
      finish(false);
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
        else finish(false);
      });
    } else run();
    return promise;
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
    // Restoration cannot create a failure for the draft that was just discarded.
    try {
      const result = callback();
      if (isPromiseLike(result)) void Promise.resolve(result).catch(() => {});
    } catch {
      // There is no longer a draft to attach a restoration error to.
    }
  }

  return {
    getState: () => state,
    getFailure: () => (state.status === "failed" ? state : undefined),
    /** Token for checking whether an asynchronous adoption still belongs to this edit. */
    getRevision: () => revision,
    /** Changes only on discard, so views can close stale popups without losing newer edits. */
    getCancellationRevision: () => cancellationRevision,
    subscribe: (listener: () => void) => {
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
    activate: (intercept: boolean) => {
      enabled = intercept;
      active = true;
      if (state.status === "confirming" && confirmation === null)
        transition({ status: "editing", draft: state.draft });
    },
    deactivate: () => {
      active = false;
      invalidate();
    },
  };
}

export type CellEditSession<TDraft> = ReturnType<typeof createCellEditSession<TDraft>>;
