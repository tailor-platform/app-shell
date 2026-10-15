import { act, cleanup, fireEvent, render, renderHook, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, expectTypeOf, it, vi } from "vitest";
import type { RowSelectionOptions } from "@/index";
import { createAppShellWrapper } from "../../../tests/test-utils";
import { DataTable } from "./data-table";
import { useDataTable } from "./use-data-table";
import type { Column, DataTableData } from "./types";

type Row = { id: string; name: string };
const columns: Column<Row>[] = [{ label: "Name", render: (row) => row.name }];
const pageA: DataTableData<Row> = {
  rows: [
    { id: "1", name: "Alice" },
    { id: "2", name: "Bob" },
  ],
};
const pageB: DataTableData<Row> = { rows: [{ id: "3", name: "Carol" }] };
const wrapper = createAppShellWrapper("en");

afterEach(() => cleanup());

function renderControlled(
  initialSelectedIds = ["1"],
  initialData: DataTableData<Row> | undefined = pageA,
) {
  const onChange = vi.fn();
  return {
    ...renderHook(
      ({ selectedIds, data }) =>
        useDataTable({ columns, data, rowSelection: { selectedIds, onChange } }),
      { initialProps: { selectedIds: initialSelectedIds, data: initialData } },
    ),
    onChange,
  };
}

function ControlledTable({
  selectedIds,
  data,
  onChange,
  onBulk,
}: {
  selectedIds: string[];
  data: DataTableData<Row>;
  onChange: (ids: string[]) => void;
  onBulk: (rows: Row[]) => void;
}) {
  const table = useDataTable({
    columns,
    data,
    rowSelection: { selectedIds, onChange },
    selectionActions: [{ id: "archive", label: "Archive", onClick: onBulk }],
  });
  return (
    <DataTable.Root value={table}>
      <DataTable.Table />
      <DataTable.Footer />
    </DataTable.Root>
  );
}

describe("rowSelection", () => {
  it("initializes uncontrolled selection once and composes changes in one commit", () => {
    const onChange = vi.fn();
    const { result, rerender } = renderHook(
      ({ defaults }) =>
        useDataTable({
          columns,
          data: pageA,
          rowSelection: { defaultSelectedIds: defaults, onChange },
        }),
      { initialProps: { defaults: ["1"] } },
    );
    expect(result.current.selectedIds).toEqual(["1"]);
    expect(onChange).not.toHaveBeenCalled();
    rerender({ defaults: ["2"] });
    expect(result.current.selectedIds).toEqual(["1"]);
    act(() => {
      result.current.clearSelection!();
      result.current.toggleRowSelection!(pageA.rows[1]);
    });
    expect(result.current.selectedIds).toEqual(["2"]);
    expect(onChange).toHaveBeenLastCalledWith(["2"]);
  });

  it("notifies once per interaction under StrictMode", () => {
    const onChange = vi.fn();
    const { result } = renderHook(
      () => useDataTable({ columns, data: pageA, rowSelection: { onChange } }),
      { reactStrictMode: true },
    );
    act(() => result.current.toggleRowSelection!(pageA.rows[0]));
    expect(onChange).toHaveBeenCalledExactlyOnceWith(["1"]);
  });

  it.each([false, true])("uses the new callback when supplied: %s", (useNewCallback) => {
    const legacy = vi.fn();
    const current = vi.fn();
    const { result } = renderHook(() =>
      useDataTable({
        columns,
        data: pageA,
        onSelectionChange: legacy,
        rowSelection: { onChange: useNewCallback ? current : undefined },
      }),
    );
    expect(legacy).not.toHaveBeenCalled();
    expect(current).not.toHaveBeenCalled();
    act(() => result.current.toggleRowSelection!(pageA.rows[0]));
    expect(useNewCallback ? current : legacy).toHaveBeenCalledExactlyOnceWith(["1"]);
    expect(useNewCallback ? legacy : current).not.toHaveBeenCalled();
    expect(result.current.selectedIds).toEqual(["1"]);
  });

  it("waits for controlled props, including externally changed selection", () => {
    const { result, rerender, onChange } = renderControlled([]);
    act(() => result.current.toggleRowSelection!(pageA.rows[0]));
    expect(onChange).toHaveBeenCalledExactlyOnceWith(["1"]);
    expect(result.current.selectedIds).toEqual([]);
    expect(result.current.isRowSelected(pageA.rows[0])).toBe(false);
    rerender({ selectedIds: ["2"], data: pageA });
    expect(result.current.selectedIds).toEqual(["2"]);
    expect(result.current.selectedRows).toEqual([pageA.rows[1]]);
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("keeps controlled proposals page-scoped and retains history when clear is rejected", () => {
    const { result, rerender, onChange } = renderControlled(["1", "3"]);
    rerender({ selectedIds: ["1", "3"], data: pageB });
    act(() => result.current.deselectAllRows!());
    expect(onChange).toHaveBeenLastCalledWith(["1"]);
    expect(result.current.selectedIds).toEqual(["1", "3"]);
    act(() => result.current.clearSelection!());
    expect(onChange).toHaveBeenLastCalledWith([]);
    expect(result.current.selectedRows).toEqual([pageA.rows[0], pageB.rows[0]]);
    rerender({ selectedIds: ["1"], data: pageB });
    act(() => result.current.selectAllRows!());
    expect(onChange).toHaveBeenLastCalledWith(["1", "3"]);
    expect(result.current.selectedIds).toEqual(["1"]);
    expect(result.current.selectedRows).toEqual([pageA.rows[0]]);
  });

  it("derives repeated controlled commands from the owner's committed ids", () => {
    const { result, onChange } = renderControlled([]);
    act(() => {
      result.current.toggleRowSelection!(pageA.rows[0]);
      result.current.toggleRowSelection!(pageA.rows[1]);
    });
    expect(onChange.mock.calls).toEqual([[["1"]], [["2"]]]);
    expect(result.current.selectedIds).toEqual([]);
  });

  it.each(["controlled", "uncontrolled"] as const)(
    "remembers loaded preselected rows in %s mode",
    (mode) => {
      const onChange = vi.fn();
      const ids = ["1", "unseen"];
      const { result, rerender } = renderHook(
        ({ data }: { data: DataTableData<Row> | undefined }) =>
          useDataTable({
            columns,
            data,
            rowSelection:
              mode === "controlled"
                ? { selectedIds: ids, onChange }
                : { defaultSelectedIds: ids, onChange },
          }),
        { initialProps: { data: undefined as DataTableData<Row> | undefined } },
      );
      expect(result.current.selectedIds).toEqual(ids);
      expect(result.current.selectedRows).toEqual([]);
      rerender({ data: pageA });
      expect(result.current.selectedRows).toEqual([pageA.rows[0]]);
      const updated = { id: "1", name: "Alice updated" };
      rerender({ data: { rows: [updated] } });
      rerender({ data: pageB });
      expect(result.current.selectedRows).toEqual([updated]);
      expect(onChange).not.toHaveBeenCalled();
    },
  );

  it("keeps refetched uncontrolled rows when selection changes on another page", () => {
    const { result, rerender } = renderHook(
      ({ data }) => useDataTable({ columns, data, rowSelection: {} }),
      { initialProps: { data: pageA } },
    );
    act(() => result.current.toggleRowSelection!(pageA.rows[0]));
    const updated = { id: "1", name: "Alice updated" };
    rerender({ data: { rows: [updated] } });
    rerender({ data: pageB });
    expect(result.current.selectedRows).toEqual([updated]);
    act(() => result.current.selectAllRows!());
    expect(result.current.selectedRows).toEqual([updated, pageB.rows[0]]);
    act(() => result.current.deselectAllRows!());
    expect(result.current.selectedRows).toEqual([updated]);
  });

  it("remembers external preselection without any table interaction", () => {
    const { result, rerender, onChange } = renderControlled([]);
    rerender({ selectedIds: ["2"], data: pageA });
    rerender({ selectedIds: ["2"], data: pageB });
    expect(result.current.selectedRows).toEqual([pageA.rows[1]]);
    expect(onChange).not.toHaveBeenCalled();
  });

  it("remembers a toggled row when its owner selects it and changes page in the same commit", () => {
    const { result } = renderHook(() => {
      const [state, setState] = useState({ selectedIds: [] as string[], data: pageA });
      return useDataTable({
        columns,
        data: state.data,
        rowSelection: {
          selectedIds: state.selectedIds,
          onChange: (selectedIds) => setState({ selectedIds, data: pageB }),
        },
      });
    });
    act(() => result.current.toggleRowSelection!(pageA.rows[0]));
    expect(result.current.rows).toEqual(pageB.rows);
    expect(result.current.selectedRows).toEqual([pageA.rows[0]]);
  });

  it("handles fresh inline selected ids and rows without a render loop", () => {
    const onChange = vi.fn();
    const { result, rerender } = renderHook(() =>
      useDataTable({
        columns,
        data: { rows: [{ id: "1", name: "Alice" }] },
        rowSelection: { selectedIds: ["1"], onChange },
      }),
    );
    rerender();
    expect(result.current.selectedRows).toEqual([pageA.rows[0]]);
    expect(onChange).not.toHaveBeenCalled();
  });

  it.each([{ selectedIds: [] }, { selectedIds: ["2"] }])(
    "consults the latest selection and callback when an action settles: %j",
    async ({ selectedIds }) => {
      const first = vi.fn();
      const latest = vi.fn();
      let resolve!: () => void;
      const request = new Promise<void>((done) => {
        resolve = done;
      });
      const { result, rerender } = renderHook(
        ({ ids, onChange }) =>
          useDataTable({ columns, data: pageA, rowSelection: { selectedIds: ids, onChange } }),
        { initialProps: { ids: ["1"], onChange: first } },
      );
      act(() => result.current.runSelectionAction!({ id: "archive" }, request));
      rerender({ ids: selectedIds, onChange: latest });
      await act(async () => {
        resolve();
        await request;
      });
      expect(first).not.toHaveBeenCalled();
      if (selectedIds.length) expect(latest).toHaveBeenCalledExactlyOnceWith([]);
      else expect(latest).not.toHaveBeenCalled();
      expect(result.current.pendingActionId).toBeNull();
    },
  );

  it("drives real checkboxes and bulk actions from controlled selection", () => {
    const onChange = vi.fn();
    const onBulk = vi.fn();
    const { rerender } = render(
      <ControlledTable selectedIds={[]} data={pageA} onChange={onChange} onBulk={onBulk} />,
      { wrapper },
    );
    const checkbox = screen.getAllByLabelText("Select row")[0];
    fireEvent.click(checkbox);
    expect(onChange).toHaveBeenCalledExactlyOnceWith(["1"]);
    expect(checkbox.getAttribute("aria-checked")).toBe("false");
    rerender(
      <ControlledTable selectedIds={["1"]} data={pageA} onChange={onChange} onBulk={onBulk} />,
    );
    expect(screen.getAllByLabelText("Select row")[0].getAttribute("aria-checked")).toBe("true");
    rerender(
      <ControlledTable selectedIds={["1"]} data={pageB} onChange={onChange} onBulk={onBulk} />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Archive" }));
    expect(onBulk).toHaveBeenCalledWith(
      [pageA.rows[0]],
      expect.objectContaining({ clearSelection: expect.any(Function) }),
    );
    rerender(
      <ControlledTable selectedIds={["unseen"]} data={pageB} onChange={onChange} onBulk={onBulk} />,
    );
    const archive = screen.getByRole("button", { name: "Archive" });
    expect(archive.hasAttribute("disabled")).toBe(true);
    fireEvent.click(archive);
    expect(onBulk).toHaveBeenCalledTimes(1);
  });

  it("requires an owner callback for controlled ids and rejects mixing controlled/default ids", () => {
    expectTypeOf<{ selectedIds: string[] }>().not.toMatchTypeOf<RowSelectionOptions>();
    expectTypeOf<{
      selectedIds: string[];
      onChange: (ids: string[]) => void;
      defaultSelectedIds: string[];
    }>().not.toMatchTypeOf<RowSelectionOptions>();
    expectTypeOf<{
      selectedIds: string[];
      onChange: (ids: string[]) => void;
    }>().toMatchTypeOf<RowSelectionOptions>();
    expectTypeOf<{ defaultSelectedIds: string[] }>().toMatchTypeOf<RowSelectionOptions>();
  });
});
