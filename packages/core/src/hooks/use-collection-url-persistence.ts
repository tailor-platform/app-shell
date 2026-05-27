import { useCallback, useMemo, useRef } from "react";
import { useSearchParams } from "react-router";
import type { CollectionSnapshot, Filter, SortState } from "@/types/collection";

const KEY_PAGE_SIZE = "p";
const KEY_SORT = "s";
const FILTER_PREFIX = "f.";

export interface UseCollectionURLStateOptions {
  /** Key prefix to avoid collisions when multiple tables share a page. */
  prefix?: string;
  /** Debounce interval in ms for URL writes. Default: no debounce. */
  debounceMs?: number;
}

/**
 * Accessor object returned by `useCollectionURLState`.
 *
 * - `read()` returns params-compatible initial state parsed from the URL.
 * - `write()` encodes collection state into URL search params.
 *
 * Designed to be wired directly into `useCollectionVariables`:
 * ```tsx
 * const urlState = useCollectionURLState();
 * const { variables, control } = useCollectionVariables({
 *   params: urlState.read(),
 *   onChange: urlState.write,
 * });
 * ```
 */
export interface CollectionURLStateAccessor<TFieldName extends string = string> {
  /** Parse current URL search params into initial state for `params`. */
  read(): {
    initialFilters?: Filter<TFieldName>[];
    initialSort?: SortState[];
    pageSize?: number;
  };
  /** Encode collection state into URL search params. Suitable for `onChange`. */
  write: (state: CollectionSnapshot<TFieldName>) => void;
}

/**
 * Hook that provides read/write access to collection state stored in URL search params.
 *
 * URL format:
 * - Page size: `p=20`
 * - Sort: `s=name:asc`
 * - Filters: `f.field:operator=value` (repeated params for multi-value)
 *
 * @example
 * ```tsx
 * const urlState = useCollectionURLState();
 * const { variables, control } = useCollectionVariables({
 *   params: urlState.read(),
 *   onChange: urlState.write,
 * });
 * ```
 */
export function useCollectionURLState<TFieldName extends string = string>(
  options: UseCollectionURLStateOptions = {},
): CollectionURLStateAccessor<TFieldName> {
  const { prefix = "", debounceMs } = options;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const prefixedKey = useCallback((key: string) => (prefix ? `${prefix}.${key}` : key), [prefix]);

  const read = useCallback((): {
    initialFilters?: Filter<TFieldName>[];
    initialSort?: SortState[];
    pageSize?: number;
  } => {
    const snapshot = readFromParams<TFieldName>(searchParams, prefixedKey);
    if (!snapshot) return {};
    return {
      initialFilters: snapshot.filters,
      initialSort: snapshot.sort,
      pageSize: snapshot.pageSize,
    };
  }, [searchParams, prefixedKey]);

  const write = useCallback(
    (state: CollectionSnapshot<TFieldName>): void => {
      const doWrite = () => {
        setSearchParams(
          (currentParams) => {
            const params = new URLSearchParams(currentParams);
            const pageSizeKey = prefixedKey(KEY_PAGE_SIZE);
            const sortKey = prefixedKey(KEY_SORT);
            const filterPrefix = prefixedKey(FILTER_PREFIX);

            // Page size
            if (state.pageSize) {
              params.set(pageSizeKey, String(state.pageSize));
            } else {
              params.delete(pageSizeKey);
            }

            // Sort
            if (state.sort && state.sort.length > 0) {
              const { field, direction } = state.sort[0];
              params.set(sortKey, `${field}:${direction === "Desc" ? "desc" : "asc"}`);
            } else {
              params.delete(sortKey);
            }

            // Clear existing filters with this prefix
            for (const key of Array.from(params.keys())) {
              if (key.startsWith(filterPrefix)) params.delete(key);
            }

            // Write filters
            if (state.filters) {
              for (const filter of state.filters) {
                const key = `${filterPrefix}${filter.field}:${filter.operator}`;
                if (Array.isArray(filter.value)) {
                  for (const v of filter.value) {
                    const encoded = stringifyPrimitive(v);
                    if (encoded !== "") params.append(key, encoded);
                  }
                } else if (filter.value != null && filter.value !== "") {
                  params.set(key, encodeFilterValue(filter.value));
                }
              }
            }

            return params;
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
    [prefixedKey, debounceMs, setSearchParams],
  );

  return useMemo(() => ({ read, write }), [read, write]);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Partial snapshot used internally for URL parsing (fields may be absent). */
interface ParsedSnapshot<TFieldName extends string = string> {
  filters?: Filter<TFieldName>[];
  sort?: SortState[];
  pageSize?: number;
}

function readFromParams<TFieldName extends string = string>(
  searchParams: URLSearchParams,
  prefixedKey: (key: string) => string,
): ParsedSnapshot<TFieldName> | undefined {
  const pageSizeKey = prefixedKey(KEY_PAGE_SIZE);
  const sortKey = prefixedKey(KEY_SORT);
  const filterPrefix = prefixedKey(FILTER_PREFIX);

  let hasAny = false;
  const snapshot: ParsedSnapshot<TFieldName> = {};

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
    const filters: Filter<TFieldName>[] = [];
    for (const key of filterKeys) {
      const values = searchParams.getAll(key).filter((v) => v !== "");
      if (values.length === 0) continue;
      const remainder = key.slice(filterPrefix.length);
      const [field, operator] = remainder.split(":");
      if (!field || !operator) continue;
      filters.push({
        field: field as TFieldName,
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
