import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createAppShellWrapper } from "../../../tests/test-utils";
import { useLineItems } from "./use-line-items";
import type { RowSelectionOptions } from "@/components/internals/table-core/selection-types";
import type { LineItemsColumn } from "./types";

afterEach(cleanup);
type Row = { id?: string; name: string };
const columns: LineItemsColumn<Row>[] = [{ accessorKey: "name", label: "Name" }];
const rows = [
  { id: "A", name: "Match A" },
  { id: "B", name: "Other" },
  { id: "C", name: "Match C" },
];
const wrapper = createAppShellWrapper("en");
function setup(rowSelection?: RowSelectionOptions, schema = columns) {
  return renderHook(
    (options: RowSelectionOptions | undefined) =>
      useLineItems<Row>({
        columns: schema,
        defaultLines: rows,
        orderer: "manual",
        rowSelection: options,
      }),
    { initialProps: rowSelection, wrapper },
  );
}

describe("useLineItems DataTable-compatible selection", () => {
  it("is opt-in, initializes once, and keeps selection out of document dirty state", () => {
    const disabled = setup();
    expect(disabled.result.current.toggleRowSelection).toBeUndefined();
    disabled.unmount();
    const onChange = vi.fn();
    const hook = setup({ defaultSelectedIds: ["A", "missing"], onChange });
    expect(hook.result.current.selectedIds).toEqual(["A"]);
    expect(onChange).not.toHaveBeenCalled();
    hook.rerender({ defaultSelectedIds: ["B"], onChange });
    expect(hook.result.current.selectedIds).toEqual(["A"]);
    expect(hook.result.current.hasUnsavedChanges()).toBe(false);
  });

  it("composes uncontrolled commands before React commits and notifies once per command", () => {
    const onChange = vi.fn();
    const { result } = setup({ onChange });
    act(() => {
      result.current.toggleRowSelection!(result.current.allLines[0]!);
      result.current.toggleRowSelection!(result.current.allLines[1]!);
    });
    expect(result.current.selectedIds).toEqual(["A", "B"]);
    expect(onChange.mock.calls).toEqual([[["A"]], [["A", "B"]]]);
    act(() => {
      result.current.clearSelection!();
      result.current.clearSelection!();
    });
    expect(onChange).toHaveBeenCalledTimes(3);
    expect(result.current.getChangeSet().isEmpty).toBe(true);
  });

  it("uses the latest committed controlled owner for retained commands", () => {
    const first = vi.fn();
    const hook = setup({ selectedIds: ["A"], onChange: first });
    const toggle = hook.result.current.toggleRowSelection!;
    const rowA = hook.result.current.allLines[0]!;
    const rowB = hook.result.current.allLines[1]!;
    act(() => toggle(rowB));
    expect(first).toHaveBeenCalledWith(["A", "B"]);
    expect(hook.result.current.selectedIds).toEqual(["A"]);
    const second = vi.fn();
    hook.rerender({ selectedIds: ["B"], onChange: second });
    act(() => toggle(rowA));
    expect(second).toHaveBeenCalledWith(["B", "A"]);
    expect(first).toHaveBeenCalledTimes(1);
  });

  it("selects only visible matches while retaining hidden selection, just like page-scoped DataTable selection", () => {
    const { result } = setup({});
    act(() => result.current.toggleRowSelection!(result.current.allLines[1]!));
    act(() => result.current.setSearchQuery("Match"));
    expect(result.current.isIndeterminate).toBe(true);
    act(() => result.current.selectAllRows!());
    expect(result.current.selectedIds).toEqual(["B", "A", "C"]);
    expect(result.current.isAllSelected).toBe(true);
    act(() => result.current.deselectAllRows!());
    expect(result.current.selectedIds).toEqual(["B"]);
    expect(result.current.hasUnsavedChanges()).toBe(false);
  });

  it("prunes removed lines and does not resurrect their selection on Discard", () => {
    const { result } = setup({ defaultSelectedIds: ["A", "B"] });
    act(() => result.current.removeLine("A"));
    expect(result.current.selectedIds).toEqual(["B"]);
    act(() => result.current.revert());
    expect(result.current.selectedIds).toEqual(["B"]);
    expect(result.current.hasUnsavedChanges()).toBe(false);
  });

  it("reconciles selected temporary keys to canonical server IDs on acknowledgment", () => {
    const schema: LineItemsColumn<Row>[] = [
      columns[0]!,
      { accessorKey: "id", label: "ID", normalize: (id) => id?.toLowerCase() },
    ];
    const onChange = vi.fn();
    const { result } = setup({ onChange }, schema);
    let key!: string;
    act(() => {
      key = result.current.addLine({ name: "New" });
    });
    act(() => result.current.toggleRowSelection!(result.current.allLines.at(-1)!));
    const sent = result.current.getChangeSet();
    act(() => result.current.reset({ idMap: { [key]: "n" } }, { sent }));
    expect(result.current.selectedIds).toEqual(["n"]);
    expect(onChange).toHaveBeenLastCalledWith(["n"]);
    expect(result.current.hasUnsavedChanges()).toBe(false);
  });

  it("notifies controlled selection owners when acknowledgment changes a selected key", () => {
    const onChange = vi.fn();
    const hook = setup({ selectedIds: [], onChange });
    let key!: string;
    act(() => {
      key = hook.result.current.addLine({ name: "New" });
    });
    hook.rerender({ selectedIds: [key], onChange });
    const sent = hook.result.current.getChangeSet();
    act(() => hook.result.current.reset({ idMap: { [key]: "N" } }, { sent }));
    expect(onChange).toHaveBeenLastCalledWith(["N"]);
    hook.rerender({ selectedIds: ["N"], onChange });
    expect(hook.result.current.selectedIds).toEqual(["N"]);
  });

  it("does not change selection when a document command rejects", () => {
    const { result } = setup({ defaultSelectedIds: ["A"] });
    expect(() => act(() => result.current.removeLine("missing"))).toThrow();
    expect(result.current.selectedIds).toEqual(["A"]);
    expect(result.current.getChangeSet().isEmpty).toBe(true);
  });
});
