import { useState, useRef, useEffect, useCallback } from "react";

const DEFAULT_DEBOUNCE_MS = 300;

/**
 * A function that fetches items for a given query string.
 *
 * Receives an `AbortSignal` that is aborted when a newer request supersedes
 * this one — pass it through to `fetch()` so the browser cancels the
 * in-flight HTTP request automatically.
 */
export type AsyncFetcherFn<T> = (query: string, options: { signal: AbortSignal }) => Promise<T[]>;

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
 *   const res = await fetch(`/api/search?q=${query}`, { signal });
 *   return res.json();
 * }
 *
 * // Object with custom debounce
 * fetcher: {
 *   fn: async (query, { signal }) => {
 *     const res = await fetch(`/api/search?q=${query}`, { signal });
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
   *   const res = await fetch(`/api/search?q=${query}`, { signal });
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
}

export interface UseAsyncItemsReturn<T> {
  /** Fetched items — pass to the Root `items` prop */
  items: T[];
  /** Whether a fetch is currently in-flight */
  loading: boolean;
  /** Current input query string */
  query: string;
  /** The error thrown by the last fetch, if any */
  error: unknown;
  /** Input change handler — pass to the Root `onInputValueChange` prop */
  onInputValueChange: (value: string) => void;
}

/**
 * Shared hook for async item fetching with debounce and request cancellation.
 *
 * Used internally by `Combobox.useAsync` and `Autocomplete.useAsync`.
 * Pass `filter={null}` to the Root component to disable internal filtering
 * since items are already filtered by the remote source.
 */
export function useAsyncItems<T>({ fetcher }: UseAsyncItemsOptions<T>): UseAsyncItemsReturn<T> {
  const { fn: fetcherFn, debounceMs } = resolveAsyncFetcher(fetcher);
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [error, setError] = useState<unknown>(undefined);
  const abortControllerRef = useRef<AbortController | null>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep fetcher in a ref so the callback identity stays stable
  const fetcherRef = useRef(fetcherFn);
  fetcherRef.current = fetcherFn;

  const onInputValueChange = useCallback(
    (value: string) => {
      setQuery(value);

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }

      if (value.trim().length === 0) {
        abortControllerRef.current?.abort();
        abortControllerRef.current = null;
        setItems([]);
        setError(undefined);
        setLoading(false);
        return;
      }

      setLoading(true);

      debounceTimerRef.current = setTimeout(async () => {
        abortControllerRef.current?.abort();
        const controller = new AbortController();
        abortControllerRef.current = controller;

        try {
          const result = await fetcherRef.current(value.trim(), {
            signal: controller.signal,
          });
          if (!controller.signal.aborted) {
            setItems(result);
            setError(undefined);
          }
        } catch (e) {
          if (e instanceof DOMException && e.name === "AbortError") return;
          if (!controller.signal.aborted) {
            setItems([]);
            setError(e);
          }
        } finally {
          if (!controller.signal.aborted) {
            setLoading(false);
          }
        }
      }, debounceMs);
    },
    [debounceMs],
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      abortControllerRef.current?.abort();
    };
  }, []);

  return { items, loading, query, error, onInputValueChange };
}
