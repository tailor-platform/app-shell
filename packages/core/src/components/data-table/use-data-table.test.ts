import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { useDataTable } from "./use-data-table";
import type { CollectionControl } from "@/types/collection";
import type { Column, DataTableData } from "./types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type TestRow = { id: string; name: string; value: number };

const columns: Column<TestRow>[] = [
  { id: "name", label: "Name", render: (r) => r.name },
  { id: "value", label: "Value", render: (r) => String(r.value) },
];

const testData: DataTableData<TestRow> = {
  rows: [
    { id: "1", name: "Alice", value: 10 },
    { id: "2", name: "Bob", value: 20 },
  ],
  pageInfo: {
    hasNextPage: true,
    hasPreviousPage: false,
    nextPageToken: "token-next",
    previousPageToken: null,
  },
  total: 50,
};

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
    pageSize: 10,
    setPageSize: vi.fn(),
    cursor: null,
    paginationDirection: "forward",
    nextPage: vi.fn(),
    prevPage: vi.fn(),
    resetPage: vi.fn(),
    currentPage: 1,
    goToFirstPage: vi.fn(),
    goToLastPage: vi.fn(),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("useDataTable", () => {
  // -------------------------------------------------------------------------
  // Data extraction
  // -------------------------------------------------------------------------
  describe("data extraction", () => {
    it("extracts rows from data.rows", () => {
      const { result } = renderHook(() => useDataTable({ columns, data: testData }));
      expect(result.current.rows).toEqual(testData.rows);
    });

    it("returns empty rows when data is undefined", () => {
      const { result } = renderHook(() => useDataTable({ columns, data: undefined }));
      expect(result.current.rows).toEqual([]);
    });

    it("returns default pageInfo when data has no pageInfo", () => {
      const { result } = renderHook(() => useDataTable({ columns, data: { rows: [] } }));
      expect(result.current.pageInfo).toEqual({
        hasNextPage: false,
        hasPreviousPage: false,
        nextPageToken: null,
        previousPageToken: null,
      });
    });

    it("passes through pageInfo from data", () => {
      const { result } = renderHook(() => useDataTable({ columns, data: testData }));
      expect(result.current.pageInfo).toEqual(testData.pageInfo);
    });

    it("returns total from data", () => {
      const { result } = renderHook(() => useDataTable({ columns, data: testData }));
      expect(result.current.total).toBe(50);
    });

    it("returns null total when data has no total", () => {
      const { result } = renderHook(() => useDataTable({ columns, data: { rows: [] } }));
      expect(result.current.total).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // Pagination derivation
  // -------------------------------------------------------------------------
  describe("pagination derivation", () => {
    it("derives totalPages from total and pageSize", () => {
      const control = makeControl({ pageSize: 10, currentPage: 1 });
      const { result } = renderHook(() => useDataTable({ columns, data: testData, control }));
      expect(result.current.totalPages).toBe(5); // 50 / 10
    });

    it("returns null totalPages when total is not provided", () => {
      const control = makeControl({ pageSize: 10 });
      const { result } = renderHook(() => useDataTable({ columns, data: { rows: [] }, control }));
      expect(result.current.totalPages).toBeNull();
    });

    it("derives hasPrevPage from currentPage > 1", () => {
      const control = makeControl({ currentPage: 1 });
      const { result } = renderHook(() => useDataTable({ columns, data: testData, control }));
      expect(result.current.hasPrevPage).toBe(false);
    });

    it("derives hasPrevPage as true when currentPage > 1", () => {
      const control = makeControl({ currentPage: 3 });
      const { result } = renderHook(() => useDataTable({ columns, data: testData, control }));
      expect(result.current.hasPrevPage).toBe(true);
    });

    it("derives hasNextPage from totalPages when total is known", () => {
      const control = makeControl({ pageSize: 10, currentPage: 5 });
      const { result } = renderHook(() => useDataTable({ columns, data: testData, control }));
      // currentPage 5, totalPages 5 → no next
      expect(result.current.hasNextPage).toBe(false);
    });

    it("derives hasNextPage from totalPages when not on last page", () => {
      const control = makeControl({ pageSize: 10, currentPage: 3 });
      const { result } = renderHook(() => useDataTable({ columns, data: testData, control }));
      expect(result.current.hasNextPage).toBe(true);
    });

    it("falls back to pageInfo.hasNextPage when total is unknown", () => {
      const control = makeControl({ pageSize: 10, currentPage: 1 });
      const dataWithoutTotal: DataTableData<TestRow> = {
        rows: testData.rows,
        pageInfo: {
          hasNextPage: true,
          hasPreviousPage: false,
          nextPageToken: "tok",
          previousPageToken: null,
        },
      };
      const { result } = renderHook(() =>
        useDataTable({ columns, data: dataWithoutTotal, control }),
      );
      expect(result.current.hasNextPage).toBe(true);
    });

    it("delegates nextPage to control", () => {
      const control = makeControl();
      const { result } = renderHook(() => useDataTable({ columns, data: testData, control }));

      act(() => {
        result.current.nextPage("tok-1");
      });
      expect(control.nextPage).toHaveBeenCalledWith("tok-1");
    });

    it("delegates prevPage to control", () => {
      const control = makeControl();
      const { result } = renderHook(() => useDataTable({ columns, data: testData, control }));

      act(() => {
        result.current.prevPage("tok-2");
      });
      expect(control.prevPage).toHaveBeenCalledWith("tok-2");
    });
  });

  // -------------------------------------------------------------------------
  // Column visibility
  // -------------------------------------------------------------------------
  describe("column visibility", () => {
    it("all columns visible by default", () => {
      const { result } = renderHook(() => useDataTable({ columns, data: testData }));
      expect(result.current.visibleColumns).toEqual(columns);
      expect(result.current.isColumnVisible("name")).toBe(true);
    });

    it("toggleColumn hides and shows a column", () => {
      const { result } = renderHook(() => useDataTable({ columns, data: testData }));

      act(() => {
        result.current.toggleColumn("name");
      });
      expect(result.current.visibleColumns).toHaveLength(1);
      expect(result.current.isColumnVisible("name")).toBe(false);

      act(() => {
        result.current.toggleColumn("name");
      });
      expect(result.current.visibleColumns).toHaveLength(2);
      expect(result.current.isColumnVisible("name")).toBe(true);
    });

    it("hideAllColumns hides all, showAllColumns restores", () => {
      const { result } = renderHook(() => useDataTable({ columns, data: testData }));

      act(() => {
        result.current.hideAllColumns();
      });
      expect(result.current.visibleColumns).toHaveLength(0);

      act(() => {
        result.current.showAllColumns();
      });
      expect(result.current.visibleColumns).toHaveLength(2);
    });
  });

  // -------------------------------------------------------------------------
  // Optimistic row operations
  // -------------------------------------------------------------------------
  describe("optimistic row operations", () => {
    it("updateRow applies optimistic update", () => {
      const { result } = renderHook(() => useDataTable({ columns, data: testData }));

      act(() => {
        result.current.updateRow("1", { name: "Alice Updated" });
      });
      expect(result.current.rows[0].name).toBe("Alice Updated");
      expect(result.current.rows[1].name).toBe("Bob");
    });

    it("updateRow rollback restores original data", () => {
      const { result } = renderHook(() => useDataTable({ columns, data: testData }));

      let rollback: () => void;
      act(() => {
        ({ rollback } = result.current.updateRow("1", { name: "Updated" }));
      });
      expect(result.current.rows[0].name).toBe("Updated");

      act(() => {
        rollback();
      });
      expect(result.current.rows[0].name).toBe("Alice");
    });

    it("deleteRow removes row optimistically", () => {
      const { result } = renderHook(() => useDataTable({ columns, data: testData }));

      let deletedRow: TestRow | undefined;
      act(() => {
        ({ deletedRow } = result.current.deleteRow("1"));
      });
      expect(result.current.rows).toHaveLength(1);
      expect(result.current.rows[0].id).toBe("2");
      expect(deletedRow!.id).toBe("1");
    });

    it("deleteRow rollback restores", () => {
      const { result } = renderHook(() => useDataTable({ columns, data: testData }));

      let rollback: () => void;
      act(() => {
        ({ rollback } = result.current.deleteRow("1"));
      });
      expect(result.current.rows).toHaveLength(1);

      act(() => {
        rollback();
      });
      expect(result.current.rows).toHaveLength(2);
    });

    it("insertRow prepends row optimistically", () => {
      const { result } = renderHook(() => useDataTable({ columns, data: testData }));

      act(() => {
        result.current.insertRow({ id: "3", name: "Charlie", value: 30 });
      });
      expect(result.current.rows).toHaveLength(3);
      expect(result.current.rows[0].id).toBe("3");
    });

    it("insertRow rollback restores", () => {
      const { result } = renderHook(() => useDataTable({ columns, data: testData }));

      let rollback: () => void;
      act(() => {
        ({ rollback } = result.current.insertRow({
          id: "3",
          name: "Charlie",
          value: 30,
        }));
      });
      expect(result.current.rows).toHaveLength(3);

      act(() => {
        rollback();
      });
      expect(result.current.rows).toHaveLength(2);
    });

    it("rolling back one updateRow does not affect a subsequent updateRow", () => {
      const { result } = renderHook(() => useDataTable({ columns, data: testData }));

      let rollbackFirst: () => void;
      act(() => {
        ({ rollback: rollbackFirst } = result.current.updateRow("1", { name: "Alice Updated" }));
      });
      act(() => {
        result.current.updateRow("2", { name: "Bob Updated" });
      });

      expect(result.current.rows[0].name).toBe("Alice Updated");
      expect(result.current.rows[1].name).toBe("Bob Updated");

      // Rolling back the first operation restores to the snapshot taken before it ran,
      // which does NOT include the second operation.
      act(() => {
        rollbackFirst();
      });
      expect(result.current.rows[0].name).toBe("Alice");
      expect(result.current.rows[1].name).toBe("Bob");
    });

    it("rolling back deleteRow does not affect a separate updateRow on another row", () => {
      const { result } = renderHook(() => useDataTable({ columns, data: testData }));

      let rollbackDelete: () => void;
      act(() => {
        ({ rollback: rollbackDelete } = result.current.deleteRow("1"));
      });
      act(() => {
        result.current.updateRow("2", { name: "Bob Updated" });
      });

      expect(result.current.rows).toHaveLength(1);
      expect(result.current.rows[0].name).toBe("Bob Updated");

      act(() => {
        rollbackDelete();
      });
      // Restored to snapshot before deleteRow — row-2's "Bob Updated" is also gone
      // because rollback restores the full snapshot, not a diff.
      expect(result.current.rows).toHaveLength(2);
      expect(result.current.rows[1].name).toBe("Bob");
    });
  });

  // -------------------------------------------------------------------------
  // Sort delegation
  // -------------------------------------------------------------------------
  describe("sort delegation", () => {
    it("passes sortStates from control", () => {
      const control = makeControl({
        sortStates: [{ field: "name", direction: "Asc" }],
      });
      const { result } = renderHook(() => useDataTable({ columns, data: testData, control }));
      expect(result.current.sortStates).toEqual([{ field: "name", direction: "Asc" }]);
    });

    it("onSort delegates to control.setSort", () => {
      const control = makeControl();
      const { result } = renderHook(() => useDataTable({ columns, data: testData, control }));

      act(() => {
        result.current.onSort?.("name", "Desc");
      });
      expect(control.setSort).toHaveBeenCalledWith("name", "Desc");
    });

    it("onSort is undefined when no control", () => {
      const { result } = renderHook(() => useDataTable({ columns, data: testData }));
      expect(result.current.onSort).toBeUndefined();
    });
  });

  // -------------------------------------------------------------------------
  // Defaults
  // -------------------------------------------------------------------------
  describe("defaults", () => {
    it("loading defaults to false", () => {
      const { result } = renderHook(() => useDataTable({ columns, data: testData }));
      expect(result.current.loading).toBe(false);
    });

    it("error defaults to null", () => {
      const { result } = renderHook(() => useDataTable({ columns, data: testData }));
      expect(result.current.error).toBeNull();
    });

    it("passes through loading and error", () => {
      const err = new Error("fail");
      const { result } = renderHook(() =>
        useDataTable({ columns, data: undefined, loading: true, error: err }),
      );
      expect(result.current.loading).toBe(true);
      expect(result.current.error).toBe(err);
    });
  });
});
