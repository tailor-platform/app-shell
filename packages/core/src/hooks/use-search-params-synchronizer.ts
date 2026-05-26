import { useCallback, useEffect, useRef } from "react";
import { useSearchParams } from "react-router";
import type {
  CollectionSnapshot,
  CollectionStateSynchronizer,
  Filter,
  SortState,
} from "@/types/collection";

const KEY_PAGE_SIZE = "p";
const KEY_SORT = "s";
const FILTER_PREFIX = "f.";

export interface UseSearchParamsSynchronizerOptions {
  /** Key prefix to avoid collisions when multiple tables share a page. */
  prefix?: string;
  /** Debounce interval in ms for URL writes. Default: no debounce. */
  debounceMs?: number;
}

/**
 * Synchronizer hook that persists collection state to URL search params.
 *
 * URL format:
 * - Page size: `p=20`
 * - Sort: `s=name:asc`
 * - Filters: `f.field:operator=value` (repeated params for multi-value)
 *
 * @example
 * ```tsx
 * const synchronizer = useSearchParamsSynchronizer();
 * const { variables, control } = useCollectionVariables({
 *   params: { pageSize: 20 },
 *   synchronizer,
 * });
 * ```
 */
export function useSearchParamsSynchronizer(
  options: UseSearchParamsSynchronizerOptions = {},
): CollectionStateSynchronizer {
  const { prefix = "", debounceMs } = options;
  const [searchParams, setSearchParams] = useSearchParams();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onChangeRef = useRef<((snapshot: CollectionSnapshot | undefined) => void) | null>(null);
  const isInternalWriteRef = useRef(false);

  const prefixedKey = useCallback((key: string) => (prefix ? `${prefix}.${key}` : key), [prefix]);

  // Notify subscriber when searchParams change externally (e.g. popstate)
  useEffect(() => {
    if (isInternalWriteRef.current) {
      isInternalWriteRef.current = false;
      return;
    }
    if (onChangeRef.current) {
      onChangeRef.current(readFromParams(searchParams, prefixedKey));
    }
  }, [searchParams, prefixedKey]);

  const subscribe = useCallback(
    (onChange: (snapshot: CollectionSnapshot | undefined) => void): (() => void) => {
      onChangeRef.current = onChange;
      // Immediately emit current state (BehaviorSubject style)
      onChange(readFromParams(searchParams, prefixedKey));
      return () => {
        onChangeRef.current = null;
      };
    },
    [searchParams, prefixedKey],
  );

  const write = useCallback(
    (state: Required<CollectionSnapshot>): void => {
      const doWrite = () => {
        isInternalWriteRef.current = true;
        const pageSizeKey = prefixedKey(KEY_PAGE_SIZE);
        const sortKey = prefixedKey(KEY_SORT);
        const filterPrefix = prefixedKey(FILTER_PREFIX);

        setSearchParams(
          (prev) => {
            const next = new URLSearchParams(prev);

            // Page size
            if (state.pageSize) {
              next.set(pageSizeKey, String(state.pageSize));
            } else {
              next.delete(pageSizeKey);
            }

            // Sort
            if (state.sort && state.sort.length > 0) {
              const { field, direction } = state.sort[0];
              next.set(sortKey, `${field}:${direction === "Desc" ? "desc" : "asc"}`);
            } else {
              next.delete(sortKey);
            }

            // Clear existing filters with this prefix
            for (const key of Array.from(next.keys())) {
              if (key.startsWith(filterPrefix)) next.delete(key);
            }

            // Write filters
            if (state.filters) {
              for (const filter of state.filters) {
                const key = `${filterPrefix}${filter.field}:${filter.operator}`;
                if (Array.isArray(filter.value)) {
                  for (const v of filter.value) {
                    const encoded = stringifyPrimitive(v);
                    if (encoded !== "") next.append(key, encoded);
                  }
                } else if (filter.value != null && filter.value !== "") {
                  next.set(key, encodeFilterValue(filter.value));
                }
              }
            }

            return next;
          },
          { replace: true },
        );
      };

      if (debounceMs != null && debounceMs > 0) {
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(doWrite, debounceMs);
      } else {
        doWrite();
      }
    },
    [prefixedKey, setSearchParams, debounceMs],
  );

  return { subscribe, write };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function readFromParams(
  searchParams: URLSearchParams,
  prefixedKey: (key: string) => string,
): CollectionSnapshot | undefined {
  const pageSizeKey = prefixedKey(KEY_PAGE_SIZE);
  const sortKey = prefixedKey(KEY_SORT);
  const filterPrefix = prefixedKey(FILTER_PREFIX);

  let hasAny = false;
  const snapshot: CollectionSnapshot = {};

  // Page size
  const pageSize = searchParams.get(pageSizeKey);
  if (pageSize) {
    const n = Number(pageSize);
    if (Number.isFinite(n) && n > 0) {
      snapshot.pageSize = n;
      hasAny = true;
    }
  }

  // Sort
  const sort = searchParams.get(sortKey);
  if (sort) {
    const [field, rawDir] = sort.split(":");
    if (field) {
      const direction = rawDir === "desc" ? "Desc" : "Asc";
      snapshot.sort = [{ field, direction } as SortState];
      hasAny = true;
    }
  }

  // Filters
  const filterKeys = new Set<string>();
  for (const key of searchParams.keys()) {
    if (key.startsWith(filterPrefix)) filterKeys.add(key);
  }
  if (filterKeys.size > 0) {
    const filters: Filter[] = [];
    for (const key of filterKeys) {
      const values = searchParams.getAll(key).filter((v) => v !== "");
      if (values.length === 0) continue;
      const remainder = key.slice(filterPrefix.length);
      const [field, operator] = remainder.split(":");
      if (!field || !operator) continue;
      filters.push({
        field,
        operator: operator as Filter["operator"],
        value: values.length === 1 ? parseFilterValue(values[0]) : values.map(parseFilterValue),
      });
    }
    if (filters.length > 0) {
      snapshot.filters = filters;
      hasAny = true;
    }
  }

  return hasAny ? snapshot : undefined;
}

function parseFilterValue(raw: string): unknown {
  if (raw.startsWith("{") || raw.startsWith("[")) {
    try {
      return JSON.parse(raw);
    } catch {
      return raw;
    }
  }
  return raw;
}

function encodeFilterValue(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "object") return JSON.stringify(value);
  return stringifyPrimitive(value);
}

function stringifyPrimitive(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean" || typeof value === "bigint") {
    return value.toString();
  }
  if (value == null) return "";
  return JSON.stringify(value);
}
