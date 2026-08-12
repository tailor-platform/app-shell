import { useSearchParams } from "react-router";
import { useCollectionVariables } from "@/hooks/use-collection-variables";
import {
  OPERATORS_BY_FILTER_TYPE,
  fieldTypeToFilterConfig,
  fieldTypeToSortConfig,
  type CollectionInitialState,
  type CollectionPersistedState,
  type CollectionVariables,
  type FieldType,
  type FieldTypeToFilterConfigOptions,
  type Filter,
  type FilterConfig,
  type FilterPolicy,
  type TableFieldName,
  type TableMetadata,
  type TableMetadataFilter,
  type TypedCollectionVariables,
  type UseCollectionOptions,
  type UseCollectionReturn,
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

function resolveFilterConfig(
  tableMetadata: TableMetadata | undefined,
  field: string,
  filterPolicy?: FilterPolicy,
): FilterConfig | undefined {
  if (!tableMetadata) return undefined;
  const metadataField = tableMetadata.fields.find((candidate) => candidate.name === field);
  if (!metadataField) return undefined;
  return fieldTypeToFilterConfig(metadataField.name, metadataField.type, metadataField.enumValues, {
    filterPolicy,
  });
}

function isValidFilter(
  tableMetadata: TableMetadata | undefined,
  field: string,
  operator: string,
  filterPolicy?: FilterPolicy,
): boolean {
  if (!tableMetadata) return true;
  const filterConfig = resolveFilterConfig(tableMetadata, field, filterPolicy);
  if (!filterConfig) return false;

  const allowedOperators = filterConfig.operators ?? OPERATORS_BY_FILTER_TYPE[filterConfig.type];
  return allowedOperators.includes(operator as never);
}

/** Look up a field's metadata-declared type, if metadata is available. */
function fieldTypeOf(
  tableMetadata: TableMetadata | undefined,
  field: string,
): FieldType | undefined {
  return tableMetadata?.fields.find((candidate) => candidate.name === field)?.type;
}

/**
 * Coerce a single decoded scalar to the field's declared metadata type.
 *
 * `decodeFilterValue` intentionally returns numeric-/boolean-looking values as
 * strings (it can't know the intended type on its own). When table metadata is
 * available we *do* know the type, so we restore it here — otherwise a number
 * field's `gt`/`eq`/… value round-trips from the URL as a string and silently
 * fails any type-aware comparison (and contradicts `TypedCollectionVariables`,
 * which declares these as `number`/`boolean`).
 */
function coerceScalarToFieldType(type: FieldType, value: unknown): unknown {
  if (typeof value !== "string") return value;
  switch (type) {
    case "number": {
      const n = Number(value);
      return Number.isFinite(n) ? n : value;
    }
    case "boolean": {
      if (value === "true") return true;
      if (value === "false") return false;
      return value;
    }
    default:
      return value;
  }
}

/**
 * Coerce a decoded filter value to the field's declared type, descending into
 * `in`/`nin` arrays and `between` `{ min, max }` objects.
 */
function coerceFilterValueToFieldType(type: FieldType, value: unknown): unknown {
  if (Array.isArray(value)) return value.map((item) => coerceScalarToFieldType(type, item));
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, coerceScalarToFieldType(type, item)]),
    );
  }
  return coerceScalarToFieldType(type, value);
}

/**
 * Parse URL search params into collection state.
 */
export function parseCollectionSearchParams<const TTable extends TableMetadata>(
  tableMetadata: TTable,
  params: URLSearchParams,
  options?: FieldTypeToFilterConfigOptions,
): CollectionInitialState<TableFieldName<TTable>, TableMetadataFilter<TTable>>;
export function parseCollectionSearchParams(params: URLSearchParams): CollectionInitialState;
export function parseCollectionSearchParams(
  tableMetadataOrParams: TableMetadata | URLSearchParams,
  maybeParamsOrOptions?: URLSearchParams | FieldTypeToFilterConfigOptions,
  maybeOptions?: FieldTypeToFilterConfigOptions,
): CollectionInitialState {
  const hasMetadata = maybeParamsOrOptions instanceof URLSearchParams;
  const tableMetadata = hasMetadata ? (tableMetadataOrParams as TableMetadata) : undefined;
  const params = hasMetadata ? maybeParamsOrOptions : (tableMetadataOrParams as URLSearchParams);
  const options = hasMetadata ? maybeOptions : undefined;
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
    if (
      !field ||
      !operator ||
      !isValidFilter(tableMetadata, field, operator, options?.filterPolicy)
    ) {
      continue;
    }
    const decoded = decodeFilterValue(value);
    const fieldType = fieldTypeOf(tableMetadata, field);
    const filterConfig = resolveFilterConfig(tableMetadata, field, options?.filterPolicy);
    nextFilters.push({
      field,
      operator: operator as Filter["operator"],
      // With metadata we know the field type, so restore number/boolean values
      // that `decodeFilterValue` returned as strings. Without metadata (untyped
      // overload) we can't, so the value stays a string.
      value: fieldType ? coerceFilterValueToFieldType(fieldType, decoded) : decoded,
      ...(filterConfig?.type === "string"
        ? { caseSensitive: filterConfig.supportsCaseInsensitive === false }
        : {}),
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
    filterPolicy?: FilterPolicy;
  },
  [searchParams, setSearchParams]: SearchParamsBinding,
): UseCollectionOptions<TableFieldName<TTable>, TableMetadataFilter<TTable>> & {
  tableMetadata: TTable;
  filterPolicy?: FilterPolicy;
};
export function withURLCollectionState(
  options: UseCollectionOptions & {
    tableMetadata?: never;
    filterPolicy?: never;
  },
  [searchParams, setSearchParams]: SearchParamsBinding,
): UseCollectionOptions;
export function withURLCollectionState(
  options: UseCollectionOptions & { tableMetadata?: TableMetadata; filterPolicy?: FilterPolicy },
  searchParamsBinding: SearchParamsBinding,
): UseCollectionOptions & { tableMetadata?: TableMetadata; filterPolicy?: FilterPolicy } {
  return applyURLCollectionState(options, searchParamsBinding);
}

function applyURLCollectionState(
  options: UseCollectionOptions & { tableMetadata?: TableMetadata; filterPolicy?: FilterPolicy },
  [searchParams, setSearchParams]: SearchParamsBinding,
): UseCollectionOptions & { tableMetadata?: TableMetadata; filterPolicy?: FilterPolicy } {
  const initialState = options.tableMetadata
    ? parseCollectionSearchParams(options.tableMetadata, searchParams, {
        filterPolicy: options.filterPolicy,
      })
    : parseCollectionSearchParams(searchParams);

  return {
    ...options,
    params: mergeCollectionStateIntoParams(options.params, initialState),
    onParamsChange(params) {
      options.onParamsChange?.(params);
      setSearchParams(
        (prev) => writeCollectionSearchParams(prev, collectionParamsToPersistedState(params)),
        { replace: true },
      );
    },
  };
}

function collectionParamsToPersistedState(
  params: UseCollectionOptions["params"],
): CollectionPersistedState {
  return {
    filters: params?.initialFilters ?? [],
    sortStates: params?.initialSort ?? [],
    pageSize: params?.pageSize ?? 20,
  };
}

function mergeCollectionStateIntoParams(
  params: UseCollectionOptions["params"],
  initialState: CollectionInitialState,
): UseCollectionOptions["params"] {
  if (!initialState.filters && !initialState.sortStates && !initialState.pageSize) return params;

  return {
    ...params,
    ...(initialState.filters ? { initialFilters: initialState.filters } : {}),
    ...(initialState.sortStates ? { initialSort: initialState.sortStates } : {}),
    ...(initialState.pageSize ? { pageSize: initialState.pageSize } : {}),
  };
}

/**
 * Hook for managing collection query parameters (filters, sort, pagination)
 * with state persisted to the URL query string.
 *
 * This is the one-call convenience over {@link useCollectionVariables}: it seeds
 * the initial filter/sort/page-size state from the current router search params
 * and writes changes back as the user filters, sorts, or pages (using `replace`
 * so each change doesn't push a new history entry).
 *
 * Reach for the bare {@link useCollectionVariables} when you don't want URL
 * persistence, or the pure {@link withURLCollectionState} decorator when you
 * need to supply a non-react-router search-params binding.
 *
 * @example
 * ```tsx
 * import { tableMetadata } from "./generated/data-viewer-metadata.generated";
 *
 * const { variables, control } = useURLCollectionVariables({
 *   tableMetadata: tableMetadata.task,
 *   params: { pageSize: 20 },
 * });
 * ```
 */
export function useURLCollectionVariables<const TTable extends TableMetadata>(
  options: UseCollectionOptions<TableFieldName<TTable>, TableMetadataFilter<TTable>> & {
    tableMetadata: TTable;
    filterPolicy?: FilterPolicy;
  },
): UseCollectionReturn<
  TableFieldName<TTable>,
  TypedCollectionVariables<TTable>,
  TableMetadataFilter<TTable>
>;
export function useURLCollectionVariables(
  options: UseCollectionOptions & { tableMetadata?: never; filterPolicy?: never },
): UseCollectionReturn<string, CollectionVariables>;
export function useURLCollectionVariables(
  options: UseCollectionOptions & { tableMetadata?: TableMetadata; filterPolicy?: FilterPolicy },
): unknown {
  const searchParamsBinding = useSearchParams();
  // `useCollectionVariables` is overloaded on whether `tableMetadata` is present;
  // the decorated options carry an optional `tableMetadata` that matches neither
  // overload, so narrow to the no-metadata one for the call. `tableMetadata` is
  // type-only (the implementation never reads it), so this is safe at runtime,
  // and callers see the precise return type from this hook's overloads above.
  return useCollectionVariables(
    applyURLCollectionState(options, searchParamsBinding) as UseCollectionOptions & {
      tableMetadata?: never;
    },
  );
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
