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
    endCursor: "token-next",
    startCursor: null,
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
    goToNextPage: vi.fn(),
    goToPrevPage: vi.fn(),
    resetPage: vi.fn(),
    goToFirstPage: vi.fn(),
    goToLastPage: vi.fn(),
    resetCount: 0,
    getHasPrevPage: () => false,
    getHasNextPage: (pageInfo) => pageInfo.hasNextPage,
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
        endCursor: null,
        startCursor: null,
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

    it("forward mode: hasPrevPage is false when cursorStack is empty", () => {
      // Default getHasPrevPage returns false
      const { result } = renderHook(() => useDataTable({ columns, data: testData }));
      expect(result.current.hasPrevPage).toBe(false);
    });

    it("hasPrevPage is true when getHasPrevPage returns true", () => {
      const control = makeControl({
        getHasPrevPage: () => true,
      });
      const { result } = renderHook(() => useDataTable({ columns, data: testData, control }));
      expect(result.current.hasPrevPage).toBe(true);
    });

    it("backward mode: hasPrevPage uses pageInfo.hasPreviousPage", () => {
      const dataWithPrev: DataTableData<TestRow> = {
        rows: testData.rows,
        pageInfo: {
          hasNextPage: false,
          hasPreviousPage: true,
          endCursor: null,
          startCursor: "tok-prev",
        },
        total: 50,
      };
      const control = makeControl({
        getHasPrevPage: (pi) => pi.hasPreviousPage,
      });
      const { result } = renderHook(() => useDataTable({ columns, data: dataWithPrev, control }));
      expect(result.current.hasPrevPage).toBe(true);
    });

    it("forward mode: hasNextPage uses pageInfo.hasNextPage", () => {
      // testData has hasNextPage: true
      const { result } = renderHook(() => useDataTable({ columns, data: testData }));
      expect(result.current.hasNextPage).toBe(true);
    });

    it("forward mode: hasNextPage is false from pageInfo", () => {
      const dataLastPage: DataTableData<TestRow> = {
        rows: testData.rows,
        pageInfo: {
          hasNextPage: false,
          hasPreviousPage: true,
          endCursor: null,
          startCursor: "tok-prev",
        },
        total: 50,
      };
      const { result } = renderHook(() => useDataTable({ columns, data: dataLastPage }));
      expect(result.current.hasNextPage).toBe(false);
    });

    it("hasNextPage is true when getHasNextPage returns true", () => {
      const control = makeControl({
        getHasNextPage: () => true,
      });
      const { result } = renderHook(() => useDataTable({ columns, data: testData, control }));
      expect(result.current.hasNextPage).toBe(true);
    });

    it("hasNextPage is false when getHasNextPage returns false", () => {
      const control = makeControl({
        getHasNextPage: () => false,
      });
      const { result } = renderHook(() => useDataTable({ columns, data: testData, control }));
      expect(result.current.hasNextPage).toBe(false);
    });

    it("delegates goToNextPage to control", () => {
      const control = makeControl();
      const { result } = renderHook(() => useDataTable({ columns, data: testData, control }));

      act(() => {
        result.current.goToNextPage({ endCursor: "tok-1" });
      });
      expect(control.goToNextPage).toHaveBeenCalledWith({ endCursor: "tok-1" });
    });

    it("delegates goToPrevPage to control", () => {
      const control = makeControl();
      const { result } = renderHook(() => useDataTable({ columns, data: testData, control }));

      act(() => {
        result.current.goToPrevPage({ startCursor: "start-tok" });
      });
      expect(control.goToPrevPage).toHaveBeenCalledWith({
        startCursor: "start-tok",
      });
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

    it("onSort calls clearSort then setSort in single mode (default)", () => {
      const control = makeControl();
      const { result } = renderHook(() => useDataTable({ columns, data: testData, control }));

      act(() => {
        result.current.onSort?.("name", "Desc");
      });
      expect(control.clearSort).toHaveBeenCalled();
      expect(control.setSort).toHaveBeenCalledWith("name", "Desc");
    });

    it("onSort does not call clearSort when removing sort (direction undefined) in single mode", () => {
      const control = makeControl();
      const { result } = renderHook(() => useDataTable({ columns, data: testData, control }));

      act(() => {
        result.current.onSort?.("name", undefined);
      });
      expect(control.clearSort).not.toHaveBeenCalled();
      expect(control.setSort).toHaveBeenCalledWith("name", undefined);
    });

    it("onSort delegates directly to control.setSort in multiple mode", () => {
      const control = makeControl();
      const { result } = renderHook(() =>
        useDataTable({
          columns,
          data: testData,
          control,
          sort: { multiple: true },
        }),
      );

      act(() => {
        result.current.onSort?.("name", "Desc");
      });
      expect(control.clearSort).not.toHaveBeenCalled();
      expect(control.setSort).toHaveBeenCalledWith("name", "Desc");
    });

    it("onSort is undefined when sort is false", () => {
      const control = makeControl();
      const { result } = renderHook(() =>
        useDataTable({ columns, data: testData, control, sort: false }),
      );
      expect(result.current.onSort).toBeUndefined();
    });

    it("sortStates is empty when sort is false", () => {
      const control = makeControl({
        sortStates: [{ field: "name", direction: "Asc" }],
      });
      const { result } = renderHook(() =>
        useDataTable({ columns, data: testData, control, sort: false }),
      );
      expect(result.current.sortStates).toEqual([]);
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

  // -------------------------------------------------------------------------
  // Rows without id
  // -------------------------------------------------------------------------
  describe("rows without id", () => {
    type PartialRow = { id?: string; name: string };
    const columnsPartial: Column<PartialRow>[] = [
      { id: "name", label: "Name", render: (r) => r.name },
    ];
    const dataWithMissingId: DataTableData<PartialRow> = {
      rows: [
        { id: "1", name: "Alice" },
        { name: "Bob" }, // no id
        { id: "3", name: "Carol" },
      ],
    };

    it("isRowSelected returns false for a row without id", () => {
      const { result } = renderHook(() =>
        useDataTable({
          columns: columnsPartial,
          data: dataWithMissingId,
          onSelectionChange: vi.fn(),
        }),
      );
      expect(result.current.isRowSelected(dataWithMissingId.rows[1])).toBe(false);
    });

    it("toggleRowSelection is a no-op for rows without id", () => {
      const onSelectionChange = vi.fn();
      const { result } = renderHook(() =>
        useDataTable({
          columns: columnsPartial,
          data: dataWithMissingId,
          onSelectionChange,
        }),
      );

      act(() => {
        result.current.toggleRowSelection!(dataWithMissingId.rows[1]);
      });

      expect(result.current.selectedIds).toEqual([]);
      expect(onSelectionChange).not.toHaveBeenCalled();
    });

    it("selectAllRows only selects rows that have an id", () => {
      const onSelectionChange = vi.fn();
      const { result } = renderHook(() =>
        useDataTable({
          columns: columnsPartial,
          data: dataWithMissingId,
          onSelectionChange,
        }),
      );

      act(() => {
        result.current.selectAllRows!();
      });

      expect(result.current.selectedIds).toEqual(["1", "3"]);
      expect(onSelectionChange).toHaveBeenCalledWith(["1", "3"]);
    });

    it("isAllSelected is true when all rows with id are selected (even if some lack id)", () => {
      const onSelectionChange = vi.fn();
      const { result } = renderHook(() =>
        useDataTable({
          columns: columnsPartial,
          data: dataWithMissingId,
          onSelectionChange,
        }),
      );

      act(() => {
        result.current.selectAllRows!();
      });

      expect(result.current.isAllSelected).toBe(true);
    });
  });
});
