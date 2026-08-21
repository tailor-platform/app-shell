import { renderHook, act } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { useDataTable } from "./use-data-table";
import { columns, makeControl, testData, type TestRow } from "./use-data-table.test-helpers";
import type { DataTableData } from "./types";

describe("useDataTable", () => {
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

  describe("pagination derivation", () => {
    it("derives totalPages from total and pageSize", () => {
      const control = makeControl({ pageSize: 10 });
      const { result } = renderHook(() => useDataTable({ columns, data: testData, control }));
      expect(result.current.totalPages).toBe(5);
    });

    it("returns null totalPages when total is not provided", () => {
      const control = makeControl({ pageSize: 10 });
      const { result } = renderHook(() => useDataTable({ columns, data: { rows: [] }, control }));
      expect(result.current.totalPages).toBeNull();
    });

    it("forward mode: hasPrevPage is false when cursorStack is empty", () => {
      const { result } = renderHook(() => useDataTable({ columns, data: testData }));
      expect(result.current.hasPrevPage).toBe(false);
    });

    it("hasPrevPage is true when getHasPrevPage returns true", () => {
      const control = makeControl({ getHasPrevPage: () => true });
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
      const control = makeControl({ getHasPrevPage: (pageInfo) => pageInfo.hasPreviousPage });
      const { result } = renderHook(() => useDataTable({ columns, data: dataWithPrev, control }));
      expect(result.current.hasPrevPage).toBe(true);
    });

    it("forward mode: hasNextPage uses pageInfo.hasNextPage", () => {
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
      const control = makeControl({ getHasNextPage: () => true });
      const { result } = renderHook(() => useDataTable({ columns, data: testData, control }));
      expect(result.current.hasNextPage).toBe(true);
    });

    it("hasNextPage is false when getHasNextPage returns false", () => {
      const control = makeControl({ getHasNextPage: () => false });
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
      expect(control.goToPrevPage).toHaveBeenCalledWith({ startCursor: "start-tok" });
    });
  });

  describe("sort delegation", () => {
    it("passes sortStates from control", () => {
      const control = makeControl({ sortStates: [{ field: "name", direction: "Asc" }] });
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
      const control = makeControl({ sortStates: [{ field: "name", direction: "Asc" }] });
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
      const error = new Error("fail");
      const { result } = renderHook(() =>
        useDataTable({ columns, data: undefined, loading: true, error }),
      );
      expect(result.current.loading).toBe(true);
      expect(result.current.error).toBe(error);
    });
  });
});
