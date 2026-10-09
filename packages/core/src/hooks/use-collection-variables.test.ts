import { renderHook, act } from "@testing-library/react";
import { createElement, type PropsWithChildren } from "react";
import { resetLocalTimeZone } from "@internationalized/date";
import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import { AppShellConfigContext, buildConfigurations } from "@/contexts/appshell-context";
import type { TableMetadataMap } from "@/types/collection";
import { useCollectionVariables } from "./use-collection-variables";

describe("useCollectionVariables", () => {
  // ---------------------------------------------------------------------------
  // Initial state
  // ---------------------------------------------------------------------------
  describe("initial state", () => {
    it("returns default variables with pageSize 20", () => {
      const { result } = renderHook(() => useCollectionVariables({}));
      expect(result.current.variables.pagination).toEqual({ first: 20 });
      expect(result.current.variables.query).toBeUndefined();
      expect(result.current.variables.order).toBeUndefined();
      expect(result.current.control.filters).toEqual([]);
      expect(result.current.control.sortStates).toEqual([]);
    });

    it("uses custom pageSize", () => {
      const { result } = renderHook(() => useCollectionVariables({ params: { pageSize: 50 } }));
      expect(result.current.variables.pagination.first).toBe(50);
    });

    it("applies initial sort", () => {
      const { result } = renderHook(() =>
        useCollectionVariables({
          params: {
            initialSort: [{ field: "createdAt", direction: "Desc" }],
          },
        }),
      );
      expect(result.current.control.sortStates).toEqual([
        { field: "createdAt", direction: "Desc" },
      ]);
      expect(result.current.variables.order).toEqual([{ field: "createdAt", direction: "Desc" }]);
    });

    it("applies initial filters", () => {
      const { result } = renderHook(() =>
        useCollectionVariables({
          params: {
            initialFilters: [
              {
                field: "status",
                operator: "eq",
                value: "ACTIVE",
              },
            ],
          },
        }),
      );
      expect(result.current.control.filters).toHaveLength(1);
      expect(result.current.variables.query).toEqual({
        status: { eq: "ACTIVE" },
      });
    });

    it("applies params together", () => {
      const { result } = renderHook(() =>
        useCollectionVariables({
          params: {
            initialFilters: [{ field: "status", operator: "eq", value: "ACTIVE" }],
            initialSort: [{ field: "createdAt", direction: "Desc" }],
            pageSize: 50,
          },
        }),
      );

      expect(result.current.control.filters).toEqual([
        { field: "status", operator: "eq", value: "ACTIVE" },
      ]);
      expect(result.current.control.sortStates).toEqual([
        { field: "createdAt", direction: "Desc" },
      ]);
      expect(result.current.variables.pagination).toEqual({ first: 50 });
    });
  });

  describe("onParamsChange", () => {
    it("does not notify on initial render", () => {
      const onParamsChange = vi.fn();
      renderHook(() => useCollectionVariables({ onParamsChange }));
      expect(onParamsChange).not.toHaveBeenCalled();
    });

    it("notifies with params after changes", () => {
      const onParamsChange = vi.fn();
      const { result } = renderHook(() => useCollectionVariables({ onParamsChange }));

      act(() => {
        result.current.control.addFilter("status", "eq", "ACTIVE");
      });

      expect(onParamsChange).toHaveBeenLastCalledWith({
        initialFilters: [
          { field: "status", operator: "eq", value: "ACTIVE", caseSensitive: undefined },
        ],
        initialSort: [],
        pageSize: 20,
      });
    });
  });

  // ---------------------------------------------------------------------------
  // Filter operations
  // ---------------------------------------------------------------------------
  describe("filter operations", () => {
    it("adds a filter", () => {
      const { result } = renderHook(() => useCollectionVariables({}));

      act(() => {
        result.current.control.addFilter("status", "eq", "ACTIVE");
      });

      expect(result.current.control.filters).toHaveLength(1);
      expect(result.current.control.filters[0]).toMatchObject({
        field: "status",
        operator: "eq",
        value: "ACTIVE",
      });
      expect(result.current.variables.query).toEqual({
        status: { eq: "ACTIVE" },
      });
    });

    it("replaces filter for same field", () => {
      const { result } = renderHook(() => useCollectionVariables({}));

      act(() => {
        result.current.control.addFilter("status", "eq", "ACTIVE");
      });
      act(() => {
        result.current.control.addFilter("status", "eq", "INACTIVE");
      });

      expect(result.current.control.filters).toHaveLength(1);
      expect(result.current.control.filters[0].value).toBe("INACTIVE");
    });

    it("sets filters in bulk", () => {
      const { result } = renderHook(() => useCollectionVariables({}));

      act(() => {
        result.current.control.setFilters([
          {
            field: "status",
            operator: "eq",
            value: "ACTIVE",
          },
          {
            field: "amount",
            operator: "gte",
            value: 1000,
          },
        ]);
      });

      expect(result.current.control.filters).toHaveLength(2);
      expect(result.current.variables.query).toEqual({
        status: { eq: "ACTIVE" },
        amount: { gte: 1000 },
      });
    });

    it("removes a filter", () => {
      const { result } = renderHook(() => useCollectionVariables({}));

      act(() => {
        result.current.control.addFilter("status", "eq", "ACTIVE");
        result.current.control.addFilter("amount", "gte", 1000);
      });
      act(() => {
        result.current.control.removeFilter("status");
      });

      expect(result.current.control.filters).toHaveLength(1);
      expect(result.current.control.filters[0].field).toBe("amount");
    });

    it("clears all filters", () => {
      const { result } = renderHook(() => useCollectionVariables({}));

      act(() => {
        result.current.control.addFilter("status", "eq", "ACTIVE");
        result.current.control.addFilter("amount", "gte", 1000);
      });
      act(() => {
        result.current.control.clearFilters();
      });

      expect(result.current.control.filters).toHaveLength(0);
    });

    it("resets pagination when filters change", () => {
      const { result } = renderHook(() => useCollectionVariables({}));

      act(() => {
        result.current.control.goToNextPage({ endCursor: "cursor1" });
      });
      expect(result.current.variables.pagination.after).toBe("cursor1");

      act(() => {
        result.current.control.addFilter("status", "eq", "ACTIVE");
      });
      expect(result.current.variables.pagination.after).toBeUndefined();
      expect(result.current.variables.pagination).toEqual({ first: 20 });
    });

    it("string filter defaults to case-insensitive regex in query variables", () => {
      const { result } = renderHook(() => useCollectionVariables({}));

      act(() => {
        result.current.control.addFilter("name", "contains", "Alice", {
          caseSensitive: false,
        });
      });

      expect(result.current.control.filters[0]).toMatchObject({
        field: "name",
        operator: "contains",
        value: "Alice",
        caseSensitive: false,
      });
      expect(result.current.variables.query).toEqual({
        name: { regex: "(?i)Alice" },
      });
    });

    it("converts eq operator to regex with anchors when caseSensitive is false", () => {
      const { result } = renderHook(() => useCollectionVariables({}));

      act(() => {
        result.current.control.addFilter("name", "eq", "Alice", {
          caseSensitive: false,
        });
      });

      expect(result.current.variables.query).toEqual({
        name: { regex: "(?i)^Alice$" },
      });
    });

    it("converts hasPrefix operator to regex when caseSensitive is false", () => {
      const { result } = renderHook(() => useCollectionVariables({}));

      act(() => {
        result.current.control.addFilter("name", "hasPrefix", "Al", {
          caseSensitive: false,
        });
      });

      expect(result.current.variables.query).toEqual({
        name: { regex: "(?i)^Al" },
      });
    });

    it("converts hasSuffix operator to regex when caseSensitive is false", () => {
      const { result } = renderHook(() => useCollectionVariables({}));

      act(() => {
        result.current.control.addFilter("name", "hasSuffix", "ce", {
          caseSensitive: false,
        });
      });

      expect(result.current.variables.query).toEqual({
        name: { regex: "(?i)ce$" },
      });
    });

    it("escapes regex special characters in case-insensitive filter value", () => {
      const { result } = renderHook(() => useCollectionVariables({}));

      act(() => {
        result.current.control.addFilter("name", "contains", "a.b*c", {
          caseSensitive: false,
        });
      });

      expect(result.current.variables.query).toEqual({
        name: { regex: "(?i)a\\.b\\*c" },
      });
    });

    it("uses original operator when caseSensitive is true", () => {
      const { result } = renderHook(() => useCollectionVariables({}));

      act(() => {
        result.current.control.addFilter("name", "contains", "Alice", {
          caseSensitive: true,
        });
      });

      expect(result.current.variables.query).toEqual({
        name: { contains: "Alice" },
      });
    });
  });

  // ---------------------------------------------------------------------------
  // Sort operations
  // ---------------------------------------------------------------------------
  describe("sort operations", () => {
    it("sets sort", () => {
      const { result } = renderHook(() => useCollectionVariables({}));

      act(() => {
        result.current.control.setSort("createdAt", "Desc");
      });

      expect(result.current.control.sortStates).toEqual([
        { field: "createdAt", direction: "Desc" },
      ]);
      expect(result.current.variables.order).toEqual([{ field: "createdAt", direction: "Desc" }]);
    });

    it("appends sort for different fields", () => {
      const { result } = renderHook(() => useCollectionVariables({}));

      act(() => {
        result.current.control.setSort("createdAt", "Desc");
      });
      act(() => {
        result.current.control.setSort("name", "Asc");
      });

      expect(result.current.control.sortStates).toEqual([
        { field: "createdAt", direction: "Desc" },
        { field: "name", direction: "Asc" },
      ]);
    });

    it("replaces direction for existing field", () => {
      const { result } = renderHook(() => useCollectionVariables({}));

      act(() => {
        result.current.control.setSort("createdAt", "Desc");
      });
      act(() => {
        result.current.control.setSort("name", "Asc");
      });
      act(() => {
        result.current.control.setSort("createdAt", "Asc");
      });

      expect(result.current.control.sortStates).toEqual([
        { field: "name", direction: "Asc" },
        { field: "createdAt", direction: "Asc" },
      ]);
    });

    it("removes sort when direction is undefined", () => {
      const { result } = renderHook(() => useCollectionVariables({}));

      act(() => {
        result.current.control.setSort("createdAt", "Desc");
      });
      act(() => {
        result.current.control.setSort("name", "Asc");
      });
      act(() => {
        result.current.control.setSort("createdAt");
      });

      expect(result.current.control.sortStates).toEqual([{ field: "name", direction: "Asc" }]);
    });

    it("clears sort", () => {
      const { result } = renderHook(() => useCollectionVariables({}));

      act(() => {
        result.current.control.setSort("createdAt", "Desc");
      });
      act(() => {
        result.current.control.clearSort();
      });

      expect(result.current.control.sortStates).toEqual([]);
      expect(result.current.variables.order).toBeUndefined();
    });
  });

  // ---------------------------------------------------------------------------
  // Pagination operations
  // ---------------------------------------------------------------------------
  describe("pagination operations", () => {
    it("goToNextPage pushes to cursorStack (forward)", () => {
      const { result } = renderHook(() => useCollectionVariables({}));

      act(() => {
        result.current.control.goToNextPage({ endCursor: "cursor1" });
      });

      expect(result.current.variables.pagination.after).toBe("cursor1");
      expect(result.current.variables.pagination.first).toBe(20);
      expect(result.current.variables.pagination.last).toBeUndefined();
      expect(result.current.variables.pagination.before).toBeUndefined();
    });

    it("goToPrevPage pops forward stack", () => {
      const { result } = renderHook(() => useCollectionVariables({}));

      act(() => {
        result.current.control.goToNextPage({ endCursor: "cursor1" });
      });
      act(() => {
        result.current.control.goToNextPage({ endCursor: "cursor2" });
      });
      act(() => {
        result.current.control.goToPrevPage({ startCursor: "ignored" });
      });

      expect(result.current.variables.pagination.after).toBe("cursor1");
      expect(result.current.variables.pagination.first).toBe(20);
      expect(result.current.variables.pagination.last).toBeUndefined();
      expect(result.current.variables.pagination.before).toBeUndefined();
    });

    it("goToPrevPage back to first page clears cursor and stack", () => {
      const { result } = renderHook(() => useCollectionVariables({}));

      act(() => {
        result.current.control.goToNextPage({ endCursor: "cursor1" });
      });
      act(() => {
        result.current.control.goToPrevPage({ startCursor: "ignored" });
      });

      expect(result.current.variables.pagination.first).toBe(20);
      expect(result.current.variables.pagination.after).toBeUndefined();
    });

    it("resets page and clears cursor stack", () => {
      const { result } = renderHook(() => useCollectionVariables({}));

      act(() => {
        result.current.control.goToNextPage({ endCursor: "cursor1" });
      });
      act(() => {
        result.current.control.resetPage();
      });

      expect(result.current.variables.pagination).toEqual({ first: 20 });
    });

    it("goToPrevPage in backward mode pushes startCursor onto backward stack", () => {
      const { result } = renderHook(() => useCollectionVariables({}));

      act(() => {
        result.current.control.goToLastPage();
      });
      expect(result.current.variables.pagination).toEqual({ last: 20 });

      act(() => {
        result.current.control.goToPrevPage({
          startCursor: "last-page-start-cursor",
        });
      });

      expect(result.current.variables.pagination.before).toBe("last-page-start-cursor");
      expect(result.current.variables.pagination.last).toBe(20);
      expect(result.current.variables.pagination.first).toBeUndefined();
      expect(result.current.variables.pagination.after).toBeUndefined();
    });

    it("goToNextPage in backward mode pops the backward cursorStack (retrace)", () => {
      const { result } = renderHook(() => useCollectionVariables({}));

      act(() => {
        result.current.control.goToLastPage();
      });
      act(() => {
        result.current.control.goToPrevPage({ startCursor: "cursor-b1" });
      });
      act(() => {
        result.current.control.goToPrevPage({ startCursor: "cursor-b2" });
      });

      // "Next" in backward mode = pop backward stack
      act(() => {
        result.current.control.goToNextPage({ endCursor: "ignored" });
      });

      expect(result.current.variables.pagination.before).toBe("cursor-b1");
      expect(result.current.variables.pagination.last).toBe(20);
    });

    it("goToNextPage in backward mode pops to empty stack (back to last page)", () => {
      const { result } = renderHook(() => useCollectionVariables({}));

      act(() => {
        result.current.control.goToLastPage();
      });
      act(() => {
        result.current.control.goToPrevPage({ startCursor: "cursor-b1" });
      });

      act(() => {
        result.current.control.goToNextPage({ endCursor: "ignored" });
      });

      expect(result.current.variables.pagination.last).toBe(20);
      expect(result.current.variables.pagination.before).toBeUndefined();
    });

    it("goToLastPage with total uses remainder for last page size", () => {
      const { result } = renderHook(() => useCollectionVariables({ params: { pageSize: 10 } }));

      // 25 items, pageSize 10 → last page should have 5 items
      act(() => {
        result.current.control.goToLastPage(25);
      });

      expect(result.current.variables.pagination).toEqual({ last: 5 });
    });

    it("goToLastPage with evenly divisible total uses full pageSize", () => {
      const { result } = renderHook(() => useCollectionVariables({ params: { pageSize: 10 } }));

      // 30 items, pageSize 10 → last page has full 10 items
      act(() => {
        result.current.control.goToLastPage(30);
      });

      expect(result.current.variables.pagination).toEqual({ last: 10 });
    });

    it("goToLastPage without total uses full pageSize", () => {
      const { result } = renderHook(() => useCollectionVariables({ params: { pageSize: 10 } }));

      act(() => {
        result.current.control.goToLastPage();
      });

      expect(result.current.variables.pagination).toEqual({ last: 10 });
    });

    it("navigating prev from remainder last page uses full pageSize", () => {
      const { result } = renderHook(() => useCollectionVariables({ params: { pageSize: 10 } }));

      act(() => {
        result.current.control.goToLastPage(25);
      });
      expect(result.current.variables.pagination.last).toBe(5);

      // Navigate to previous page — should use full pageSize
      act(() => {
        result.current.control.goToPrevPage({ startCursor: "cursor-prev" });
      });

      expect(result.current.variables.pagination.last).toBe(10);
      expect(result.current.variables.pagination.before).toBe("cursor-prev");
    });

    it("navigating back to last page after prev restores remainder", () => {
      const { result } = renderHook(() => useCollectionVariables({ params: { pageSize: 10 } }));

      act(() => {
        result.current.control.goToLastPage(25);
      });
      act(() => {
        result.current.control.goToPrevPage({ startCursor: "cursor-prev" });
      });
      // Pop back to last page
      act(() => {
        result.current.control.goToNextPage({ endCursor: "ignored" });
      });

      expect(result.current.variables.pagination.last).toBe(5);
      expect(result.current.variables.pagination.before).toBeUndefined();
    });
  });

  // ---------------------------------------------------------------------------
  // variables
  // ---------------------------------------------------------------------------
  describe("variables", () => {
    it("generates complete variables with filters, sort, and cursor", () => {
      const { result } = renderHook(() =>
        useCollectionVariables({
          params: {
            pageSize: 10,
            initialFilters: [
              {
                field: "status",
                operator: "eq",
                value: "ACTIVE",
              },
            ],
            initialSort: [{ field: "createdAt", direction: "Desc" }],
          },
        }),
      );

      act(() => {
        result.current.control.goToNextPage({ endCursor: "abc123" });
      });

      expect(result.current.variables).toEqual({
        query: { status: { eq: "ACTIVE" } },
        order: [{ field: "createdAt", direction: "Desc" }],
        pagination: {
          first: 10,
          after: "abc123",
        },
      });
    });

    it("omits undefined fields from pagination", () => {
      const { result } = renderHook(() => useCollectionVariables({}));
      const { pagination } = result.current.variables;
      expect(pagination).toEqual({ first: 20 });
      expect("after" in pagination).toBe(false);
      expect("last" in pagination).toBe(false);
      expect("before" in pagination).toBe(false);
    });

    it("returns undefined for query and order when empty", () => {
      const { result } = renderHook(() => useCollectionVariables({ params: { pageSize: 10 } }));

      expect(result.current.variables.query).toBeUndefined();
      expect(result.current.variables.order).toBeUndefined();
      expect(result.current.variables.pagination).toEqual({ first: 10 });
    });
  });

  // ---------------------------------------------------------------------------
  // Metadata-typed overload
  // ---------------------------------------------------------------------------
  describe("metadata-typed overload", () => {
    const testMetadata = {
      task: {
        name: "task",
        pluralForm: "tasks",
        fields: [
          { name: "id", type: "uuid", required: true },
          { name: "title", type: "string", required: true },
          {
            name: "status",
            type: "enum",
            required: true,
            enumValues: ["todo", "in_progress", "done"],
          },
          { name: "dueDate", type: "date", required: false },
          { name: "createdAt", type: "datetime", required: true },
          { name: "startTime", type: "time", required: false },
          { name: "count", type: "number", required: false },
        ],
      },
    } as const satisfies TableMetadataMap;

    it("works with tableMetadata", () => {
      const { result } = renderHook(() =>
        useCollectionVariables({
          tableMetadata: testMetadata.task,
          params: { pageSize: 10 },
        }),
      );
      expect(result.current.variables.pagination).toEqual({ first: 10 });
    });

    it("applies typed initialSort", () => {
      const { result } = renderHook(() =>
        useCollectionVariables({
          tableMetadata: testMetadata.task,
          params: {
            initialSort: [{ field: "dueDate", direction: "Desc" }],
          },
        }),
      );

      expect(result.current.control.sortStates).toEqual([{ field: "dueDate", direction: "Desc" }]);
    });

    describe("datetime normalization", () => {
      const wrapper = ({ children }: PropsWithChildren) =>
        createElement(
          AppShellConfigContext.Provider,
          {
            value: {
              configurations: buildConfigurations({
                modules: [],
                timeZone: "America/Los_Angeles",
              }),
            },
          },
          children,
        );

      beforeEach(() => {
        vi.stubEnv("TZ", "UTC");
        resetLocalTimeZone();
      });
      afterEach(() => {
        vi.unstubAllEnvs();
        resetLocalTimeZone();
      });

      it.each([
        ["eq", "2026-10-09T00:00:00", "2026-10-09T07:00:00.000Z"],
        ["gte", "2026-10-09T00:00", "2026-10-09T07:00:00.000Z"],
        ["eq", "2026-10-09T00:00:00+09:00", "2026-10-08T15:00:00.000Z"],
        ["eq", "2026-10-09T00:00:00Z", "2026-10-09T00:00:00.000Z"],
        [
          "in",
          ["2026-10-09T00:00:00", "2026-10-09T00:00:00Z"],
          ["2026-10-09T07:00:00.000Z", "2026-10-09T00:00:00.000Z"],
        ],
        ["nin", ["2026-10-09T00:00:00"], ["2026-10-09T07:00:00.000Z"]],
        [
          "between",
          { min: "2026-10-09T00:00:00", max: "2026-10-10T00:00:00" },
          { min: "2026-10-09T07:00:00.000Z", max: "2026-10-10T07:00:00.000Z" },
        ],
      ] as const)(
        "normalizes initial %s filters before the first query",
        (operator, value, expected) => {
          const { result } = renderHook(
            () =>
              useCollectionVariables({
                tableMetadata: testMetadata.task,
                params: { initialFilters: [{ field: "createdAt", operator, value }] },
              }),
            { wrapper },
          );
          expect(result.current.control.filters[0].value).toEqual(expected);
          expect(result.current.variables.query).toEqual({ createdAt: { [operator]: expected } });
        },
      );

      it("normalizes addFilter and restored filters before notifying persistence", () => {
        const onParamsChange = vi.fn();
        const { result } = renderHook(
          () => useCollectionVariables({ tableMetadata: testMetadata.task, onParamsChange }),
          { wrapper },
        );
        act(() => result.current.control.addFilter("createdAt", "gte", "2026-10-09T00:00:00"));
        expect(result.current.variables.query).toEqual({
          createdAt: { gte: "2026-10-09T07:00:00.000Z" },
        });
        expect(onParamsChange.mock.lastCall?.[0].initialFilters[0].value).toBe(
          "2026-10-09T07:00:00.000Z",
        );
        act(() =>
          result.current.control.setFilters([
            {
              field: "createdAt",
              operator: "between",
              value: { min: "2026-10-09T00:00:00", max: "2026-10-10T00:00:00" },
            },
          ]),
        );
        expect(result.current.variables.query).toEqual({
          createdAt: {
            between: { min: "2026-10-09T07:00:00.000Z", max: "2026-10-10T07:00:00.000Z" },
          },
        });
        expect(onParamsChange.mock.lastCall?.[0].initialFilters).toEqual(
          result.current.control.filters,
        );
      });

      it("leaves non-datetime fields and filters without metadata unchanged", () => {
        const filters = [
          { field: "title", operator: "eq", value: "2026-10-09T00:00:00", caseSensitive: true },
          { field: "dueDate", operator: "eq", value: "2026-10-09" },
          { field: "startTime", operator: "eq", value: "09:30" },
        ] as const;
        const { result } = renderHook(
          () =>
            useCollectionVariables({
              tableMetadata: testMetadata.task,
              params: { initialFilters: [...filters] },
            }),
          { wrapper },
        );
        expect(result.current.control.filters).toEqual(filters);
        const untyped = renderHook(
          () =>
            useCollectionVariables({
              params: {
                initialFilters: [
                  { field: "createdAt", operator: "eq", value: "2026-10-09T00:00:00" },
                ],
              },
            }),
          { wrapper },
        );
        expect(untyped.result.current.variables.query).toEqual({
          createdAt: { eq: "2026-10-09T00:00:00" },
        });
      });

      it.each([
        "not-a-date",
        "2026-02-30",
        "2026-02-30T00:00:00Z",
        "2026-02-30T00:00:00.000z",
        "2026-10-09 00:00:00",
        "2026-10-09T25:00",
        null,
      ])("rejects invalid initial datetime %s rather than dropping its filter", (value) => {
        expect(() =>
          renderHook(
            () =>
              useCollectionVariables({
                tableMetadata: testMetadata.task,
                params: { initialFilters: [{ field: "createdAt", operator: "eq", value }] },
              }),
            { wrapper },
          ),
        ).toThrow('Invalid datetime filter for field "createdAt".');
      });

      it("rejects invalid updates without changing existing filters", () => {
        const { result } = renderHook(
          () =>
            useCollectionVariables({
              tableMetadata: testMetadata.task,
              params: {
                initialFilters: [
                  { field: "createdAt", operator: "eq", value: "2026-10-09T00:00:00Z" },
                ],
              },
            }),
          { wrapper },
        );
        const previous = result.current.control.filters;
        expect(() => result.current.control.addFilter("createdAt", "eq", "2026-02-30")).toThrow(
          TypeError,
        );
        expect(() =>
          result.current.control.setFilters([
            { field: "createdAt", operator: "in", value: ["2026-10-09T00:00:00Z", "invalid"] },
          ]),
        ).toThrow(TypeError);
        expect(() =>
          result.current.control.setFilters([
            { field: "createdAt", operator: "between", value: { min: "2026-10-09T00:00:00Z" } },
          ]),
        ).toThrow(TypeError);
        expect(result.current.control.filters).toBe(previous);
      });
    });
  });
});
