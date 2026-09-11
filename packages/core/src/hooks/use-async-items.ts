import { useState, useRef, useEffect, useCallback } from "react";

const DEFAULT_DEBOUNCE_MS = 300;

/**
 * A function that fetches items for a given query string.
 *
 * Receives an `AbortSignal` that is aborted when a newer request supersedes
 * this one — pass it through to `fetch()` so the browser cancels the
 * in-flight HTTP request automatically.
 *
 * **Error handling:** If the fetcher throws or rejects, the component renders
 * a built-in inline error state (with a Retry affordance) in place of the
 * empty state — the failure is no longer silently swallowed. Aborted/superseded
 * requests are ignored. To run a side effect on failure (logging, error
 * tracking, a toast), pass `onFetchError`; it fires once per outage rather
 * than once per failed keystroke.
 *
 * The `query` parameter is `null` when the user has not typed anything
 * (e.g. the dropdown was just opened). Return initial / default items
 * for `null`, or return an empty array to show nothing until the user
 * starts typing.
 */
export type AsyncFetcherFn<T> = (
  query: string | null,
  options: { signal: AbortSignal },
) => Promise<T[]>;

/**
 * Fetcher specification for async item loading.
 *
 * Can be either:
 * - A plain function — uses the default debounce delay (300ms)
 * - An object with `fn` and `debounceMs` — uses the specified debounce delay
 *
 * @example
 * ```tsx
 * // Plain function (default 300ms debounce)
 * fetcher: async (query, { signal }) => {
 *   const res = await fetch(`/api/search?q=${query ?? ""}`, { signal });
 *   return res.json();
 * }
 *
 * // Object with custom debounce
 * fetcher: {
 *   fn: async (query, { signal }) => {
 *     const res = await fetch(`/api/search?q=${query ?? ""}`, { signal });
 *     return res.json();
 *   },
 *   debounceMs: 500,
 * }
 * ```
 */
export type AsyncFetcher<T> = AsyncFetcherFn<T> | { fn: AsyncFetcherFn<T>; debounceMs: number };

function resolveAsyncFetcher<T>(fetcher: AsyncFetcher<T>): {
  fn: AsyncFetcherFn<T>;
  debounceMs: number;
} {
  if (typeof fetcher === "function") {
    return { fn: fetcher, debounceMs: DEFAULT_DEBOUNCE_MS };
  }
  return fetcher;
}

export interface UseAsyncItemsOptions<T> {
  /**
   * Fetcher for async item loading.
   *
   * Pass a plain function to use the default debounce delay (300ms),
   * or an object `{ fn, debounceMs }` to control the debounce timing.
   *
   * @example
   * ```tsx
   * // Plain function
   * fetcher: async (query, { signal }) => {
   *   const res = await fetch(`/api/search?q=${query ?? ""}`, { signal });
   *   return res.json();
   * }
   *
   * // With custom debounce
   * fetcher: {
   *   fn: async (query, { signal }) => { ... },
   *   debounceMs: 500,
   * }
   * ```
   */
  fetcher: AsyncFetcher<T>;
  /**
   * Called when a fetch fails (the fetcher throws or rejects with something
   * other than an abort of a superseded request).
   *
   * Fires **once per outage** — i.e. on the transition into the error state,
   * not on every failed keystroke — and re-arms after the next successful
   * fetch. Use it for side effects like logging or error tracking; the inline
   * error state is rendered regardless.
   */
  onFetchError?: (error: unknown) => void;
}

type PendingRequest = {
  id: number;
  query: string | null;
  debounce: boolean;
};

export interface UseAsyncItemsReturn<T> {
  /** Fetched items — pass to the Root `items` prop */
  items: T[];
  /** Whether a fetch is currently in-flight */
  loading: boolean;
  /** Current input query string */
  query: string;
  /** The error thrown by the last fetch, if any */
  error: unknown;
  /** Re-runs the most recent fetch immediately (no debounce). Use for a Retry affordance. */
  retry: () => void;
  /** Input change handler — pass to the Root `onInputValueChange` prop */
  onInputValueChange: (value: string) => void;
  /** Open change handler — pass to the Root `onOpenChange` prop to fetch initial items on open */
  onOpenChange: (open: boolean) => void;
}

/**
 * Shared hook for async item fetching with debounce and request cancellation.
 *
 * Used internally by `Combobox.useAsync` and `Autocomplete.useAsync`.
 * Pass `filter={null}` to the Root component to disable internal filtering
 * since items are already filtered by the remote source.
 */
export function useAsyncItems<T>({
  fetcher,
  onFetchError,
}: UseAsyncItemsOptions<T>): UseAsyncItemsReturn<T> {
  const { fn: fetcherFn, debounceMs } = resolveAsyncFetcher(fetcher);
  const [items, setItems] = useState<T[]>([]);
  const [query, setQuery] = useState("");
  const [error, setError] = useState<unknown>(undefined);
  const [request, setRequest] = useState<PendingRequest | null>(null);
  const [lastFetchQuery, setLastFetchQuery] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const activeRequestIdRef = useRef<number | null>(null);
  const nextRequestIdRef = useRef(0);
  // Whether we are currently in an error state, so onFetchError fires once per
  // outage (on the failing->error transition) rather than per failed keystroke.
  const inErrorStateRef = useRef(false);
  const hasFetchedOnOpenRef = useRef(false);

  const scheduleFetch = useCallback((fetchQuery: string | null, debounce: boolean) => {
    abortControllerRef.current?.abort();
    setLastFetchQuery(fetchQuery);
    setRequest({ id: ++nextRequestIdRef.current, query: fetchQuery, debounce });
  }, []);

  // The request descriptor is React state; this effect owns its timer/network
  // lifecycle. A changed fetcher restarts only a still-debouncing request.
  useEffect(() => {
    if (!request || activeRequestIdRef.current === request.id) return;

    const run = async () => {
      const controller = new AbortController();
      abortControllerRef.current = controller;
      activeRequestIdRef.current = request.id;

      try {
        const result = await fetcherFn(request.query, { signal: controller.signal });
        if (controller.signal.aborted || activeRequestIdRef.current !== request.id) return;
        setItems(result);
        setError(undefined);
        inErrorStateRef.current = false;
      } catch (caught) {
        if (caught instanceof DOMException && caught.name === "AbortError") return;
        if (controller.signal.aborted || activeRequestIdRef.current !== request.id) return;
        setItems([]);
        setError(caught);
        // Announce the outage only on the transition into the error state.
        if (!inErrorStateRef.current) {
          inErrorStateRef.current = true;
          onFetchError?.(caught);
        }
      } finally {
        if (activeRequestIdRef.current === request.id) {
          activeRequestIdRef.current = null;
          setRequest((current) => (current?.id === request.id ? null : current));
        }
      }
    };

    const timer = request.debounce ? setTimeout(run, debounceMs) : undefined;
    if (!timer) void run();
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [debounceMs, fetcherFn, onFetchError, request]);

  const retry = useCallback(() => {
    scheduleFetch(lastFetchQuery, false);
  }, [lastFetchQuery, scheduleFetch]);

  const onInputValueChange = useCallback(
    (value: string) => {
      setQuery(value);
      scheduleFetch(value.trim() || null, value.trim().length > 0);
    },
    [scheduleFetch],
  );

  const onOpenChange = useCallback(
    (open: boolean) => {
      if (open && !hasFetchedOnOpenRef.current) {
        hasFetchedOnOpenRef.current = true;
        scheduleFetch(null, false);
      }
    },
    [scheduleFetch],
  );

  // Cleanup the active external request on unmount.
  useEffect(() => () => abortControllerRef.current?.abort(), []);

  return {
    items,
    loading: request !== null,
    query,
    error,
    retry,
    onInputValueChange,
    onOpenChange,
  };
}
