import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, beforeEach } from "vitest";
import { useDataTable } from "./use-data-table";
import { columns, testData } from "./use-data-table.test-helpers";
import type { Column } from "./types";

describe("useDataTable columns", () => {
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

  describe("column order & pinning", () => {
    it("columnOrder defaults to definition order", () => {
      const { result } = renderHook(() => useDataTable({ columns, data: testData }));
      expect(result.current.columnOrder).toEqual(["name", "value"]);
    });

    it("moveColumn reorders columnOrder and visibleColumns", () => {
      const { result } = renderHook(() => useDataTable({ columns, data: testData }));

      act(() => {
        result.current.moveColumn("value", 0);
      });
      expect(result.current.columnOrder).toEqual(["value", "name"]);
      expect(result.current.visibleColumns.map((column) => column.id)).toEqual(["value", "name"]);
    });

    it("composes multiple moveColumn calls batched before a re-render", () => {
      type Row3 = { id: string; a: string; b: string; c: string };
      const cols: Column<Row3>[] = [
        { id: "a", label: "A", render: (row) => row.a },
        { id: "b", label: "B", render: (row) => row.b },
        { id: "c", label: "C", render: (row) => row.c },
      ];
      const { result } = renderHook(() =>
        useDataTable<Row3>({ columns: cols, data: { rows: [] } }),
      );

      act(() => {
        result.current.moveColumn("a", 2);
        result.current.moveColumn("b", 2);
      });
      expect(result.current.columnOrder).toEqual(["c", "a", "b"]);
    });

    it("keeps hidden columns hidden after a reorder", () => {
      const { result } = renderHook(() => useDataTable({ columns, data: testData }));

      act(() => {
        result.current.toggleColumn("name");
      });
      act(() => {
        result.current.moveColumn("value", 0);
      });
      expect(result.current.isColumnVisible("name")).toBe(false);
      expect(result.current.visibleColumns.map((column) => column.id)).toEqual(["value"]);
    });

    it("setPin sets and clears a pin override", () => {
      const { result } = renderHook(() => useDataTable({ columns, data: testData }));

      act(() => {
        result.current.setPin("name", "left");
      });
      expect(result.current.pinnedColumns).toEqual({ name: "left" });

      act(() => {
        result.current.setPin("name", null);
      });
      expect(result.current.pinnedColumns).toEqual({});
    });
  });

  describe("column state persistence", () => {
    beforeEach(() => {
      localStorage.clear();
    });

    it("persists visibility to localStorage keyed by tableId", () => {
      const { result } = renderHook(() => useDataTable({ columns, data: testData, tableId: "t1" }));

      act(() => {
        result.current.toggleColumn("name");
      });

      const stored = JSON.parse(localStorage.getItem("as:data-table:v1:t1") as string);
      expect(stored.hidden).toContain("name");
    });

    it("restores persisted state on remount with the same tableId", () => {
      const first = renderHook(() => useDataTable({ columns, data: testData, tableId: "t1" }));
      act(() => {
        first.result.current.toggleColumn("name");
        first.result.current.setPin("value", "right");
      });
      first.unmount();

      const { result } = renderHook(() => useDataTable({ columns, data: testData, tableId: "t1" }));
      expect(result.current.isColumnVisible("name")).toBe(false);
      expect(result.current.pinnedColumns).toEqual({ value: "right" });
    });

    it("does not persist when tableId is absent", () => {
      const { result } = renderHook(() => useDataTable({ columns, data: testData }));
      act(() => {
        result.current.toggleColumn("name");
      });
      expect(localStorage.length).toBe(0);
    });

    it("resets to defaults when tableId is cleared (no stale layout leak)", () => {
      const { result, rerender } = renderHook(
        ({ id }: { id?: string }) => useDataTable({ columns, data: testData, tableId: id }),
        { initialProps: { id: "t1" as string | undefined } },
      );
      act(() => {
        result.current.toggleColumn("name");
      });
      expect(result.current.isColumnVisible("name")).toBe(false);

      rerender({ id: undefined });
      expect(result.current.isColumnVisible("name")).toBe(true);
    });

    it("falls back to defaults on corrupt stored state", () => {
      localStorage.setItem("as:data-table:v1:t1", "{ not valid json");
      const { result } = renderHook(() => useDataTable({ columns, data: testData, tableId: "t1" }));
      expect(result.current.visibleColumns).toHaveLength(2);
    });

    it("drops persisted keys no longer present and appends new columns", () => {
      localStorage.setItem(
        "as:data-table:v1:t1",
        JSON.stringify({ order: ["value", "gone"], hidden: [], pinned: {} }),
      );
      const { result } = renderHook(() => useDataTable({ columns, data: testData, tableId: "t1" }));
      expect(result.current.columnOrder).toEqual(["value", "name"]);
    });
  });
});
