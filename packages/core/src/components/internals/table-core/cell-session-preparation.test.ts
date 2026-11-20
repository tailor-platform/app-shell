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

describe("retained session preparation", () => {
  it("needs no handler for an idle session", async () => {
    expect(await createCellEditSession<string>().confirmPending()).toBe(true);
  });

  it("confirms the current draft and keeps normal confirmation synchronous", async () => {
    const session = createCellEditSession<string>();
    const commit = vi.fn();
    session.registerConfirmation(() => {
      const state = session.getState();
      session.confirm(() => commit(state.status !== "idle" && state.draft));
    });
    session.change("First");
    session.change("Latest");
    expect(await session.confirmPending()).toBe(true);
    expect(commit).toHaveBeenCalledExactlyOnceWith("Latest");
    expect(session.getState()).toEqual({ status: "idle" });
  });

  it("awaits an existing confirmation without invoking another handler", async () => {
    const session = createCellEditSession<string>();
    const request = deferred();
    const handler = vi.fn();
    session.registerConfirmation(handler);
    session.change("Pending");
    session.confirm(() => request.promise);
    const first = session.confirmPending();
    expect(session.confirmPending()).toBe(first);
    let finished = false;
    void first.then(() => {
      finished = true;
    });
    await Promise.resolve();
    expect(finished).toBe(false);
    request.resolve();
    expect(await first).toBe(true);
    expect(handler).not.toHaveBeenCalled();
  });

  it("waits for a change check before committing", async () => {
    const session = createCellEditSession<string>();
    const check = deferred();
    const commit = vi.fn();
    session.registerConfirmation(() => session.confirm(commit));
    session.change("Pending", () => check.promise);
    const pending = session.confirmPending();
    expect(commit).not.toHaveBeenCalled();
    check.resolve();
    expect(await pending).toBe(true);
    expect(commit).toHaveBeenCalledTimes(1);
  });

  it("settles failed change checks without starting the commit", async () => {
    const session = createCellEditSession<string>();
    const check = deferred();
    const commit = vi.fn();
    session.registerConfirmation(() => session.confirm(commit));
    session.change("Pending", () => check.promise);
    const pending = session.confirmPending();
    check.reject(new Error("Rejected"));
    expect(await pending).toBe(false);
    expect(session.getFailure()?.source).toBe("change");
    expect(await session.confirmPending()).toBe(false);
    expect(commit).not.toHaveBeenCalled();
  });

  it("retries a commit failure without losing its draft", async () => {
    const session = createCellEditSession<string>();
    let rejected = true;
    const commit = vi.fn(() => {
      if (rejected) throw new Error("Rejected");
    });
    session.registerConfirmation(() => session.confirm(commit));
    session.change("Pending");
    expect(await session.confirmPending()).toBe(false);
    expect(session.getFailure()).toMatchObject({ draft: "Pending", source: "commit" });
    rejected = false;
    expect(await session.confirmPending()).toBe(true);
    expect(commit).toHaveBeenCalledTimes(2);
  });

  it("does not retry a parse failure until the input changes", async () => {
    const session = createCellEditSession<string>();
    const handler = vi.fn(() => session.fail(undefined, "parse"));
    session.registerConfirmation(handler);
    session.change("-");
    expect(await session.confirmPending()).toBe(false);
    expect(await session.confirmPending()).toBe(false);
    expect(handler).toHaveBeenCalledTimes(1);
    expect(session.getState()).toMatchObject({ status: "failed", draft: "-" });
  });

  it.each(["cancel", "reset", "deactivate"] as const)(
    "settles a pending confirmation when %s invalidates it",
    async (action) => {
      const session = createCellEditSession<string>();
      const request = deferred();
      session.registerConfirmation(() => session.confirm(() => request.promise));
      session.change("Pending");
      const pending = session.confirmPending();
      session[action]();
      expect(await pending).toBe(false);
      const retained = session.getState();
      request.resolve();
      await request.promise;
      expect(session.getState()).toBe(retained);
    },
  );

  it("reports a superseded confirmation as unsuccessful", async () => {
    const session = createCellEditSession<string>();
    const request = deferred();
    session.registerConfirmation(() => session.confirm(() => request.promise));
    session.change("First");
    const pending = session.confirmPending();
    session.change("Newer");
    expect(await pending).toBe(false);
    request.resolve();
    await request.promise;
    expect(session.getState()).toMatchObject({ status: "editing", draft: "Newer" });
  });

  it("locks user changes and cancellation but permits preparation and owner reset", async () => {
    const session = createCellEditSession<string>();
    const callback = vi.fn();
    session.change("Pending");
    const before = session.getState();
    session.setLocked(true);
    session.begin("Another");
    session.change("Another", callback);
    session.cancel(callback);
    expect(session.getState()).toBe(before);
    expect(callback).not.toHaveBeenCalled();
    session.registerConfirmation(() => session.confirm(callback));
    expect(await session.confirmPending()).toBe(true);
    expect(session.isLocked()).toBe(true);
    session.setLocked(false);
    session.change("Reset me");
    session.setLocked(true);
    session.reset();
    expect(session.getState()).toEqual({ status: "idle" });
  });

  it("reports a missing editor handler as an API error", () => {
    const session = createCellEditSession<string>();
    session.change("Pending");
    expect(() => session.confirmPending()).toThrow("no confirmation handler");
  });
});
