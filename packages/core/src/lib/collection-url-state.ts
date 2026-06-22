import { useSearchParams } from "react-router";
import {
  OPERATORS_BY_FILTER_TYPE,
  fieldTypeToFilterConfig,
  fieldTypeToSortConfig,
  type CollectionInitialState,
  type CollectionPersistedState,
  type Filter,
  type TableFieldName,
  type TableMetadata,
  type TableMetadataFilter,
  type UseCollectionOptions,
} from "@/types/collection";

const KEY_PAGE_SIZE = "p";
const KEY_SORT = "s";
const FILTER_PREFIX = "f.";

/**
 * Setter shape compatible with `useSearchParams()`.
 */
export type SearchParamsBinding = readonly [
  URLSearchParams,
  (
    next: URLSearchParams | ((prev: URLSearchParams) => URLSearchParams),
    options?: { replace?: boolean },
  ) => void,
];

function isValidSortField(tableMetadata: TableMetadata | undefined, field: string): boolean {
  if (!tableMetadata) return true;
  const metadataField = tableMetadata.fields.find((candidate) => candidate.name === field);
  return !!metadataField && !!fieldTypeToSortConfig(metadataField.name, metadataField.type);
}

function isValidFilter(
  tableMetadata: TableMetadata | undefined,
  field: string,
  operator: string,
): boolean {
  if (!tableMetadata) return true;
  const metadataField = tableMetadata.fields.find((candidate) => candidate.name === field);
  if (!metadataField) return false;

  const filterConfig = fieldTypeToFilterConfig(
    metadataField.name,
    metadataField.type,
    metadataField.enumValues,
  );
  if (!filterConfig) return false;

  return OPERATORS_BY_FILTER_TYPE[filterConfig.type].includes(operator as never);
}

/**
 * Parse URL search params into collection state.
 */
export function parseCollectionSearchParams<const TTable extends TableMetadata>(
  tableMetadata: TTable,
  params: URLSearchParams,
): CollectionInitialState<TableFieldName<TTable>, TableMetadataFilter<TTable>>;
export function parseCollectionSearchParams(params: URLSearchParams): CollectionInitialState;
export function parseCollectionSearchParams(
  tableMetadataOrParams: TableMetadata | URLSearchParams,
  maybeParams?: URLSearchParams,
): CollectionInitialState {
  const tableMetadata = maybeParams ? (tableMetadataOrParams as TableMetadata) : undefined;
  const params = maybeParams ?? (tableMetadataOrParams as URLSearchParams);
  const nextState: CollectionInitialState = {};

  const pageSize = params.get(KEY_PAGE_SIZE);
  if (pageSize) {
    const n = Number(pageSize);
    if (Number.isFinite(n) && n > 0) nextState.pageSize = n;
  }

  const sort = params.get(KEY_SORT);
  if (sort) {
    const [field, rawDir] = sort.split(":");
    if (field && isValidSortField(tableMetadata, field)) {
      nextState.sortStates = [{ field, direction: rawDir === "desc" ? "Desc" : "Asc" }];
    }
  }

  const nextFilters: Filter[] = [];
  for (const [key, value] of params.entries()) {
    if (!key.startsWith(FILTER_PREFIX) || !value) continue;
    const [field, operator] = key.slice(FILTER_PREFIX.length).split(":");
    if (!field || !operator || !isValidFilter(tableMetadata, field, operator)) continue;
    nextFilters.push({
      field,
      operator: operator as Filter["operator"],
      value: decodeFilterValue(value),
    });
  }
  if (nextFilters.length > 0) nextState.filters = nextFilters;

  return nextState;
}

/**
 * Apply collection state to a URLSearchParams.
 */
export function writeCollectionSearchParams<
  TFieldName extends string,
  TFilter extends Filter<TFieldName>,
>(prev: URLSearchParams, state: CollectionPersistedState<TFieldName, TFilter>): URLSearchParams {
  const next = new URLSearchParams(prev);

  if (state.pageSize) {
    next.set(KEY_PAGE_SIZE, String(state.pageSize));
  } else {
    next.delete(KEY_PAGE_SIZE);
  }

  if (state.sortStates.length > 0) {
    const { field, direction } = state.sortStates[0];
    next.set(KEY_SORT, `${field}:${direction === "Desc" ? "desc" : "asc"}`);
  } else {
    next.delete(KEY_SORT);
  }

  // Snapshot keys before iterating — we delete entries during the loop.
  // eslint-disable-next-line unicorn/no-useless-spread
  for (const key of [...next.keys()]) {
    if (key.startsWith(FILTER_PREFIX)) next.delete(key);
  }
  for (const filter of state.filters) {
    next.set(`${FILTER_PREFIX}${filter.field}:${filter.operator}`, encodeFilterValue(filter.value));
  }

  // Bail out if nothing changed — avoids a no-op navigation that could still
  // trigger re-renders in some react-router versions. Compare on a sorted
  // snapshot rather than `.toString()`: the filter rebuild above is delete-
  // then-set, so key order can shift between renders even when the param
  // multiset is identical (and `.toString()` is additionally sensitive to
  // `&`/`=` characters inside values).
  if (stableQueryString(next) === stableQueryString(prev)) return prev;
  return next;
}

/**
 * Decorate `useCollectionVariables` options with URL-backed collection state.
 */
export function withURLCollectionState<const TTable extends TableMetadata>(
  options: UseCollectionOptions<TableFieldName<TTable>, TableMetadataFilter<TTable>> & {
    tableMetadata: TTable;
  },
  [searchParams, setSearchParams]: SearchParamsBinding,
): UseCollectionOptions<TableFieldName<TTable>, TableMetadataFilter<TTable>> & {
  tableMetadata: TTable;
};
export function withURLCollectionState(
  options: UseCollectionOptions & {
    tableMetadata?: never;
  },
  [searchParams, setSearchParams]: SearchParamsBinding,
): UseCollectionOptions;
export function withURLCollectionState(
  options: UseCollectionOptions & { tableMetadata?: TableMetadata },
  searchParamsBinding: SearchParamsBinding,
): UseCollectionOptions & { tableMetadata?: TableMetadata } {
  return applyURLCollectionState(options, searchParamsBinding);
}

function applyURLCollectionState(
  options: UseCollectionOptions & { tableMetadata?: TableMetadata },
  [searchParams, setSearchParams]: SearchParamsBinding,
): UseCollectionOptions & { tableMetadata?: TableMetadata } {
  const initialState = options.tableMetadata
    ? parseCollectionSearchParams(options.tableMetadata, searchParams)
    : parseCollectionSearchParams(searchParams);

  return {
    ...options,
    initialState: {
      ...options.initialState,
      ...initialState,
    },
    saver: {
      save(state) {
        options.saver?.save(state);
        setSearchParams((prev) => writeCollectionSearchParams(prev, state), { replace: true });
      },
    },
  };
}

/**
 * Hook version of `withURLCollectionState()` that binds the current router
 * search params.
 */
export function useURLCollectionState<const TTable extends TableMetadata>(
  options: UseCollectionOptions<TableFieldName<TTable>, TableMetadataFilter<TTable>> & {
    tableMetadata: TTable;
  },
): UseCollectionOptions<TableFieldName<TTable>, TableMetadataFilter<TTable>> & {
  tableMetadata: TTable;
};
export function useURLCollectionState(
  options: UseCollectionOptions & {
    tableMetadata?: never;
  },
): UseCollectionOptions;
export function useURLCollectionState(
  options: UseCollectionOptions & { tableMetadata?: TableMetadata },
): UseCollectionOptions & { tableMetadata?: TableMetadata } {
  return applyURLCollectionState(options, useSearchParams());
}

/**
 * Encodes a filter value for URL storage.
 * - Arrays are JSON-encoded to avoid ambiguity with values that contain commas.
 * - Objects are JSON-encoded.
 * - Primitives are stringified directly.
 */
export function encodeFilterValue(value: unknown): string {
  // Arrays use JSON so that individual elements containing commas are preserved
  // correctly during round-trip (encode → decode).
  if (Array.isArray(value)) return JSON.stringify(value.map((v) => stringifyPrimitive(v)));
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

/**
 * Decodes a filter value from URL storage.
 * - JSON arrays are parsed back into arrays.
 * - JSON objects are parsed back into objects (e.g. the `between` operator's
 *   `{ min, max }` shape).
 * - All other values — including numeric/boolean-looking strings such as `"5"`
 *   or `"true"` — are returned as plain strings, preserving the string-vs-
 *   numeric distinction that operator implementations rely on.
 */
export function decodeFilterValue(raw: string): unknown {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
    // Objects (e.g. a `between` filter's `{ min, max }`) are JSON-encoded by
    // encodeFilterValue and must be decoded back here; without this, object-
    // valued filters round-trip to a raw string on reload and silently break.
    if (parsed && typeof parsed === "object") return parsed;
  } catch {
    // Not valid JSON — fall through to plain string
  }
  return raw;
}

/**
 * Order-insensitive, unambiguous snapshot of a URLSearchParams for equality
 * checks. Entries are sorted by key then value so a reordered-but-equivalent
 * param set compares equal, and the pairs are JSON-encoded so a key or value
 * containing `&`/`=` can't collide with the entry boundary the way a re-joined
 * query string would (e.g. `[["a","x"],["b","y"]]` vs `[["a","x&b=y"]]`).
 */
function stableQueryString(sp: URLSearchParams): string {
  return JSON.stringify(
    Array.from(sp.entries()).toSorted(
      ([ak, av], [bk, bv]) => ak.localeCompare(bk) || av.localeCompare(bv),
    ),
  );
}
