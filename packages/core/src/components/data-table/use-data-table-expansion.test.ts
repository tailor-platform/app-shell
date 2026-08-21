import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { useDataTable } from "./use-data-table";
import { columns, testData } from "./use-data-table.test-helpers";

describe("useDataTable expansion", () => {
  const rowExpansion = {
    render: () => null,
    getLabel: (row: (typeof testData.rows)[number]) => row.name,
  };

  it("returns expansion helpers only when rowExpansion is provided", () => {
    const { result } = renderHook(() => useDataTable({ columns, data: testData }));

    expect(result.current.toggleRowExpansion).toBeUndefined();
    expect(result.current.collapseAllRows).toBeUndefined();
    expect(result.current.expandedIds).toEqual([]);
  });

  it("toggles an uncontrolled expanded row", () => {
    const onChange = vi.fn();
    const { result } = renderHook(() =>
      useDataTable({
        columns,
        data: testData,
        rowExpansion: { ...rowExpansion, onChange },
      }),
    );

    act(() => {
      result.current.toggleRowExpansion!(testData.rows[0]);
    });

    expect(result.current.expandedIds).toEqual(["1"]);
    expect(result.current.isRowExpanded(testData.rows[0])).toBe(true);
    expect(onChange).toHaveBeenCalledWith(["1"]);
  });

  it("collapseAllRows clears uncontrolled expansion", () => {
    const onChange = vi.fn();
    const { result } = renderHook(() =>
      useDataTable({
        columns,
        data: testData,
        rowExpansion: { ...rowExpansion, onChange },
      }),
    );

    act(() => {
      result.current.toggleRowExpansion!(testData.rows[0]);
    });
    act(() => {
      result.current.collapseAllRows!();
    });

    expect(result.current.expandedIds).toEqual([]);
    expect(result.current.isRowExpanded(testData.rows[0])).toBe(false);
    expect(onChange).toHaveBeenLastCalledWith([]);
  });

  it("reports controlled toggles without mutating internal state", () => {
    const onChange = vi.fn();
    const { result } = renderHook(() =>
      useDataTable({
        columns,
        data: testData,
        rowExpansion: { ...rowExpansion, expandedIds: [], onChange },
      }),
    );

    act(() => {
      result.current.toggleRowExpansion!(testData.rows[0]);
    });

    expect(result.current.expandedIds).toEqual([]);
    expect(result.current.isRowExpanded(testData.rows[0])).toBe(false);
    expect(onChange).toHaveBeenCalledWith(["1"]);
  });

  it("ignores rows without id", () => {
    const onChange = vi.fn();
    const { result } = renderHook(() =>
      useDataTable({
        columns: [
          { id: "name", label: "Name", render: (row: { id?: string; name: string }) => row.name },
        ],
        data: { rows: [{ name: "No ID" }] },
        rowExpansion: { render: () => null, onChange },
      }),
    );

    act(() => {
      result.current.toggleRowExpansion!({ name: "No ID" });
    });

    expect(result.current.expandedIds).toEqual([]);
    expect(onChange).not.toHaveBeenCalled();
  });
});
