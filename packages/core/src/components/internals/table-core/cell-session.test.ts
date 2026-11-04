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

describe("document-owned cell sessions", () => {
  it("keeps draft/failure when the rendered control unsubscribes and remounts", async () => {
    const session = createCellEditSession<string>();
    const firstView = vi.fn();
    const detach = session.subscribe(firstView);
    session.change("-");
    session.fail("Not a number", "parse");
    detach();
    const failure = session.getFailure();
    const secondView = vi.fn();
    const detachSecond = session.subscribe(secondView);
    expect(session.getState()).toEqual({
      status: "failed",
      draft: "-",
      error: "Not a number",
      source: "parse",
    });
    expect(session.getFailure()).toBe(failure);
    const commit = vi.fn();
    await expect(session.confirm(commit)).resolves.toBe(false);
    expect(commit).not.toHaveBeenCalled();
    session.change("2");
    await expect(session.confirm(commit)).resolves.toBe(true);
    expect(commit).toHaveBeenCalledTimes(1);
    expect(firstView).toHaveBeenCalledTimes(2);
    expect(secondView).toHaveBeenCalledTimes(3);
    detachSecond();
  });

  it("does not cancel a request merely because its view disappears", async () => {
    const session = createCellEditSession<string>();
    const detach = session.subscribe(vi.fn());
    const request = deferred();
    session.begin("Memo");
    const result = session.confirm(() => request.promise);
    detach();
    request.resolve();
    await expect(result).resolves.toBe(true);
    expect(session.getState()).toEqual({ status: "idle" });
  });

  it("finishes synchronous callbacks synchronously while returning an awaitable result", async () => {
    const session = createCellEditSession<string>();
    const complete = vi.fn();
    session.begin("1");
    const result = session.confirm(() => false, complete);
    expect(session.getState()).toEqual({ status: "idle" });
    expect(complete).toHaveBeenCalledTimes(1);
    await expect(result).resolves.toBe(true);
  });

  it("coalesces confirmation and waits for both draft checks and commit", async () => {
    const session = createCellEditSession<string>();
    const check = deferred();
    const save = deferred();
    const commit = vi.fn(() => save.promise);
    session.change("Memo", () => check.promise);
    const first = session.confirm(commit);
    const duplicate = vi.fn();
    expect(session.confirm(duplicate)).toBe(first);
    expect(commit).not.toHaveBeenCalled();
    check.resolve();
    await check.promise;
    await Promise.resolve();
    expect(commit).toHaveBeenCalledTimes(1);
    expect(session.getState().status).toBe("confirming");
    save.resolve();
    await expect(first).resolves.toBe(true);
    expect(duplicate).not.toHaveBeenCalled();
  });

  it("resolves preparation false on a draft-check failure", async () => {
    const session = createCellEditSession<string>();
    const check = deferred();
    session.change("Invalid", () => check.promise);
    const commit = vi.fn();
    const result = session.confirm(commit);
    const error = new Error("Invalid draft");
    check.reject(error);
    await expect(result).resolves.toBe(false);
    expect(session.getFailure()).toMatchObject({ error, source: "change" });
    expect(commit).not.toHaveBeenCalled();
  });

  it("retains failed values and retries only upon explicit confirmation", async () => {
    const session = createCellEditSession<string>();
    const request = deferred();
    const callback = vi.fn(() => request.promise);
    session.begin("Memo");
    const first = session.confirm(callback);
    const error = new Error("Save failed");
    request.reject(error);
    await expect(first).resolves.toBe(false);
    expect(session.getState()).toEqual({
      status: "failed",
      draft: "Memo",
      error,
      source: "commit",
    });
    expect(callback).toHaveBeenCalledTimes(1);
    await expect(session.confirm(() => undefined)).resolves.toBe(true);
    expect(session.getState()).toEqual({ status: "idle" });
  });

  it.each(["resolve", "reject"] as const)(
    "settles superseded preparation immediately and ignores its late %s",
    async (outcome) => {
      const session = createCellEditSession<string>();
      const request = deferred();
      const complete = vi.fn();
      session.begin("Old");
      const pending = session.confirm(() => request.promise, complete);
      session.change("New");
      await expect(pending).resolves.toBe(false);
      if (outcome === "resolve") request.resolve();
      else request.reject(new Error("Old failure"));
      await request.promise.catch(() => undefined);
      await Promise.resolve();
      expect(session.getState()).toEqual({ status: "editing", draft: "New" });
      expect(complete).not.toHaveBeenCalled();
    },
  );

  it("does not start a waiting callback after cancellation or document disposal", async () => {
    for (const action of ["cancel", "deactivate"] as const) {
      const session = createCellEditSession<string>();
      const check = deferred();
      const commit = vi.fn();
      session.change("Memo", () => check.promise);
      const pending = session.confirm(commit);
      session[action]();
      await expect(pending).resolves.toBe(false);
      check.resolve();
      await check.promise;
      expect(commit).not.toHaveBeenCalled();
    }
  });

  it.each(["check", "commit"] as const)(
    "reactivates an invalidated %s with its draft intact for explicit retry",
    async (phase) => {
      const session = createCellEditSession<string>();
      const request = deferred();
      const callback = vi.fn(() => (phase === "commit" ? request.promise : undefined));
      session.change("Draft", phase === "check" ? () => request.promise : undefined);
      const pending = session.confirm(callback);
      session.deactivate();
      session.activate(true);
      await expect(pending).resolves.toBe(false);
      expect(session.getState()).toEqual({ status: "editing", draft: "Draft" });
      request.resolve();
      await request.promise;
      await Promise.resolve();
      expect(callback).toHaveBeenCalledTimes(phase === "commit" ? 1 : 0);
      expect(session.getState()).toEqual({ status: "editing", draft: "Draft" });
      const retry = vi.fn();
      await expect(session.confirm(retry)).resolves.toBe(true);
      expect(retry).toHaveBeenCalledTimes(1);
    },
  );

  it("does not notify detached subscribers and ignores commands after disposal", async () => {
    const session = createCellEditSession<string>();
    const listener = vi.fn();
    const detach = session.subscribe(listener);
    detach();
    session.deactivate();
    session.begin("Detached");
    session.change("Detached");
    session.fail("Detached", "parse");
    session.cancel();
    const commit = vi.fn();
    await expect(session.confirm(commit)).resolves.toBe(false);
    expect(commit).not.toHaveBeenCalled();
    expect(listener).not.toHaveBeenCalled();
    expect(session.getState()).toEqual({ status: "idle" });
  });
});
