import { useEffect, useRef } from "react";
import { useSearchParams } from "react-router";
import type { CollectionControl, Filter } from "@/types/collection";

const KEY_PAGE_SIZE = "p";
const KEY_SORT = "s";
const FILTER_PREFIX = "f.";

/**
 * Lifecycle phase of `useUrlCollectionState`.
 */
type SyncPhase =
  /** Initial state. Hydration has not run yet. */
  | "pending"
  /** Hydration complete. The first write effect should be skipped because
   *  control state set during hydration (via setState) won't be reflected
   *  until the next render. */
  | "hydrated"
  /** Normal operation. The write effect actively syncs control state to the URL. */
  | "ready";

/**
 * Persists CollectionControl state (filters, sort, page size) to the URL query
 * string so pages are bookmarkable and the browser back button works.
 *
 * Designed to be entity-agnostic: keys are short and the operator/value
 * encoding is derived from the current Filter shape, not hard-coded per field.
 *
 * Cursor/direction state is intentionally NOT persisted — `CollectionControl`
 * manages cursor state internally and no longer exposes it publicly. We accept
 * the regression that a refresh resets to page 1.
 */
export function useUrlCollectionState<
  TFieldName extends string,
  TFilter extends Filter<TFieldName>,
>(control: CollectionControl<TFieldName, TFilter>): void {
  const [params, setParams] = useSearchParams();
  const phaseRef = useRef<SyncPhase>("pending");

  // Hydrate control from URL on first render.
  useEffect(() => {
    if (phaseRef.current !== "pending") return;
    phaseRef.current = "hydrated";

    const pageSize = params.get(KEY_PAGE_SIZE);
    if (pageSize) {
      const n = Number(pageSize);
      if (Number.isFinite(n) && n > 0) control.setPageSize(n);
    }

    const sort = params.get(KEY_SORT);
    if (sort) {
      const [field, rawDir] = sort.split(":");
      if (field) {
        const direction = rawDir === "desc" ? "Desc" : "Asc";
        control.setSort(field as TFieldName, direction);
      }
    }

    const nextFilters: Filter<TFieldName>[] = [];
    for (const [key, value] of params.entries()) {
      if (!key.startsWith(FILTER_PREFIX) || !value) continue;
      const [field, operator] = key.slice(FILTER_PREFIX.length).split(":");
      if (!field || !operator) continue;
      nextFilters.push({
        field: field as TFieldName,
        operator,
        value: decodeFilterValue(value),
      } as Filter<TFieldName>);
    }
    if (nextFilters.length > 0) {
      control.setFilters(nextFilters);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Write control state back to URL whenever it changes.
  // Uses the setParams function updater to avoid depending on `params` in the
  // dependency array, which would cause a feedback loop:
  //   setParams → params change → effect re-runs → setParams (no-op but wasteful)
  useEffect(() => {
    if (phaseRef.current === "pending") return;
    // Skip the first write cycle that fires immediately after hydration.
    // Control state set during hydration (setPageSize, setSort, etc.) is async
    // and won't be reflected until the next render.
    if (phaseRef.current === "hydrated") {
      phaseRef.current = "ready";
      return;
    }

    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);

        if (control.pageSize) {
          next.set(KEY_PAGE_SIZE, String(control.pageSize));
        } else {
          next.delete(KEY_PAGE_SIZE);
        }

        if (control.sortStates.length > 0) {
          const { field, direction } = control.sortStates[0];
          next.set(KEY_SORT, `${field}:${direction === "Desc" ? "desc" : "asc"}`);
        } else {
          next.delete(KEY_SORT);
        }

        // Snapshot keys before iterating — we delete entries during the loop.
        // eslint-disable-next-line unicorn/no-useless-spread
        for (const key of [...next.keys()]) {
          if (key.startsWith(FILTER_PREFIX)) next.delete(key);
        }
        for (const filter of control.filters) {
          next.set(
            `${FILTER_PREFIX}${filter.field}:${filter.operator}`,
            encodeFilterValue(filter.value),
          );
        }

        // Bail out if nothing changed — avoids a no-op navigation that could
        // still trigger re-renders in some react-router versions. Compare on a
        // sorted snapshot rather than `.toString()`: the filter rebuild above is
        // delete-then-set, so key order can shift between renders even when the
        // param multiset is identical (and `.toString()` is additionally
        // sensitive to `&`/`=` characters inside values).
        if (stableQueryString(next) === stableQueryString(prev)) return prev;
        return next;
      },
      { replace: true },
    );
  }, [control.pageSize, control.sortStates, control.filters, setParams]);
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
