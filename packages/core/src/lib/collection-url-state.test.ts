import { act, renderHook } from "@testing-library/react";
import type { PropsWithChildren } from "react";
import { createElement } from "react";
import { MemoryRouter, useSearchParams } from "react-router";
import { describe, it, expect, vi } from "vitest";
import { AppShellConfigContext, buildConfigurations } from "@/contexts/appshell-context";
import type { CollectionPersistedState, TableMetadataMap } from "@/types/collection";
import {
  useURLCollectionVariables,
  withURLCollectionState,
  encodeFilterValue,
  decodeFilterValue,
  parseCollectionSearchParams,
  writeCollectionSearchParams,
} from "./collection-url-state";

const tableMetadata = {
  task: {
    name: "task",
    pluralForm: "tasks",
    fields: [
      { name: "status", type: "enum", required: true, enumValues: ["active", "pending", "closed"] },
      { name: "createdAt", type: "datetime", required: true },
      { name: "title", type: "string", required: true },
      { name: "price", type: "number", required: true },
      { name: "decimalPrice", type: "decimal", required: true },
      { name: "archived", type: "boolean", required: false },
    ],
  },
} as const satisfies TableMetadataMap;

function resolveSearchParamsBindingCall(
  setSearchParams: ReturnType<typeof vi.fn>,
  prev = new URLSearchParams(),
): URLSearchParams {
  const [updaterOrValue] = setSearchParams.mock.calls[0];
  if (typeof updaterOrValue === "function") {
    const result = updaterOrValue(prev);
    return result instanceof URLSearchParams ? result : new URLSearchParams(result);
  }
  return updaterOrValue instanceof URLSearchParams
    ? updaterOrValue
    : new URLSearchParams(updaterOrValue);
}

describe("parseCollectionSearchParams", () => {
  it("hydrates pageSize, sort, and filters", () => {
    const result = parseCollectionSearchParams(
      tableMetadata.task,
      new URLSearchParams("p=50&s=createdAt:desc&f.status:eq=active"),
    );

    expect(result).toEqual({
      pageSize: 50,
      sortStates: [{ field: "createdAt", direction: "Desc" }],
      filters: [{ field: "status", operator: "eq", value: "active" }],
    });
  });

  it("filters out URL fields/operators not allowed by tableMetadata", () => {
    const result = parseCollectionSearchParams(
      tableMetadata.task,
      new URLSearchParams(
        "s=amount:asc&f.amount:eq=10&f.createdAt:contains=2026&f.status:eq=active",
      ),
    );

    expect(result).toEqual({
      filters: [{ field: "status", operator: "eq", value: "active" }],
    });
  });

  it("supports untyped parsing without metadata", () => {
    const result = parseCollectionSearchParams(
      new URLSearchParams('p=25&s=name:asc&f.tags:in=["a","b"]'),
    );

    expect(result).toEqual({
      pageSize: 25,
      sortStates: [{ field: "name", direction: "Asc" }],
      filters: [{ field: "tags", operator: "in", value: ["a", "b"] }],
    });
  });

  it("coerces number and boolean filter values using metadata", () => {
    const result = parseCollectionSearchParams(
      tableMetadata.task,
      new URLSearchParams('f.price:gt=130&f.archived:eq=true&f.price:in=["10","20"]'),
    );

    expect(result.filters).toEqual([
      { field: "price", operator: "gt", value: 130 },
      { field: "archived", operator: "eq", value: true },
      { field: "price", operator: "in", value: [10, 20] },
    ]);
  });

  it("round-trips a numeric filter through write → parse as a number", () => {
    const written = writeCollectionSearchParams(new URLSearchParams(), {
      filters: [{ field: "price", operator: "gt", value: 130 }],
      sortStates: [],
      pageSize: 20,
    });

    expect(parseCollectionSearchParams(tableMetadata.task, written).filters).toEqual([
      { field: "price", operator: "gt", value: 130 },
    ]);
  });

  it.each([true, false, undefined])("round-trips caseSensitive=%s", (caseSensitive) => {
    const filter = {
      field: "title",
      operator: "contains" as const,
      value: "Alice",
      ...(caseSensitive !== undefined ? { caseSensitive } : {}),
    };
    const state = { filters: [filter], sortStates: [], pageSize: 20 };
    const written = writeCollectionSearchParams(new URLSearchParams(), state);

    expect(written.get("f.title:contains")).toBe("Alice");
    expect(written.get("f.title:contains:cs")).toBe(
      caseSensitive === undefined ? null : String(caseSensitive),
    );
    expect(parseCollectionSearchParams(tableMetadata.task, written).filters).toEqual([filter]);
    expect(parseCollectionSearchParams(written).filters).toEqual([filter]);
  });

  it.each(["", "invalid", "0", "TRUE"])("ignores invalid cs value %j", (value) => {
    const params = new URLSearchParams({
      "f.title:contains": "Alice",
      "f.title:contains:cs": value,
    });
    const expected = { filters: [{ field: "title", operator: "contains", value: "Alice" }] };

    expect(parseCollectionSearchParams(tableMetadata.task, params)).toEqual(expected);
    expect(parseCollectionSearchParams(params)).toEqual(expected);
  });

  it.each(["cs", "future"])("does not treat an orphan %s flag as a filter", (flag) => {
    const params = new URLSearchParams({ [`f.title:contains:${flag}`]: "false" });

    expect(parseCollectionSearchParams(tableMetadata.task, params)).toEqual({});
    expect(parseCollectionSearchParams(params)).toEqual({});
  });

  it("reads flags before filter values, scopes them by operator, and ignores unknown flags", () => {
    const params = new URLSearchParams(
      "f.title:contains:cs=false&f.title:contains:future=true&f.title:contains=Alice&f.title:eq=Bob",
    );
    const expected = {
      filters: [
        { field: "title", operator: "contains", value: "Alice", caseSensitive: false },
        { field: "title", operator: "eq", value: "Bob" },
      ],
    };

    expect(parseCollectionSearchParams(tableMetadata.task, params)).toEqual(expected);
    expect(parseCollectionSearchParams(params)).toEqual(expected);
  });

  it.each(["eq", "in", "nin", "between"] as const)(
    "round-trips decimal %s values and sorting without losing precision",
    (operator) => {
      const min = "9007199254740993.123456789";
      const max = "9007199254740994.123456789";
      const value = { between: { min, max }, eq: min, in: [min, max], nin: [min, max] }[operator];
      const state = {
        filters: [{ field: "decimalPrice", operator, value }],
        sortStates: [{ field: "decimalPrice", direction: "Asc" as const }],
        pageSize: 20,
      };
      const written = writeCollectionSearchParams(new URLSearchParams(), state);
      expect(parseCollectionSearchParams(tableMetadata.task, written)).toEqual(state);
    },
  );

  it("leaves numeric-looking values as strings when no metadata is provided", () => {
    const result = parseCollectionSearchParams(new URLSearchParams("f.price:gt=130"));

    expect(result.filters).toEqual([{ field: "price", operator: "gt", value: "130" }]);
  });
});

describe("writeCollectionSearchParams", () => {
  it("writes persisted state to URL params", () => {
    const state: CollectionPersistedState<"status" | "createdAt"> = {
      filters: [{ field: "status", operator: "eq", value: "pending" }],
      sortStates: [{ field: "createdAt", direction: "Desc" }],
      pageSize: 30,
    };
    const result = writeCollectionSearchParams(new URLSearchParams("foo=bar"), state);

    expect(result.toString()).toBe("foo=bar&p=30&s=createdAt%3Adesc&f.status%3Aeq=pending");
  });

  it("updates cs flags and removes them when unspecified or the filter is cleared", () => {
    const state = {
      filters: [{ field: "title", operator: "contains" as const, value: "Alice" }],
      sortStates: [],
      pageSize: 20,
    };
    const prev = new URLSearchParams(
      "foo=bar&f.title:contains=Alice&f.title:contains:cs=false&p=20",
    );
    const sensitive = writeCollectionSearchParams(prev, {
      ...state,
      filters: [{ ...state.filters[0], caseSensitive: true }],
    });
    expect([...sensitive.entries()]).toEqual([
      ["foo", "bar"],
      ["p", "20"],
      ["f.title:contains", "Alice"],
      ["f.title:contains:cs", "true"],
    ]);
    expect(
      writeCollectionSearchParams(sensitive, {
        ...state,
        filters: [{ ...state.filters[0], caseSensitive: true }],
      }),
    ).toBe(sensitive);

    const unspecified = writeCollectionSearchParams(sensitive, state);
    expect([...unspecified.entries()]).toEqual([
      ["foo", "bar"],
      ["p", "20"],
      ["f.title:contains", "Alice"],
    ]);
    const cleared = writeCollectionSearchParams(sensitive, { ...state, filters: [] });
    expect([...cleared.entries()]).toEqual([
      ["foo", "bar"],
      ["p", "20"],
    ]);
  });

  it.each([true, false])(
    "does not leak cs=%s onto an unspecified duplicate filter",
    (caseSensitive) => {
      const lastFilter = { field: "title", operator: "contains" as const, value: "Bob" };
      const written = writeCollectionSearchParams(new URLSearchParams(), {
        filters: [{ ...lastFilter, value: "Alice", caseSensitive }, lastFilter],
        sortStates: [],
        pageSize: 20,
      });

      expect(written.get("f.title:contains")).toBe("Bob");
      expect(written.has("f.title:contains:cs")).toBe(false);
      expect(parseCollectionSearchParams(written).filters).toEqual([lastFilter]);
    },
  );

  it("returns prev when param multiset is unchanged", () => {
    const prev = new URLSearchParams("f.b:eq=2&f.a:eq=1&p=20");
    const result = writeCollectionSearchParams(prev, {
      filters: [
        { field: "a", operator: "eq", value: "1" },
        { field: "b", operator: "eq", value: "2" },
      ],
      sortStates: [],
      pageSize: 20,
    });

    expect(result).toBe(prev);
  });
});

function SearchParamsWrapper({ children }: PropsWithChildren) {
  return createElement(MemoryRouter, { initialEntries: ["/?p=50&f.status:eq=active"] }, children);
}

describe("withURLCollectionState", () => {
  it("parses URL state and merges it into params", () => {
    const setSearchParams = vi.fn();
    const options = withURLCollectionState(
      {
        tableMetadata: tableMetadata.task,
        params: {
          initialSort: [{ field: "createdAt", direction: "Desc" }],
          pageSize: 20,
        },
      },
      [new URLSearchParams("p=50&f.status:eq=active"), setSearchParams],
    );

    expect(options.params).toEqual({
      initialFilters: [{ field: "status", operator: "eq", value: "active" }],
      initialSort: [{ field: "createdAt", direction: "Desc" }],
      pageSize: 50,
    });
  });

  it("merges URL state into params and composes onParamsChange", () => {
    const setSearchParams = vi.fn();
    const onParamsChange = vi.fn();
    const options = withURLCollectionState(
      {
        tableMetadata: tableMetadata.task,
        params: {
          initialSort: [{ field: "createdAt", direction: "Desc" }],
        },
        onParamsChange,
      },
      [new URLSearchParams("p=25"), setSearchParams],
    );

    expect(options.params).toEqual({
      initialSort: [{ field: "createdAt", direction: "Desc" }],
      pageSize: 25,
    });

    options.onParamsChange?.({
      initialFilters: [{ field: "status", operator: "eq", value: "pending" }],
      initialSort: [{ field: "createdAt", direction: "Desc" }],
      pageSize: 30,
    });

    expect(onParamsChange).toHaveBeenCalledWith({
      initialFilters: [{ field: "status", operator: "eq", value: "pending" }],
      initialSort: [{ field: "createdAt", direction: "Desc" }],
      pageSize: 30,
    });
    expect(setSearchParams).toHaveBeenCalledTimes(1);
    expect(setSearchParams.mock.calls[0][1]).toEqual({ replace: true });
    expect(resolveSearchParamsBindingCall(setSearchParams).toString()).toBe(
      "p=30&s=createdAt%3Adesc&f.status%3Aeq=pending",
    );
  });
});

describe("useURLCollectionVariables", () => {
  it.each([true, false])(
    "preserves caseSensitive=%s and the generated query after a URL reload",
    (caseSensitive) => {
      const wrapper = ({ children }: PropsWithChildren) =>
        createElement(MemoryRouter, { initialEntries: ["/"] }, children);
      const { result, unmount } = renderHook(
        () => {
          const collection = useURLCollectionVariables({ tableMetadata: tableMetadata.task });
          const [searchParams] = useSearchParams();
          return { ...collection, searchParams };
        },
        { wrapper },
      );

      act(() => result.current.control.addFilter("title", "contains", "Alice", { caseSensitive }));
      const expectedQuery = {
        title: caseSensitive ? { contains: "Alice" } : { regex: "(?i)Alice" },
      };
      expect(result.current.variables.query).toEqual(expectedQuery);
      const search = result.current.searchParams.toString();
      unmount();

      const restored = renderHook(
        () => useURLCollectionVariables({ tableMetadata: tableMetadata.task }),
        {
          wrapper: ({ children }: PropsWithChildren) =>
            createElement(MemoryRouter, { initialEntries: [`/?${search}`] }, children),
        },
      );
      expect(restored.result.current.control.filters).toEqual([
        { field: "title", operator: "contains", value: "Alice", caseSensitive },
      ]);
      expect(restored.result.current.variables.query).toEqual(expectedQuery);
    },
  );

  it("returns undefined query when the URL has no filters", () => {
    const wrapper = ({ children }: PropsWithChildren) =>
      createElement(MemoryRouter, { initialEntries: ["/"] }, children);
    const { result } = renderHook(
      () => useURLCollectionVariables({ tableMetadata: tableMetadata.task }),
      { wrapper },
    );

    expect(result.current.variables.query).toBeUndefined();
    expect(result.current.variables.order).toBeUndefined();
  });

  it.each([
    ["gte", "2026-10-09T00:00:00", { gte: "2026-10-08T15:00:00.000Z" }],
    ["in", '["2026-10-09T00:00:00"]', { in: ["2026-10-08T15:00:00.000Z"] }],
    [
      "between",
      '{"min":"2026-10-09T00:00:00","max":"2026-10-10T00:00:00"}',
      { between: { min: "2026-10-08T15:00:00.000Z", max: "2026-10-09T15:00:00.000Z" } },
    ],
  ] as const)(
    "normalizes URL datetime %s filters before the first query",
    (operator, value, expected) => {
      const search = new URLSearchParams({ [`f.createdAt:${operator}`]: value });
      const wrapper = ({ children }: PropsWithChildren) =>
        createElement(
          AppShellConfigContext.Provider,
          {
            value: {
              configurations: buildConfigurations({ modules: [], timeZone: "Asia/Tokyo" }),
            },
          },
          createElement(MemoryRouter, { initialEntries: [`/?${search}`] }, children),
        );
      const { result } = renderHook(
        () => useURLCollectionVariables({ tableMetadata: tableMetadata.task }),
        { wrapper },
      );
      expect(result.current.variables.query).toEqual({ createdAt: expected });
      expect(result.current.control.filters[0].value).toEqual(Object.values(expected)[0]);
    },
  );

  it("seeds collection control state from the URL search params", () => {
    const { result } = renderHook(
      () =>
        useURLCollectionVariables({
          tableMetadata: tableMetadata.task,
          params: {
            initialSort: [{ field: "createdAt", direction: "Desc" }],
            pageSize: 20,
          },
        }),
      { wrapper: SearchParamsWrapper },
    );

    // URL (`?p=50&f.status:eq=active`) wins over the `pageSize: 20` default and
    // contributes the filter; `initialSort` is kept since the URL has no sort.
    expect(result.current.control.filters).toEqual([
      { field: "status", operator: "eq", value: "active" },
    ]);
    expect(result.current.control.sortStates).toEqual([{ field: "createdAt", direction: "Desc" }]);
    expect(result.current.control.pageSize).toBe(50);
  });
});

describe("encodeFilterValue", () => {
  it("encodes strings", () => {
    expect(encodeFilterValue("hello")).toBe("hello");
  });

  it("encodes numbers", () => {
    expect(encodeFilterValue(42)).toBe("42");
  });

  it("encodes booleans", () => {
    expect(encodeFilterValue(true)).toBe("true");
  });

  it("encodes arrays as JSON to avoid comma ambiguity", () => {
    expect(encodeFilterValue(["a", "b", "c"])).toBe('["a","b","c"]');
  });

  it("preserves values containing commas in arrays", () => {
    expect(encodeFilterValue(["Smith, John", "Doe, Jane"])).toBe('["Smith, John","Doe, Jane"]');
  });

  it("encodes null as empty string", () => {
    expect(encodeFilterValue(null)).toBe("");
  });

  it("encodes undefined as empty string", () => {
    expect(encodeFilterValue(undefined)).toBe("");
  });

  it("encodes objects as JSON", () => {
    expect(encodeFilterValue({ foo: "bar" })).toBe('{"foo":"bar"}');
  });
});

describe("decodeFilterValue", () => {
  it("decodes JSON arrays", () => {
    expect(decodeFilterValue('["a","b","c"]')).toEqual(["a", "b", "c"]);
  });

  it("decodes JSON arrays with values containing commas", () => {
    expect(decodeFilterValue('["Smith, John","Doe, Jane"]')).toEqual(["Smith, John", "Doe, Jane"]);
  });

  it("decodes JSON objects (between {min,max} shape)", () => {
    expect(decodeFilterValue('{"min":1,"max":10}')).toEqual({ min: 1, max: 10 });
  });

  it("round-trips an object value through encode → decode", () => {
    const value = { min: "2026-01-01", max: "2026-12-31" };
    expect(decodeFilterValue(encodeFilterValue(value))).toEqual(value);
  });

  it("does not coerce numeric- or boolean-looking strings to primitives", () => {
    expect(decodeFilterValue("5")).toBe("5");
    expect(decodeFilterValue("true")).toBe("true");
  });

  it("returns plain string for non-array values", () => {
    expect(decodeFilterValue("hello")).toBe("hello");
  });

  it("returns plain string with commas as-is (not split)", () => {
    expect(decodeFilterValue("Smith, John")).toBe("Smith, John");
  });

  it("returns plain string for malformed JSON", () => {
    expect(decodeFilterValue("[not valid json")).toBe("[not valid json");
    expect(decodeFilterValue("{broken")).toBe("{broken");
  });
});
