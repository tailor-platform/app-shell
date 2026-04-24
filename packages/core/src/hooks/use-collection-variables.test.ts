import { renderHook, act } from "@testing-library/react";
import { describe, it, expect } from "vitest";
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
      expect(result.current.control.cursor).toBeNull();
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
        result.current.control.nextPage("cursor1");
      });
      expect(result.current.control.cursor).toBe("cursor1");

      act(() => {
        result.current.control.addFilter("status", "eq", "ACTIVE");
      });
      expect(result.current.control.cursor).toBeNull();
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
    it("navigates to next page (forward) and pushes to cursorStack", () => {
      const { result } = renderHook(() => useCollectionVariables({}));

      act(() => {
        result.current.control.nextPage("cursor1");
      });

      expect(result.current.control.cursor).toBe("cursor1");
      expect(result.current.control.cursorStack).toEqual(["cursor1"]);
      expect(result.current.control.paginationDirection).toBe("forward");
      expect(result.current.variables.pagination.after).toBe("cursor1");
      expect(result.current.variables.pagination.first).toBe(20);
      expect(result.current.variables.pagination.last).toBeUndefined();
      expect(result.current.variables.pagination.before).toBeUndefined();
    });

    it("navigates to previous page using cursor stack (always forward)", () => {
      const { result } = renderHook(() => useCollectionVariables({}));

      act(() => {
        result.current.control.nextPage("cursor1");
      });
      act(() => {
        result.current.control.nextPage("cursor2");
      });
      act(() => {
        result.current.control.prevPage();
      });

      expect(result.current.control.cursor).toBe("cursor1");
      expect(result.current.control.cursorStack).toEqual(["cursor1"]);
      expect(result.current.control.paginationDirection).toBe("forward");
      expect(result.current.variables.pagination.after).toBe("cursor1");
      expect(result.current.variables.pagination.first).toBe(20);
      expect(result.current.variables.pagination.last).toBeUndefined();
      expect(result.current.variables.pagination.before).toBeUndefined();
    });

    it("prevPage back to first page clears cursor and stack", () => {
      const { result } = renderHook(() => useCollectionVariables({}));

      act(() => {
        result.current.control.nextPage("cursor1");
      });
      act(() => {
        result.current.control.prevPage();
      });

      expect(result.current.control.cursor).toBeNull();
      expect(result.current.control.cursorStack).toEqual([]);
      expect(result.current.control.paginationDirection).toBe("forward");
      expect(result.current.variables.pagination.first).toBe(20);
      expect(result.current.variables.pagination.after).toBeUndefined();
    });

    it("resets page and clears cursor stack", () => {
      const { result } = renderHook(() => useCollectionVariables({}));

      act(() => {
        result.current.control.nextPage("cursor1");
      });
      act(() => {
        result.current.control.resetPage();
      });

      expect(result.current.control.cursor).toBeNull();
      expect(result.current.control.cursorStack).toEqual([]);
      expect(result.current.control.paginationDirection).toBe("forward");
    });

    it("prevPage with startCursor uses backward direction (goToLastPage regression)", () => {
      // Regression: after goToLastPage (cursor=null, direction=backward),
      // pressing Prev must use `last + before` not the empty cursorStack.
      const { result } = renderHook(() => useCollectionVariables({}));

      // Simulate goToLastPage
      act(() => {
        result.current.control.goToLastPage();
      });
      expect(result.current.control.paginationDirection).toBe("backward");
      expect(result.current.control.cursorStack).toEqual([]);

      // Simulate pressing Prev with the startCursor of the last page
      act(() => {
        result.current.control.prevPage("last-page-start-cursor");
      });

      expect(result.current.control.cursor).toBe("last-page-start-cursor");
      expect(result.current.control.paginationDirection).toBe("backward");
      expect(result.current.variables.pagination.before).toBe("last-page-start-cursor");
      expect(result.current.variables.pagination.last).toBe(20);
      expect(result.current.variables.pagination.first).toBeUndefined();
      expect(result.current.variables.pagination.after).toBeUndefined();
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
        result.current.control.nextPage("abc123");
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
  });
});
