import { StrictMode, type ReactNode } from "react";
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useCellEditSession } from "./use-session";

afterEach(cleanup);

function Wrapper({ children }: { children: ReactNode }) {
  return <StrictMode>{children}</StrictMode>;
}

function setup(enabled = true) {
  return renderHook(() => useCellEditSession<string>(enabled), { wrapper: Wrapper });
}

function deferred() {
  let resolve!: () => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<void>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

async function settle(request: ReturnType<typeof deferred>, failure?: { error: unknown }) {
  await act(async () => {
    if (failure) request.reject(failure.error);
    else request.resolve();
    await request.promise.catch(() => undefined);
  });
}

describe("useCellEditSession", () => {
  it("begins only from idle and keeps the synchronous state aligned before rendering", () => {
    const { result } = setup();
    const callback = vi.fn();
    act(() => {
      result.current.confirm(callback);
      result.current.begin("Original");
      expect(result.current.getState()).toEqual({ status: "editing", draft: "Original" });
      result.current.begin("Must not replace the draft");
    });
    expect(callback).not.toHaveBeenCalled();
    expect(result.current.state).toEqual({ status: "editing", draft: "Original" });
    act(() => result.current.cancel());
    expect(result.current.state).toEqual({ status: "idle" });
  });

  it("finishes synchronous confirmation synchronously and ignores successful return values", () => {
    const { result } = setup();
    const onSuccess = vi.fn(() => {
      expect(result.current.getState()).toEqual({ status: "idle" });
    });
    act(() => {
      result.current.change("Changed", () => 42);
      result.current.confirm(() => false, onSuccess);
      expect(result.current.getState()).toEqual({ status: "idle" });
    });
    expect(onSuccess).toHaveBeenCalledTimes(1);
    expect(result.current.state).toEqual({ status: "idle" });
  });

  it.each([new Error("Invalid"), null, undefined, false])(
    "retains a draft with a change failure %j and blocks confirmation",
    (error) => {
      const { result } = setup();
      const commit = vi.fn();
      act(() => {
        result.current.change("Invalid draft", () => {
          throw error;
        });
        result.current.confirm(commit);
      });
      expect(commit).not.toHaveBeenCalled();
      expect(result.current.state).toEqual({
        status: "failed",
        draft: "Invalid draft",
        error,
        source: "change",
      });
      act(() => result.current.change("Corrected"));
      expect(result.current.state).toEqual({ status: "editing", draft: "Corrected" });
    },
  );

  it("awaits a pending change check before confirming and deduplicates repeated confirmation", async () => {
    const change = deferred();
    const commit = deferred();
    const onCommit = vi.fn(() => commit.promise);
    const duplicate = vi.fn();
    const onSuccess = vi.fn();
    const { result } = setup();
    act(() => {
      result.current.change("Candidate", () => change.promise);
      result.current.confirm(onCommit, onSuccess);
      result.current.confirm(duplicate, duplicate);
    });
    expect(result.current.state).toEqual({ status: "confirming", draft: "Candidate" });
    expect(onCommit).not.toHaveBeenCalled();
    await settle(change);
    expect(onCommit).toHaveBeenCalledTimes(1);
    expect(result.current.state).toEqual({ status: "confirming", draft: "Candidate" });
    act(() => result.current.confirm(duplicate));
    await settle(commit);
    expect(result.current.state).toEqual({ status: "idle" });
    expect(onSuccess).toHaveBeenCalledTimes(1);
    expect(duplicate).not.toHaveBeenCalled();
  });

  it("does not confirm after a pending change check rejects", async () => {
    const request = deferred();
    const error = new Error("Draft rejected");
    const commit = vi.fn();
    const { result } = setup();
    act(() => {
      result.current.change("Candidate", () => request.promise);
      result.current.confirm(commit);
    });
    await settle(request, { error });
    expect(commit).not.toHaveBeenCalled();
    expect(result.current.state).toEqual({
      status: "failed",
      draft: "Candidate",
      error,
      source: "change",
    });
    act(() => result.current.confirm(commit));
    expect(commit).not.toHaveBeenCalled();
  });

  it("retains a failed commit draft and allows retrying the same value", () => {
    const { result } = setup();
    const error = new Error("Save failed");
    const onSuccess = vi.fn();
    act(() => {
      result.current.begin("Candidate");
      result.current.confirm(() => {
        throw error;
      }, onSuccess);
    });
    expect(result.current.state).toEqual({
      status: "failed",
      draft: "Candidate",
      error,
      source: "commit",
    });
    expect(onSuccess).not.toHaveBeenCalled();
    act(() => result.current.confirm(() => undefined, onSuccess));
    expect(result.current.state).toEqual({ status: "idle" });
    expect(onSuccess).toHaveBeenCalledTimes(1);
  });

  it("retains an asynchronously rejected commit draft instead of returning to idle", async () => {
    const request = deferred();
    const { result } = setup();
    const onSuccess = vi.fn();
    act(() => {
      result.current.change("Candidate");
      result.current.confirm(() => request.promise, onSuccess);
    });
    expect(result.current.state).toEqual({ status: "confirming", draft: "Candidate" });
    await settle(request, { error: undefined });
    expect(result.current.state).toEqual({
      status: "failed",
      draft: "Candidate",
      error: undefined,
      source: "commit",
    });
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it.each(["resolve", "reject"] as const)(
    "ignores an old commit %s after a newer draft replaces it",
    async (outcome) => {
      const request = deferred();
      const { result } = setup();
      const onSuccess = vi.fn();
      act(() => {
        result.current.change("Older");
        result.current.confirm(() => request.promise, onSuccess);
        result.current.change("Newer");
      });
      await settle(request, outcome === "reject" ? { error: new Error("Old failure") } : undefined);
      expect(result.current.state).toEqual({ status: "editing", draft: "Newer" });
      expect(onSuccess).not.toHaveBeenCalled();
    },
  );

  it("does not let an older change result replace the newer draft's failure", async () => {
    const old = deferred();
    const currentError = new Error("Current failure");
    const { result } = setup();
    act(() => {
      result.current.change("Older", () => old.promise);
      result.current.change("Newer", () => {
        throw currentError;
      });
    });
    await settle(old, { error: new Error("Old failure") });
    expect(result.current.state).toEqual({
      status: "failed",
      draft: "Newer",
      error: currentError,
      source: "change",
    });
  });

  it("keeps parse failures with their draft and invalidates pending change checks", async () => {
    const request = deferred();
    const commit = vi.fn();
    const { result } = setup();
    act(() => {
      result.current.change("-", () => request.promise);
      result.current.fail("Not a number", "parse");
      result.current.confirm(commit);
    });
    await settle(request, { error: new Error("Old check failure") });
    expect(result.current.state).toEqual({
      status: "failed",
      draft: "-",
      error: "Not a number",
      source: "parse",
    });
    expect(commit).not.toHaveBeenCalled();
    act(() => result.current.cancel());
    expect(result.current.state).toEqual({ status: "idle" });
    act(() => result.current.fail("No draft", "parse"));
    expect(result.current.state).toEqual({ status: "idle" });
  });

  it("cancels pending confirmation and prevents the waiting commit from starting", async () => {
    const request = deferred();
    const commit = vi.fn();
    const { result } = setup();
    act(() => {
      result.current.change("Candidate", () => request.promise);
      result.current.confirm(commit);
      result.current.cancel();
    });
    await settle(request);
    expect(result.current.state).toEqual({ status: "idle" });
    expect(commit).not.toHaveBeenCalled();
  });

  it.each(["sync", "async"] as const)(
    "does not recreate an orphan error from a %s restoration failure",
    async (mode) => {
      const request = deferred();
      const error = new Error("Restoration failed");
      const { result } = setup();
      const restore = vi.fn(() => {
        expect(result.current.getState()).toEqual({ status: "idle" });
        if (mode === "sync") throw error;
        return request.promise;
      });
      act(() => {
        result.current.change("Candidate");
        result.current.cancel(restore);
      });
      if (mode === "async") await settle(request, { error });
      expect(restore).toHaveBeenCalledTimes(1);
      expect(result.current.state).toEqual({ status: "idle" });
    },
  );

  it("ignores a late save result after cancellation and unmount", async () => {
    const request = deferred();
    const onSuccess = vi.fn();
    const view = setup();
    act(() => {
      view.result.current.change("Candidate");
      view.result.current.confirm(() => request.promise, onSuccess);
      view.result.current.cancel();
    });
    view.unmount();
    await settle(request);
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it("does not start a waiting commit after unmount", async () => {
    const request = deferred();
    const commit = vi.fn();
    const view = setup();
    act(() => {
      view.result.current.change("Candidate", () => request.promise);
      view.result.current.confirm(commit);
    });
    view.unmount();
    await settle(request);
    expect(commit).not.toHaveBeenCalled();
  });

  it("supports thenables without making synchronous callbacks asynchronous", async () => {
    const { result } = setup();
    await act(async () => {
      // eslint-disable-next-line unicorn/no-thenable -- Intentionally tests a foreign thenable.
      result.current.change("Candidate", () => ({ then: (resolve: () => void) => resolve() }));
      // eslint-disable-next-line unicorn/no-thenable -- Intentionally tests a foreign thenable.
      result.current.confirm(() => ({ then: (resolve: () => void) => resolve() }));
    });
    expect(result.current.state).toEqual({ status: "idle" });
  });

  it("preserves callback propagation and eager completion when interception is disabled", async () => {
    const { result } = setup(false);
    const error = new Error("Consumer-owned failure");
    const onSuccess = vi.fn(() => {
      expect(result.current.getState()).toEqual({ status: "idle" });
    });
    act(() => {
      expect(() =>
        result.current.change("Candidate", () => {
          throw error;
        }),
      ).toThrow(error);
    });
    expect(result.current.state).toEqual({ status: "editing", draft: "Candidate" });
    act(() => {
      expect(() =>
        result.current.confirm(() => {
          throw error;
        }, onSuccess),
      ).toThrow(error);
    });
    expect(onSuccess).toHaveBeenCalledTimes(1);
    expect(result.current.state).toEqual({ status: "idle" });

    const request = deferred();
    const handled = request.promise.catch(() => undefined);
    const readThen = vi.fn(() => request.promise.then.bind(request.promise));
    const unobserved = {
      // eslint-disable-next-line unicorn/no-thenable -- Any access would violate disabled interception.
      get then() {
        return readThen();
      },
    };
    act(() => {
      result.current.change("Next", () => unobserved);
      result.current.confirm(() => unobserved);
    });
    expect(readThen).not.toHaveBeenCalled();
    expect(result.current.state).toEqual({ status: "idle" });
    await act(async () => {
      request.reject(error);
      await handled;
    });
    expect(result.current.state).toEqual({ status: "idle" });
  });
});
