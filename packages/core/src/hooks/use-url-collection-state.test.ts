import { renderHook } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { CollectionControl, TableMetadataMap } from "@/types/collection";
import {
  useUrlCollectionState,
  withURLState,
  encodeFilterValue,
  decodeFilterValue,
} from "./use-url-collection-state";

// ---------------------------------------------------------------------------
// Mock react-router's useSearchParams
// ---------------------------------------------------------------------------
let mockParams: URLSearchParams;
const mockSetParams = vi.fn();

vi.mock("react-router", () => ({
  useSearchParams: () => [mockParams, mockSetParams],
}));

/**
 * Helper: the hook now calls setParams with a function updater.
 * This helper resolves the updater against mockParams to get the resulting params.
 */
function resolveSetParamsCall(callIndex: number): URLSearchParams {
  const [updaterOrValue] = mockSetParams.mock.calls[callIndex];
  if (typeof updaterOrValue === "function") {
    const result = updaterOrValue(mockParams);
    return result instanceof URLSearchParams ? result : new URLSearchParams(result);
  }
  return updaterOrValue instanceof URLSearchParams
    ? updaterOrValue
    : new URLSearchParams(updaterOrValue);
}

const tableMetadata = {
  task: {
    name: "task",
    pluralForm: "tasks",
    fields: [
      { name: "status", type: "enum", required: true, enumValues: ["active", "pending", "closed"] },
      { name: "createdAt", type: "datetime", required: true },
      { name: "title", type: "string", required: true },
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

function makeControl(overrides?: Partial<CollectionControl>): CollectionControl {
  return {
    filters: [],
    addFilter: vi.fn(),
    setFilters: vi.fn(),
    removeFilter: vi.fn(),
    clearFilters: vi.fn(),
    sortStates: [],
    setSort: vi.fn(),
    clearSort: vi.fn(),
    pageSize: 20,
    setPageSize: vi.fn(),
    goToNextPage: vi.fn(),
    goToPrevPage: vi.fn(),
    resetPage: vi.fn(),
    goToFirstPage: vi.fn(),
    goToLastPage: vi.fn(),
    getHasPrevPage: vi.fn(),
    getHasNextPage: vi.fn(),
    resetCount: 0,
    ...overrides,
  };
}

describe("useUrlCollectionState", () => {
  beforeEach(() => {
    mockParams = new URLSearchParams();
    mockSetParams.mockClear();
  });

  // ---------------------------------------------------------------------------
  // Hydration from URL
  // ---------------------------------------------------------------------------
  describe("hydration from URL", () => {
    it("hydrates pageSize from URL param", () => {
      mockParams = new URLSearchParams("p=50");
      const control = makeControl();
      renderHook(() => useUrlCollectionState(control));
      expect(control.setPageSize).toHaveBeenCalledWith(50);
    });

    it("ignores invalid pageSize values", () => {
      mockParams = new URLSearchParams("p=abc");
      const control = makeControl();
      renderHook(() => useUrlCollectionState(control));
      expect(control.setPageSize).not.toHaveBeenCalled();
    });

    it("ignores non-positive pageSize values", () => {
      mockParams = new URLSearchParams("p=-5");
      const control = makeControl();
      renderHook(() => useUrlCollectionState(control));
      expect(control.setPageSize).not.toHaveBeenCalled();
    });

    it("hydrates sort from URL param (asc)", () => {
      mockParams = new URLSearchParams("s=name:asc");
      const control = makeControl();
      renderHook(() => useUrlCollectionState(control));
      expect(control.setSort).toHaveBeenCalledWith("name", "Asc");
    });

    it("hydrates sort from URL param (desc)", () => {
      mockParams = new URLSearchParams("s=createdAt:desc");
      const control = makeControl();
      renderHook(() => useUrlCollectionState(control));
      expect(control.setSort).toHaveBeenCalledWith("createdAt", "Desc");
    });

    it("hydrates filters from URL params", () => {
      mockParams = new URLSearchParams("f.status:eq=active&f.priority:gt=3");
      const control = makeControl();
      renderHook(() => useUrlCollectionState(control));
      expect(control.setFilters).toHaveBeenCalledWith([
        { field: "status", operator: "eq", value: "active" },
        { field: "priority", operator: "gt", value: "3" },
      ]);
    });

    it("hydrates array filter values (JSON format)", () => {
      mockParams = new URLSearchParams('f.status:in=["active","pending","closed"]');
      const control = makeControl();
      renderHook(() => useUrlCollectionState(control));
      expect(control.setFilters).toHaveBeenCalledWith([
        {
          field: "status",
          operator: "in",
          value: ["active", "pending", "closed"],
        },
      ]);
    });

    it("hydrates object filter values (between {min,max} JSON format)", () => {
      mockParams = new URLSearchParams(
        'f.createdAt:between={"min":"2026-01-01","max":"2026-12-31"}',
      );
      const control = makeControl();
      renderHook(() => useUrlCollectionState(control));
      expect(control.setFilters).toHaveBeenCalledWith([
        {
          field: "createdAt",
          operator: "between",
          value: { min: "2026-01-01", max: "2026-12-31" },
        },
      ]);
    });

    it("skips filters with missing value", () => {
      mockParams = new URLSearchParams("f.status:eq=");
      const control = makeControl();
      renderHook(() => useUrlCollectionState(control));
      expect(control.setFilters).not.toHaveBeenCalled();
    });

    it("does not hydrate twice on re-render", () => {
      mockParams = new URLSearchParams("p=30");
      const control = makeControl();
      const { rerender } = renderHook(() => useUrlCollectionState(control));
      rerender();
      expect(control.setPageSize).toHaveBeenCalledTimes(1);
    });
  });

  // ---------------------------------------------------------------------------
  // Writing state to URL
  // ---------------------------------------------------------------------------
  describe("writing state to URL", () => {
    it("writes pageSize to URL when control state changes", () => {
      // Start with default, then simulate a user changing pageSize
      const { rerender } = renderHook(({ control }) => useUrlCollectionState(control), {
        initialProps: { control: makeControl({ pageSize: 20 }) },
      });
      // First render: write effect is skipped (skipWriteRef).
      // Simulate user changing pageSize → triggers dep change → write effect fires.
      rerender({ control: makeControl({ pageSize: 25 }) });
      const nextParams = resolveSetParamsCall(mockSetParams.mock.calls.length - 1);
      expect(nextParams.get("p")).toBe("25");
    });

    it("writes sort to URL when control state changes", () => {
      const { rerender } = renderHook(({ control }) => useUrlCollectionState(control), {
        initialProps: { control: makeControl() },
      });
      rerender({
        control: makeControl({
          sortStates: [{ field: "name", direction: "Desc" }],
        }),
      });
      const nextParams = resolveSetParamsCall(mockSetParams.mock.calls.length - 1);
      expect(nextParams.get("s")).toBe("name:desc");
    });

    it("writes filters to URL when control state changes", () => {
      const { rerender } = renderHook(({ control }) => useUrlCollectionState(control), {
        initialProps: { control: makeControl() },
      });
      rerender({
        control: makeControl({
          filters: [{ field: "status", operator: "eq" as never, value: "active" }],
        }),
      });
      const nextParams = resolveSetParamsCall(mockSetParams.mock.calls.length - 1);
      expect(nextParams.get("f.status:eq")).toBe("active");
    });

    it("returns prev params unchanged when URL is already in sync", () => {
      mockParams = new URLSearchParams("p=20");
      const { rerender } = renderHook(({ control }) => useUrlCollectionState(control), {
        initialProps: { control: makeControl({ pageSize: 20 }) },
      });
      // Change a non-relevant field to trigger the effect
      rerender({
        control: makeControl({
          pageSize: 20,
          sortStates: [],
          filters: [],
        }),
      });
      const lastCallIndex = mockSetParams.mock.calls.length - 1;
      const [updater] = mockSetParams.mock.calls[lastCallIndex];
      if (typeof updater === "function") {
        const result = updater(mockParams);
        // When no change, it should return the original prev instance
        expect(result).toBe(mockParams);
      }
    });

    it("treats reordered params as unchanged (order-insensitive compare)", () => {
      // prev URL holds filters in b,a order; control emits the same multiset in
      // a,b order. The delete-then-set rebuild flips key order, but the param
      // multiset is identical, so the write must bail out and return prev.
      // A plain `.toString()` compare would see a difference here and navigate.
      mockParams = new URLSearchParams("f.b:eq=2&f.a:eq=1&p=20");
      const filters = [
        { field: "a", operator: "eq" as never, value: "1" },
        { field: "b", operator: "eq" as never, value: "2" },
      ];
      const { rerender } = renderHook(({ control }) => useUrlCollectionState(control), {
        initialProps: { control: makeControl({ pageSize: 20, filters }) },
      });
      // Re-render with a fresh control (new array refs) to fire the write effect.
      rerender({ control: makeControl({ pageSize: 20, filters: [...filters] }) });
      const lastCallIndex = mockSetParams.mock.calls.length - 1;
      const [updater] = mockSetParams.mock.calls[lastCallIndex];
      expect(typeof updater).toBe("function");
      if (typeof updater === "function") {
        const result = updater(mockParams);
        expect(result).toBe(mockParams);
      }
    });

    it("uses replace: true for setParams", () => {
      const { rerender } = renderHook(({ control }) => useUrlCollectionState(control), {
        initialProps: { control: makeControl({ pageSize: 20 }) },
      });
      rerender({ control: makeControl({ pageSize: 30 }) });
      const lastCallIndex = mockSetParams.mock.calls.length - 1;
      const [, options] = mockSetParams.mock.calls[lastCallIndex];
      expect(options).toEqual({ replace: true });
    });
  });
});

describe("withURLState", () => {
  it("parses URL state and keeps params defaults intact", () => {
    const setSearchParams = vi.fn();
    const options = withURLState(
      {
        tableMetadata: tableMetadata.task,
        params: {
          initialSort: [{ field: "createdAt", direction: "Desc" }],
          pageSize: 20,
        },
      },
      [new URLSearchParams("p=50&f.status:eq=active"), setSearchParams],
    );

    expect(options.initialState).toEqual({
      pageSize: 50,
      filters: [{ field: "status", operator: "eq", value: "active" }],
    });
    expect(options.params).toEqual({
      initialSort: [{ field: "createdAt", direction: "Desc" }],
      pageSize: 20,
    });
  });

  it("filters out URL fields/operators not allowed by tableMetadata", () => {
    const options = withURLState({ tableMetadata: tableMetadata.task }, [
      new URLSearchParams(
        "s=amount:asc&f.amount:eq=10&f.createdAt:contains=2026&f.status:eq=active",
      ),
      vi.fn(),
    ]);

    expect(options.initialState).toEqual({
      filters: [{ field: "status", operator: "eq", value: "active" }],
    });
  });

  it("merges existing initialState and composes saver", () => {
    const setSearchParams = vi.fn();
    const baseSaver = { save: vi.fn() };
    const options = withURLState(
      {
        tableMetadata: tableMetadata.task,
        initialState: {
          sortStates: [{ field: "createdAt", direction: "Desc" }],
        },
        saver: baseSaver,
      },
      [new URLSearchParams("p=25"), setSearchParams],
    );

    expect(options.initialState).toEqual({
      sortStates: [{ field: "createdAt", direction: "Desc" }],
      pageSize: 25,
    });

    options.saver?.save({
      filters: [{ field: "status", operator: "eq", value: "pending" }],
      sortStates: [{ field: "createdAt", direction: "Desc" }],
      pageSize: 30,
    });

    expect(baseSaver.save).toHaveBeenCalledWith({
      filters: [{ field: "status", operator: "eq", value: "pending" }],
      sortStates: [{ field: "createdAt", direction: "Desc" }],
      pageSize: 30,
    });
    expect(setSearchParams).toHaveBeenCalledTimes(1);
    expect(setSearchParams.mock.calls[0][1]).toEqual({ replace: true });
    expect(resolveSearchParamsBindingCall(setSearchParams).toString()).toBe(
      "p=30&s=createdAt%3Adesc&f.status%3Aeq=pending",
    );
  });
});

// ---------------------------------------------------------------------------
// Utility functions
// ---------------------------------------------------------------------------
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
    // These parse as JSON (number/boolean) but must stay strings so operator
    // implementations keep their string-vs-numeric semantics.
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
