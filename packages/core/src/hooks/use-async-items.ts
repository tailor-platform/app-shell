import { useState, useRef, useEffect, useCallback } from "react";

const DEFAULT_DEBOUNCE_MS = 300;

export interface UseAsyncItemsOptions<T> {
  /**
   * Fetch items for the given query string.
   *
   * Receives an `AbortSignal` that is aborted when a newer request supersedes
   * this one — pass it through to `fetch()` so the browser cancels the
   * in-flight HTTP request automatically.
   *
   * @example
   * ```tsx
   * fetcher: async (query, { signal }) => {
   *   const res = await fetch(`/api/search?q=${query}`, { signal });
   *   return res.json();
   * }
   * ```
   */
  fetcher: (query: string, options: { signal: AbortSignal }) => Promise<T[]>;
  /** Debounce delay in milliseconds. @default 300 */
  debounceMs?: number;
}

export interface UseAsyncItemsReturn<T> {
  /** Fetched items — pass to the Root `items` prop */
  items: T[];
  /** Whether a fetch is currently in-flight */
  loading: boolean;
  /** Current input query string */
  query: string;
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
export function useAsyncItems<T>({
  fetcher,
  debounceMs = DEFAULT_DEBOUNCE_MS,
}: UseAsyncItemsOptions<T>): UseAsyncItemsReturn<T> {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const abortControllerRef = useRef<AbortController | null>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep fetcher in a ref so the callback identity stays stable
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

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
          }
        } catch (e) {
          if (e instanceof DOMException && e.name === "AbortError") return;
          if (!controller.signal.aborted) {
            setItems([]);
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

  return { items, loading, query, onInputValueChange };
}
