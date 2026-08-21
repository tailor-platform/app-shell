import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { useDataTable } from "./use-data-table";
import { columns, testData } from "./use-data-table.test-helpers";
import type { Column, DataTableData } from "./types";

describe("useDataTable selection", () => {
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
        ({ data }: { data: DataTableData<(typeof testData.rows)[number]> }) =>
          useDataTable({ columns, data, onSelectionChange }),
        { initialProps: { data: testData } },
      );

      act(() => {
        result.current.toggleRowSelection!(testData.rows[0]);
      });
      expect(result.current.selectedIds).toEqual(["1"]);

      const nextPageData: DataTableData<(typeof testData.rows)[number]> = {
        rows: [
          { id: "3", name: "Carol", value: 30 },
          { id: "4", name: "Dave", value: 40 },
        ],
      };
      rerender({ data: nextPageData });

      expect(result.current.selectedIds).toEqual(["1"]);
    });

    it("toggleRowSelection is undefined when onSelectionChange is not provided", () => {
      const { result } = renderHook(() => useDataTable({ columns, data: testData }));

      expect(result.current.toggleRowSelection).toBeUndefined();
      expect(result.current.selectAllRows).toBeUndefined();
      expect(result.current.clearSelection).toBeUndefined();
    });
  });

  describe("rows without id", () => {
    type PartialRow = { id?: string; name: string };
    const columnsPartial: Column<PartialRow>[] = [
      { id: "name", label: "Name", render: (row) => row.name },
    ];
    const dataWithMissingId: DataTableData<PartialRow> = {
      rows: [{ id: "1", name: "Alice" }, { name: "Bob" }, { id: "3", name: "Carol" }],
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
