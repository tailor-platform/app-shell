// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { createCellEditSession } from "./cell-session";

function deferred() {
  let resolve!: () => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<void>((success, failure) => {
    resolve = success;
    reject = failure;
  });
  return { promise, resolve, reject };
}

async function settle(request: ReturnType<typeof deferred>, failure?: { error: unknown }) {
  if (failure) request.reject(failure.error);
  else request.resolve();
  await request.promise.catch(() => undefined);
}

describe("React-independent cell edit sessions", () => {
  it("caches its state and publishes adopted snapshots, not reads or no-ops", () => {
    const session = createCellEditSession<string>();
    const initial = session.getState();
    const listener = vi.fn(() => {
      expect(session.getState()).toEqual({ status: "editing", draft: "Memo" });
    });
    const detach = session.subscribe(listener);
    expect(session.getState()).toBe(initial);
    expect(session.getFailure()).toBeUndefined();
    session.fail("No draft", "parse");
    const commit = vi.fn();
    expect(session.confirm(commit)).toBeUndefined();
    expect(commit).not.toHaveBeenCalled();
    expect(listener).not.toHaveBeenCalled();
    const begin = session.begin;
    begin("Memo");
    const editing = session.getState();
    expect(editing).not.toBe(initial);
    begin("Must not replace Memo");
    expect(session.getState()).toBe(editing);
    expect(listener).toHaveBeenCalledTimes(1);
    detach();
    detach();
    session.cancel();
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("retains a draft and its failure when a view detaches and resubscribes", () => {
    const session = createCellEditSession<string>();
    const firstView = vi.fn();
    const detach = session.subscribe(firstView);
    session.change("-");
    session.fail("Not a number", "parse");
    const failed = session.getState();
    detach();
    const secondView = vi.fn();
    session.subscribe(secondView);
    expect(session.getState()).toBe(failed);
    expect(session.getFailure()).toBe(failed);
    const commit = vi.fn();
    session.confirm(commit);
    expect(commit).not.toHaveBeenCalled();
    session.change("2");
    session.confirm(commit);
    expect(session.getState()).toEqual({ status: "idle" });
    expect(commit).toHaveBeenCalledTimes(1);
    expect(firstView).toHaveBeenCalledTimes(2);
    expect(secondView).toHaveBeenCalledTimes(3);
  });

  it("uses the current listener set for each notification when subscriptions change", () => {
    const session = createCellEditSession<string>();
    const late = vi.fn();
    const second = vi.fn();
    let detachSecond!: () => void;
    const first = vi.fn(() => {
      detachSecond();
      session.subscribe(late);
    });
    session.subscribe(first);
    detachSecond = session.subscribe(second);
    session.begin("Memo");
    expect(first).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledTimes(1);
    expect(late).not.toHaveBeenCalled();
    session.change("Changed");
    expect(second).toHaveBeenCalledTimes(1);
    expect(late).toHaveBeenCalledTimes(1);
  });

  it.each(["resolve", "reject"] as const)(
    "does not cancel a request when its view disappears before a %s",
    async (outcome) => {
      const session = createCellEditSession<string>();
      const request = deferred();
      const listener = vi.fn();
      const detach = session.subscribe(listener);
      const complete = vi.fn();
      session.begin("Memo");
      session.confirm(() => request.promise, complete);
      detach();
      const error = new Error("Save failed");
      await settle(request, outcome === "reject" ? { error } : undefined);
      expect(session.getState()).toEqual(
        outcome === "resolve"
          ? { status: "idle" }
          : { status: "failed", draft: "Memo", error, source: "commit" },
      );
      expect(complete).toHaveBeenCalledTimes(outcome === "resolve" ? 1 : 0);
      expect(listener).toHaveBeenCalledTimes(2);
    },
  );

  it("keeps synchronous confirmation synchronous and preserves its void result", () => {
    const session = createCellEditSession<string>();
    session.begin("Memo");
    const complete = vi.fn(() => expect(session.getState()).toEqual({ status: "idle" }));
    expect(session.confirm(() => false, complete)).toBeUndefined();
    expect(complete).toHaveBeenCalledTimes(1);
    expect(session.getState()).toEqual({ status: "idle" });
  });

  it("waits for a change check before committing and deduplicates confirmation", async () => {
    const session = createCellEditSession<string>();
    const check = deferred();
    const save = deferred();
    const commit = vi.fn(() => save.promise);
    const duplicate = vi.fn();
    session.change("Memo", () => check.promise);
    session.confirm(commit);
    session.confirm(duplicate);
    expect(commit).not.toHaveBeenCalled();
    await settle(check);
    expect(commit).toHaveBeenCalledTimes(1);
    expect(session.getState()).toEqual({ status: "confirming", draft: "Memo" });
    session.confirm(duplicate);
    await settle(save);
    expect(session.getState()).toEqual({ status: "idle" });
    expect(duplicate).not.toHaveBeenCalled();
  });

  it.each(["check", "commit"] as const)(
    "retains a rejected %s draft and retries only a commit failure",
    async (phase) => {
      const session = createCellEditSession<string>();
      const request = deferred();
      session.change("Memo", phase === "check" ? () => request.promise : undefined);
      const commit = vi.fn(() => (phase === "commit" ? request.promise : undefined));
      session.confirm(commit);
      const error = new Error("Rejected");
      await settle(request, { error });
      expect(session.getState()).toEqual({
        status: "failed",
        draft: "Memo",
        error,
        source: phase === "check" ? "change" : "commit",
      });
      const retry = vi.fn();
      session.confirm(retry);
      expect(retry).toHaveBeenCalledTimes(phase === "commit" ? 1 : 0);
      if (phase === "check") session.change("Corrected");
      else expect(session.getState()).toEqual({ status: "idle" });
    },
  );

  it.each(["cancel", "deactivate"] as const)(
    "does not start a waiting commit after %s",
    async (action) => {
      const session = createCellEditSession<string>();
      const check = deferred();
      const commit = vi.fn();
      session.change("Memo", () => check.promise);
      session.confirm(commit);
      session[action]();
      const retained = session.getState();
      await settle(check);
      expect(commit).not.toHaveBeenCalled();
      expect(session.getState()).toBe(retained);
    },
  );

  it.each(["check", "commit"] as const)(
    "reactivates an invalidated %s with its draft intact for explicit retry",
    async (phase) => {
      const session = createCellEditSession<string>();
      const request = deferred();
      const complete = vi.fn();
      const commit = vi.fn(() => (phase === "commit" ? request.promise : undefined));
      session.change("Memo", phase === "check" ? () => request.promise : undefined);
      session.confirm(commit, complete);
      session.deactivate();
      session.activate(true);
      expect(session.getState()).toEqual({ status: "editing", draft: "Memo" });
      const retry = deferred();
      session.confirm(() => retry.promise);
      await settle(request);
      expect(session.getState()).toEqual({ status: "confirming", draft: "Memo" });
      expect(commit).toHaveBeenCalledTimes(phase === "commit" ? 1 : 0);
      expect(complete).not.toHaveBeenCalled();
      await settle(retry);
      expect(session.getState()).toEqual({ status: "idle" });
    },
  );

  it("does not reset a live confirmation when an active owner activates again", async () => {
    const session = createCellEditSession<string>();
    const request = deferred();
    session.begin("Memo");
    session.confirm(() => request.promise);
    const confirming = session.getState();
    session.activate(true);
    expect(session.getState()).toBe(confirming);
    await settle(request);
    expect(session.getState()).toEqual({ status: "idle" });
  });

  it("ignores retained commands after deactivation without notifying", () => {
    const session = createCellEditSession<string>();
    session.begin("Memo");
    const retained = session.getState();
    const listener = vi.fn();
    session.subscribe(listener);
    session.deactivate();
    session.begin("Detached");
    session.change("Detached", listener);
    session.fail("Detached", "parse");
    session.cancel(listener);
    session.confirm(listener);
    expect(session.getState()).toBe(retained);
    expect(listener).not.toHaveBeenCalled();
  });
});
