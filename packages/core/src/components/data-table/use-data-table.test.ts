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
      const control = makeControl({ pageSize: 10 });
      const { result } = renderHook(() => useDataTable({ columns, data: testData, control }));
      expect(result.current.totalPages).toBe(5); // 50 / 10
    });

    it("returns null totalPages when total is not provided", () => {
      const control = makeControl({ pageSize: 10 });
      const { result } = renderHook(() => useDataTable({ columns, data: { rows: [] }, control }));
      expect(result.current.totalPages).toBeNull();
    });

    it("reflects hasPreviousPage: false from pageInfo", () => {
      // testData has hasPreviousPage: false
      const { result } = renderHook(() => useDataTable({ columns, data: testData }));
      expect(result.current.hasPrevPage).toBe(false);
    });

    it("reflects hasPreviousPage: true from pageInfo", () => {
      const dataWithPrev: DataTableData<TestRow> = {
        rows: testData.rows,
        pageInfo: {
          hasNextPage: false,
          hasPreviousPage: true,
          nextPageToken: null,
          previousPageToken: "tok-prev",
        },
        total: 50,
      };
      const { result } = renderHook(() => useDataTable({ columns, data: dataWithPrev }));
      expect(result.current.hasPrevPage).toBe(true);
    });

    it("reflects hasNextPage: true from pageInfo", () => {
      // testData has hasNextPage: true
      const { result } = renderHook(() => useDataTable({ columns, data: testData }));
      expect(result.current.hasNextPage).toBe(true);
    });

    it("reflects hasNextPage: false from pageInfo", () => {
      const dataLastPage: DataTableData<TestRow> = {
        rows: testData.rows,
        pageInfo: {
          hasNextPage: false,
          hasPreviousPage: true,
          nextPageToken: null,
          previousPageToken: "tok-prev",
        },
        total: 50,
      };
      const { result } = renderHook(() => useDataTable({ columns, data: dataLastPage }));
      expect(result.current.hasNextPage).toBe(false);
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

  // -------------------------------------------------------------------------
  // Row selection
  // -------------------------------------------------------------------------
  describe("row selection", () => {
    it("selectedIds is empty by default", () => {
      const { result } = renderHook(() =>
        useDataTable({ columns, data: testData, onSelectionChange: vi.fn() }),
      );
      expect(result.current.selectedIds).toEqual([]);
    });

    it("isRowSelected returns false for unselected row", () => {
      const { result } = renderHook(() =>
        useDataTable({ columns, data: testData, onSelectionChange: vi.fn() }),
      );
      expect(result.current.isRowSelected(testData.rows[0])).toBe(false);
    });

    it("toggleRowSelection selects a row", () => {
      const onSelectionChange = vi.fn();
      const { result } = renderHook(() =>
        useDataTable({ columns, data: testData, onSelectionChange }),
      );

      act(() => {
        result.current.toggleRowSelection!(testData.rows[0]);
      });

      expect(result.current.isRowSelected(testData.rows[0])).toBe(true);
      expect(result.current.selectedIds).toEqual(["1"]);
      expect(onSelectionChange).toHaveBeenCalledWith(["1"]);
    });

    it("toggleRowSelection deselects an already-selected row", () => {
      const onSelectionChange = vi.fn();
      const { result } = renderHook(() =>
        useDataTable({ columns, data: testData, onSelectionChange }),
      );

      act(() => {
        result.current.toggleRowSelection!(testData.rows[0]);
      });
      act(() => {
        result.current.toggleRowSelection!(testData.rows[0]);
      });

      expect(result.current.isRowSelected(testData.rows[0])).toBe(false);
      expect(result.current.selectedIds).toEqual([]);
    });

    it("selectAllRows selects every row on current page", () => {
      const onSelectionChange = vi.fn();
      const { result } = renderHook(() =>
        useDataTable({ columns, data: testData, onSelectionChange }),
      );

      act(() => {
        result.current.selectAllRows!();
      });

      expect(result.current.selectedIds).toEqual(["1", "2"]);
      expect(result.current.isAllSelected).toBe(true);
      expect(result.current.isIndeterminate).toBe(false);
      expect(onSelectionChange).toHaveBeenCalledWith(["1", "2"]);
    });

    it("clearSelection removes all selections", () => {
      const onSelectionChange = vi.fn();
      const { result } = renderHook(() =>
        useDataTable({ columns, data: testData, onSelectionChange }),
      );

      act(() => {
        result.current.selectAllRows!();
      });
      act(() => {
        result.current.clearSelection!();
      });

      expect(result.current.selectedIds).toEqual([]);
      expect(result.current.isAllSelected).toBe(false);
      expect(onSelectionChange).toHaveBeenLastCalledWith([]);
    });

    it("isIndeterminate is true when some but not all rows are selected", () => {
      const { result } = renderHook(() =>
        useDataTable({ columns, data: testData, onSelectionChange: vi.fn() }),
      );

      act(() => {
        result.current.toggleRowSelection!(testData.rows[0]);
      });

      expect(result.current.isIndeterminate).toBe(true);
      expect(result.current.isAllSelected).toBe(false);
    });

    it("selectedIds persists across rows update (simulates page change)", () => {
      const onSelectionChange = vi.fn();
      const { result, rerender } = renderHook(
        ({ data }: { data: DataTableData<TestRow> }) =>
          useDataTable({ columns, data, onSelectionChange }),
        { initialProps: { data: testData } },
      );

      act(() => {
        result.current.toggleRowSelection!(testData.rows[0]);
      });
      expect(result.current.selectedIds).toEqual(["1"]);

      // Simulate page change: rows are replaced with a different page
      const nextPageData: DataTableData<TestRow> = {
        rows: [
          { id: "3", name: "Carol", value: 30 },
          { id: "4", name: "Dave", value: 40 },
        ],
      };
      rerender({ data: nextPageData });

      // ID "1" is still in selectedIds even though it's not in current rows
      expect(result.current.selectedIds).toEqual(["1"]);
    });

    it("toggleRowSelection is undefined when onSelectionChange is not provided", () => {
      const { result } = renderHook(() => useDataTable({ columns, data: testData }));

      expect(result.current.toggleRowSelection).toBeUndefined();
      expect(result.current.selectAllRows).toBeUndefined();
      expect(result.current.clearSelection).toBeUndefined();
    });
  });
});
