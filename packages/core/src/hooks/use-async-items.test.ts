import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, renderHook, act } from "@testing-library/react";
import { useAsyncItems } from "./use-async-items";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Creates a fetcher mock that resolves with the given result after an optional delay. */
function createFetcher<T>(result: T[], delay = 0) {
  return vi.fn(
    (_query: string, _opts: { signal: AbortSignal }) =>
      new Promise<T[]>((resolve) => {
        if (delay > 0) {
          setTimeout(() => resolve(result), delay);
        } else {
          resolve(result);
        }
      }),
  );
}

/** Creates a fetcher mock that rejects with the given error. */
function createFailingFetcher(error: Error) {
  return vi.fn((_query: string, _opts: { signal: AbortSignal }) => Promise.reject(error));
}

/** Advance timers by `ms` and flush pending microtasks. */
async function advanceAndFlush(ms: number) {
  await act(async () => {
    vi.advanceTimersByTime(ms);
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("useAsyncItems", () => {
  // =========================================================================
  // Basic functionality
  // =========================================================================

  describe("basic functionality", () => {
    it("returns correct initial shape", () => {
      const fetcher = createFetcher(["a"]);
      const { result } = renderHook(() => useAsyncItems({ fetcher }));

      expect(result.current.items).toEqual([]);
      expect(result.current.loading).toBe(false);
      expect(result.current.query).toBe("");
      expect(result.current.error).toBeUndefined();
      expect(typeof result.current.onInputValueChange).toBe("function");
    });

    it("calls fetcher with trimmed query after debounce", async () => {
      const fetcher = createFetcher(["Apple"]);
      const { result } = renderHook(() => useAsyncItems({ fetcher }));

      act(() => {
        result.current.onInputValueChange("  apple  ");
      });

      // Not called yet (still debouncing)
      expect(fetcher).not.toHaveBeenCalled();

      await advanceAndFlush(300);

      expect(fetcher).toHaveBeenCalledOnce();
      expect(fetcher).toHaveBeenCalledWith(
        "apple",
        expect.objectContaining({ signal: expect.any(AbortSignal) }),
      );
    });

    it("populates items after fetch completes", async () => {
      const items = [{ id: 1 }, { id: 2 }];
      const fetcher = createFetcher(items);
      const { result } = renderHook(() => useAsyncItems({ fetcher }));

      act(() => {
        result.current.onInputValueChange("test");
      });

      await advanceAndFlush(300);

      expect(result.current.items).toEqual(items);
    });

    it("sets loading=true during fetch and loading=false after", async () => {
      const fetcher = createFetcher(["a"], 50);
      const { result } = renderHook(() => useAsyncItems({ fetcher }));

      act(() => {
        result.current.onInputValueChange("test");
      });

      // loading immediately after input
      expect(result.current.loading).toBe(true);

      // After debounce but before fetch resolves
      await advanceAndFlush(300);
      // fetch is in flight
      expect(result.current.loading).toBe(true);

      // After fetch resolves
      await advanceAndFlush(50);

      expect(result.current.loading).toBe(false);
    });

    it("updates query state with input value", () => {
      const fetcher = createFetcher([]);
      const { result } = renderHook(() => useAsyncItems({ fetcher }));

      act(() => {
        result.current.onInputValueChange("hello");
      });

      expect(result.current.query).toBe("hello");
    });

    it("clears error on successful fetch", async () => {
      let shouldFail = true;
      const fetcher = vi.fn(async (_q: string, _o: { signal: AbortSignal }) => {
        if (shouldFail) throw new Error("fail");
        return ["ok"];
      });

      const { result } = renderHook(() => useAsyncItems({ fetcher }));

      // First fetch → error
      act(() => {
        result.current.onInputValueChange("a");
      });
      await advanceAndFlush(300);

      expect(result.current.error).toBeInstanceOf(Error);

      // Second fetch → success
      shouldFail = false;
      act(() => {
        result.current.onInputValueChange("b");
      });
      await advanceAndFlush(300);

      expect(result.current.error).toBeUndefined();
      expect(result.current.items).toEqual(["ok"]);
    });
  });

  // =========================================================================
  // Empty / whitespace input handling
  // =========================================================================

  describe("empty input handling", () => {
    it("clears items when input is empty", async () => {
      const fetcher = createFetcher(["a", "b"]);
      const { result } = renderHook(() => useAsyncItems({ fetcher }));

      // Fetch some items first
      act(() => {
        result.current.onInputValueChange("test");
      });
      await advanceAndFlush(300);

      expect(result.current.items).toEqual(["a", "b"]);

      // Clear input
      act(() => {
        result.current.onInputValueChange("");
      });

      expect(result.current.items).toEqual([]);
      expect(result.current.loading).toBe(false);
    });

    it("clears error when input is empty", async () => {
      const fetcher = createFailingFetcher(new Error("oops"));
      const { result } = renderHook(() => useAsyncItems({ fetcher }));

      // Trigger error
      act(() => {
        result.current.onInputValueChange("test");
      });
      await advanceAndFlush(300);

      expect(result.current.error).toBeDefined();

      // Clear input → error cleared
      act(() => {
        result.current.onInputValueChange("");
      });

      expect(result.current.error).toBeUndefined();
    });

    it("does not fetch for whitespace-only input", async () => {
      const fetcher = createFetcher([]);
      const { result } = renderHook(() => useAsyncItems({ fetcher }));

      act(() => {
        result.current.onInputValueChange("   ");
      });
      await advanceAndFlush(300);

      expect(fetcher).not.toHaveBeenCalled();
      expect(result.current.loading).toBe(false);
    });

    it("sets loading=false when input is empty", async () => {
      const fetcher = createFetcher(["a"], 100);
      const { result } = renderHook(() => useAsyncItems({ fetcher }));

      act(() => {
        result.current.onInputValueChange("test");
      });
      expect(result.current.loading).toBe(true);

      act(() => {
        result.current.onInputValueChange("");
      });
      expect(result.current.loading).toBe(false);
    });
  });

  // =========================================================================
  // Debouncing
  // =========================================================================

  describe("debouncing", () => {
    it("only calls fetcher once for rapid input changes", async () => {
      const fetcher = createFetcher(["result"]);
      const { result } = renderHook(() => useAsyncItems({ fetcher }));

      act(() => {
        result.current.onInputValueChange("a");
      });
      await advanceAndFlush(100);

      act(() => {
        result.current.onInputValueChange("ab");
      });
      await advanceAndFlush(100);

      act(() => {
        result.current.onInputValueChange("abc");
      });
      await advanceAndFlush(300);

      expect(fetcher).toHaveBeenCalledOnce();
      expect(fetcher).toHaveBeenCalledWith("abc", expect.anything());
    });

    it("respects custom debounceMs", async () => {
      const fetcher = createFetcher(["a"]);
      const { result } = renderHook(() => useAsyncItems({ fetcher, debounceMs: 500 }));

      act(() => {
        result.current.onInputValueChange("test");
      });

      // At 300ms (default), not yet called
      await advanceAndFlush(300);
      expect(fetcher).not.toHaveBeenCalled();

      // At 500ms, called
      await advanceAndFlush(200);
      expect(fetcher).toHaveBeenCalledOnce();
    });

    it("clears previous debounce timer on new input", async () => {
      const fetcher = createFetcher(["a"]);
      const { result } = renderHook(() => useAsyncItems({ fetcher }));

      act(() => {
        result.current.onInputValueChange("first");
      });
      await advanceAndFlush(200);

      // Type again before debounce fires
      act(() => {
        result.current.onInputValueChange("second");
      });
      await advanceAndFlush(300);

      expect(fetcher).toHaveBeenCalledOnce();
      expect(fetcher).toHaveBeenCalledWith("second", expect.anything());
    });

    it("does not set up debounce timer for empty input", async () => {
      const fetcher = createFetcher([]);
      const { result } = renderHook(() => useAsyncItems({ fetcher }));

      act(() => {
        result.current.onInputValueChange("");
      });
      await advanceAndFlush(300);

      expect(fetcher).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // Request cancellation
  // =========================================================================

  describe("request cancellation", () => {
    it("passes AbortSignal to fetcher", async () => {
      const fetcher = createFetcher(["a"]);
      const { result } = renderHook(() => useAsyncItems({ fetcher }));

      act(() => {
        result.current.onInputValueChange("test");
      });
      await advanceAndFlush(300);

      expect(fetcher.mock.calls[0][1]).toHaveProperty("signal");
      expect(fetcher.mock.calls[0][1].signal).toBeInstanceOf(AbortSignal);
    });

    it("aborts previous in-flight request when a new query fires", async () => {
      let capturedSignals: AbortSignal[] = [];
      const fetcher = vi.fn(async (_q: string, opts: { signal: AbortSignal }) => {
        capturedSignals.push(opts.signal);
        return new Promise<string[]>((resolve) => {
          setTimeout(() => resolve([_q]), 200);
        });
      });

      const { result } = renderHook(() => useAsyncItems({ fetcher }));

      // First query
      act(() => {
        result.current.onInputValueChange("first");
      });
      await advanceAndFlush(300);

      // Second query (should abort first)
      act(() => {
        result.current.onInputValueChange("second");
      });
      await advanceAndFlush(300);

      expect(capturedSignals[0].aborted).toBe(true);
    });

    it("does not update state from an aborted request", async () => {
      let callIndex = 0;
      const fetcher = vi.fn(async (_: string, opts: { signal: AbortSignal }) => {
        callIndex++;
        const myIndex = callIndex;
        return new Promise<string[]>((resolve, reject) => {
          const timer = setTimeout(
            () => {
              // Simulate: first request resolves slowly
              if (myIndex === 1) {
                resolve(["stale-result"]);
              } else {
                resolve(["fresh-result"]);
              }
            },
            myIndex === 1 ? 500 : 50,
          );

          opts.signal.addEventListener("abort", () => {
            clearTimeout(timer);
            reject(new DOMException("Aborted", "AbortError"));
          });
        });
      });

      const { result } = renderHook(() => useAsyncItems({ fetcher }));

      // First query
      act(() => {
        result.current.onInputValueChange("first");
      });
      await advanceAndFlush(300);

      // Second query (aborts first)
      act(() => {
        result.current.onInputValueChange("second");
      });
      await advanceAndFlush(300);

      // Let the second request complete
      await advanceAndFlush(50);

      expect(result.current.items).toEqual(["fresh-result"]);
    });

    it("aborts in-flight request when input is cleared", async () => {
      let capturedSignal: AbortSignal | null = null;
      const fetcher = vi.fn(async (_q: string, opts: { signal: AbortSignal }) => {
        capturedSignal = opts.signal;
        return new Promise<string[]>((resolve) => {
          setTimeout(() => resolve(["result"]), 500);
        });
      });

      const { result } = renderHook(() => useAsyncItems({ fetcher }));

      act(() => {
        result.current.onInputValueChange("test");
      });
      await advanceAndFlush(300);

      expect(capturedSignal).not.toBeNull();

      act(() => {
        result.current.onInputValueChange("");
      });

      expect(capturedSignal!.aborted).toBe(true);
    });

    it("cancels pending request and clears timeout on unmount", async () => {
      let capturedSignal: AbortSignal | null = null;
      const fetcher = vi.fn(async (_q: string, opts: { signal: AbortSignal }) => {
        capturedSignal = opts.signal;
        return new Promise<string[]>((resolve) => {
          setTimeout(() => resolve(["result"]), 500);
        });
      });

      const { result, unmount } = renderHook(() => useAsyncItems({ fetcher }));

      act(() => {
        result.current.onInputValueChange("test");
      });
      await advanceAndFlush(300);

      unmount();

      expect(capturedSignal!.aborted).toBe(true);
    });
  });

  // =========================================================================
  // Error handling
  // =========================================================================

  describe("error handling", () => {
    it("captures fetcher error in error state", async () => {
      const error = new Error("Network error");
      const fetcher = createFailingFetcher(error);
      const { result } = renderHook(() => useAsyncItems({ fetcher }));

      act(() => {
        result.current.onInputValueChange("test");
      });
      await advanceAndFlush(300);

      expect(result.current.error).toBe(error);
      expect(result.current.items).toEqual([]);
    });

    it("does not set AbortError as error state", async () => {
      const fetcher = vi.fn(async (_q: string, opts: { signal: AbortSignal }) => {
        return new Promise<string[]>((_, reject) => {
          // Simulate an abort happening immediately
          const timer = setTimeout(() => {
            reject(new DOMException("Aborted", "AbortError"));
          }, 50);
          opts.signal.addEventListener("abort", () => {
            clearTimeout(timer);
            reject(new DOMException("Aborted", "AbortError"));
          });
        });
      });

      const { result } = renderHook(() => useAsyncItems({ fetcher }));

      act(() => {
        result.current.onInputValueChange("first");
      });
      await advanceAndFlush(300);

      // Abort by clearing
      act(() => {
        result.current.onInputValueChange("");
      });

      expect(result.current.error).toBeUndefined();
    });

    it("sets loading=false after error", async () => {
      const fetcher = createFailingFetcher(new Error("fail"));
      const { result } = renderHook(() => useAsyncItems({ fetcher }));

      act(() => {
        result.current.onInputValueChange("test");
      });

      expect(result.current.loading).toBe(true);

      await advanceAndFlush(300);

      expect(result.current.loading).toBe(false);
    });

    it("clears error on next successful fetch", async () => {
      let shouldFail = true;
      const fetcher = vi.fn(async (_q: string, _opts: { signal: AbortSignal }) => {
        if (shouldFail) throw new Error("fail");
        return ["success"];
      });

      const { result } = renderHook(() => useAsyncItems({ fetcher }));

      // Error
      act(() => {
        result.current.onInputValueChange("a");
      });
      await advanceAndFlush(300);
      expect(result.current.error).toBeDefined();

      // Success
      shouldFail = false;
      act(() => {
        result.current.onInputValueChange("b");
      });
      await advanceAndFlush(300);

      expect(result.current.error).toBeUndefined();
      expect(result.current.items).toEqual(["success"]);
    });
  });

  // =========================================================================
  // Edge cases
  // =========================================================================

  describe("edge cases", () => {
    it("handles fetcher returning empty array", async () => {
      const fetcher = createFetcher([]);
      const { result } = renderHook(() => useAsyncItems({ fetcher }));

      act(() => {
        result.current.onInputValueChange("test");
      });
      await advanceAndFlush(300);

      expect(result.current.items).toEqual([]);
      expect(result.current.loading).toBe(false);
    });

    it("callback identity is stable across renders", () => {
      const fetcher = createFetcher([]);
      const { result, rerender } = renderHook(() => useAsyncItems({ fetcher }));

      const firstCallback = result.current.onInputValueChange;
      rerender();
      expect(result.current.onInputValueChange).toBe(firstCallback);
    });

    it("uses latest fetcher ref (not stale closure)", async () => {
      const fetcher1 = createFetcher(["from-v1"]);
      const fetcher2 = createFetcher(["from-v2"]);

      let currentFetcher = fetcher1;
      const { result, rerender } = renderHook(() => useAsyncItems({ fetcher: currentFetcher }));

      // Update fetcher before debounce fires
      currentFetcher = fetcher2;
      rerender();

      act(() => {
        result.current.onInputValueChange("test");
      });
      await advanceAndFlush(300);

      expect(fetcher1).not.toHaveBeenCalled();
      expect(fetcher2).toHaveBeenCalledOnce();
    });

    it("works with object items", async () => {
      interface Item {
        id: number;
        name: string;
      }
      const items: Item[] = [
        { id: 1, name: "Alpha" },
        { id: 2, name: "Beta" },
      ];
      const fetcher = createFetcher(items);
      const { result } = renderHook(() => useAsyncItems<Item>({ fetcher }));

      act(() => {
        result.current.onInputValueChange("test");
      });
      await advanceAndFlush(300);

      expect(result.current.items).toEqual(items);
      expect(result.current.items[0].name).toBe("Alpha");
    });
  });
});
