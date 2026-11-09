import {
  act,
  cleanup,
  fireEvent,
  render,
  renderHook,
  screen,
  within,
} from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, expectTypeOf, it, vi } from "vitest";
import type {
  DataTableContextValue,
  RowSelectionOptions,
  SelectionAction,
  UseDataTableReturn,
} from "@/index";
import { createAppShellWrapper } from "../../../tests/test-utils";
import { DataTable } from "./data-table";
import { useDataTable } from "./use-data-table";
import type { Column, DataTableData, UseDataTableOptions } from "./types";
import { TestDataTable, testColumns, testData, strictWrapper, type TestRow } from "./test-utils";

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
  onBulk: SelectionAction["onClick"];
}) {
  const table = useDataTable({
    columns,
    data,
    rowSelection: {
      selectedIds,
      onChange,
      actions: [{ id: "archive", label: "Archive", onClick: onBulk }],
    },
  });
  return (
    <DataTable.Root value={table}>
      <DataTable.Table />
      <DataTable.Footer />
    </DataTable.Root>
  );
}

describe("DataTable", () => {
  describe("row selection", () => {
    it("renders checkboxes when onSelectionChange is provided", () => {
      render(<TestDataTable onSelectionChange={vi.fn()} />, { wrapper });

      const checkboxes = screen.getAllByRole("checkbox");
      // 1 header checkbox + 2 row checkboxes
      expect(checkboxes).toHaveLength(3);
    });

    it("does not render checkboxes when onSelectionChange is not provided", () => {
      render(<TestDataTable />, { wrapper });

      expect(screen.queryByLabelText("Select all rows")).toBeNull();
      expect(screen.queryByLabelText("Select row")).toBeNull();
    });

    it("clicking a row checkbox calls onSelectionChange with the row id", () => {
      const onSelectionChange = vi.fn();
      render(<TestDataTable onSelectionChange={onSelectionChange} />, {
        wrapper,
      });

      const checkboxes = screen.getAllByRole("checkbox");
      // checkboxes[0] = header, checkboxes[1] = Alice (id "1")
      fireEvent.click(checkboxes[1]);

      expect(onSelectionChange).toHaveBeenCalledWith(["1"]);
    });

    it("calls onSelectionChange once per toggle under StrictMode", () => {
      const onSelectionChange = vi.fn();
      render(<TestDataTable onSelectionChange={onSelectionChange} />, {
        wrapper: strictWrapper,
      });

      fireEvent.click(screen.getAllByRole("checkbox")[1]);

      expect(onSelectionChange).toHaveBeenCalledTimes(1);
      expect(onSelectionChange).toHaveBeenCalledWith(["1"]);
    });

    it("clicking the header checkbox selects all rows", () => {
      const onSelectionChange = vi.fn();
      render(<TestDataTable onSelectionChange={onSelectionChange} />, {
        wrapper,
      });

      const checkboxes = screen.getAllByRole("checkbox");
      fireEvent.click(checkboxes[0]);

      expect(onSelectionChange).toHaveBeenCalledWith(["1", "2"]);
    });

    it("composes several toggles dispatched in one commit", () => {
      // Consumer code like `overdue.forEach((r) => toggleRowSelection(r))`.
      // Every built-in affordance fires exactly one toggle per commit, so this
      // is only reachable through the public API.
      const onSelectionChange = vi.fn();
      const { result } = renderHook(() =>
        useDataTable<TestRow>({
          columns: testColumns,
          data: testData,
          onSelectionChange,
        }),
      );

      act(() => {
        result.current.toggleRowSelection?.(testData.rows[0]);
        result.current.toggleRowSelection?.(testData.rows[1]);
      });

      expect(result.current.selectedIds).toEqual(["1", "2"]);
      expect(onSelectionChange).toHaveBeenLastCalledWith(["1", "2"]);
    });

    it("applies clearSelection before a toggle in the same commit", () => {
      const onSelectionChange = vi.fn();
      const { result } = renderHook(() =>
        useDataTable<TestRow>({
          columns: testColumns,
          data: testData,
          onSelectionChange,
        }),
      );

      act(() => result.current.selectAllRows?.());
      expect(result.current.selectedIds).toEqual(["1", "2"]);

      // "replace the selection with just this row"
      act(() => {
        result.current.clearSelection?.();
        result.current.toggleRowSelection?.(testData.rows[1]);
      });

      expect(result.current.selectedIds).toEqual(["2"]);
      expect(onSelectionChange).toHaveBeenLastCalledWith(["2"]);
    });

    it("marks the selected row with data-state='selected' so the whole row highlights", () => {
      const { container } = render(<TestDataTable onSelectionChange={vi.fn()} />, { wrapper });

      // Nothing selected initially.
      expect(
        container.querySelector('[data-slot="data-table-row"][data-state="selected"]'),
      ).toBeNull();

      // checkboxes[0] = header, checkboxes[1] = first data row.
      fireEvent.click(screen.getAllByRole("checkbox")[1]);

      // The row (not just the pinned cells) must carry data-state="selected",
      // which is what `Table.Row` keys its selected background off of.
      expect(
        container.querySelectorAll('[data-slot="data-table-row"][data-state="selected"]'),
      ).toHaveLength(1);
    });

    it("the header checkbox adds and removes only the current page's rows", () => {
      const onSelectionChange = vi.fn();
      const nextPage: DataTableData<TestRow> = {
        rows: [
          { id: "3", name: "Carol", status: "Active" },
          { id: "4", name: "Dave", status: "Inactive" },
        ],
      };
      const { rerender } = render(<TestDataTable onSelectionChange={onSelectionChange} />, {
        wrapper,
      });

      // Pick Alice on the first page, then move to the second.
      fireEvent.click(screen.getAllByRole("checkbox")[1]);
      rerender(<TestDataTable data={nextPage} onSelectionChange={onSelectionChange} />);

      // Checking the header adds this page without dropping Alice…
      fireEvent.click(screen.getByLabelText("Select all rows"));
      expect(onSelectionChange).toHaveBeenLastCalledWith(["1", "3", "4"]);

      // …and unchecking it removes only this page's rows.
      fireEvent.click(screen.getByLabelText("Select all rows"));
      expect(onSelectionChange).toHaveBeenLastCalledWith(["1"]);
    });
  });
});

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
    expect(result.current.isRowSelected(pageA.rows[1])).toBe(true);
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("keeps controlled proposals page-scoped and preserves selection when clear is rejected", () => {
    const { result, rerender, onChange } = renderControlled(["1", "3"]);
    rerender({ selectedIds: ["1", "3"], data: pageB });
    act(() => result.current.deselectAllRows!());
    expect(onChange).toHaveBeenLastCalledWith(["1"]);
    expect(result.current.selectedIds).toEqual(["1", "3"]);
    act(() => result.current.clearSelection!());
    expect(onChange).toHaveBeenLastCalledWith([]);
    expect(result.current.selectedIds).toEqual(["1", "3"]);
    rerender({ selectedIds: ["1"], data: pageB });
    act(() => result.current.selectAllRows!());
    expect(onChange).toHaveBeenLastCalledWith(["1", "3"]);
    expect(result.current.selectedIds).toEqual(["1"]);
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
    "keeps ordered unique selected IDs independently of loaded rows in %s mode",
    (mode) => {
      const onChange = vi.fn();
      const ids = ["1", "unseen", "1"];
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
      expect(result.current.selectedIds).toEqual(["1", "unseen"]);
      rerender({ data: pageA });
      expect(result.current.isRowSelected(pageA.rows[0])).toBe(true);
      const updated = { id: "1", name: "Alice updated" };
      rerender({ data: { rows: [updated] } });
      expect(result.current.isRowSelected(updated)).toBe(true);
      rerender({ data: pageB });
      expect(result.current.selectedIds).toEqual(["1", "unseen"]);
      expect(result.current.isRowSelected(pageB.rows[0])).toBe(false);
      expect(onChange).not.toHaveBeenCalled();
    },
  );

  it("retained clearSelection uses the latest committed selection and owner callback", () => {
    const first = vi.fn();
    const latest = vi.fn();
    const { result, rerender } = renderHook(
      ({ ids, onChange }) =>
        useDataTable({ columns, data: pageA, rowSelection: { selectedIds: ids, onChange } }),
      { initialProps: { ids: ["1"], onChange: first } },
    );
    const clear = result.current.clearSelection!;
    rerender({ ids: ["2"], onChange: latest });
    act(() => clear());
    expect(first).not.toHaveBeenCalled();
    expect(latest).toHaveBeenCalledExactlyOnceWith([]);
    expect(result.current.selectedIds).toEqual(["2"]);
    rerender({ ids: [], onChange: latest });
    act(() => clear());
    expect(latest).toHaveBeenCalledTimes(1);
  });

  it("keeps a toggled ID when its owner selects it and changes page in the same commit", () => {
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
    expect(result.current.selectedIds).toEqual(["1"]);
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
    expect(result.current.selectedIds).toEqual(["1"]);
    expect(onChange).not.toHaveBeenCalled();
  });

  it.each([{ selectedIds: [] }, { selectedIds: ["2"] }])(
    "does not change controlled selection or notify either owner when an action settles: %j",
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
      expect(latest).not.toHaveBeenCalled();
      expect(result.current.selectedIds).toEqual(selectedIds);
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
      ["1"],
      expect.objectContaining({ clearSelection: expect.any(Function) }),
    );
    rerender(
      <ControlledTable selectedIds={["unseen"]} data={pageB} onChange={onChange} onBulk={onBulk} />,
    );
    const archive = screen.getByRole("button", { name: "Archive" });
    expect(archive.hasAttribute("disabled")).toBe(false);
    fireEvent.click(archive);
    expect(onBulk).toHaveBeenCalledTimes(2);
    expect(onBulk).toHaveBeenLastCalledWith(["unseen"], expect.any(Object));
  });

  it("lets a consumer remove only completed IDs while preserving ineligible and newly selected IDs", async () => {
    let complete!: (ids: string[]) => void;
    const request = new Promise<string[]>((resolve) => {
      complete = resolve;
    });
    const targets = vi.fn();
    function Consumer() {
      const [selectedIds, setSelectedIds] = useState(["1", "unseen"]);
      return (
        <ControlledTable
          selectedIds={selectedIds}
          data={pageA}
          onChange={setSelectedIds}
          onBulk={async (ids) => {
            targets(ids);
            const completed = new Set(await request);
            setSelectedIds((current) => current.filter((id) => !completed.has(id)));
          }}
        />
      );
    }
    render(<Consumer />, { wrapper });
    fireEvent.click(screen.getByRole("button", { name: "Archive" }));
    fireEvent.click(screen.getAllByLabelText("Select row")[1]);
    expect(targets).toHaveBeenCalledExactlyOnceWith(["1", "unseen"]);
    await act(async () => {
      complete(["1"]);
      await request;
    });
    expect(screen.getAllByLabelText("Select row")[0].getAttribute("aria-checked")).toBe("false");
    expect(screen.getAllByLabelText("Select row")[1].getAttribute("aria-checked")).toBe("true");
    expect(
      within(screen.getByRole("toolbar", { name: "Bulk actions" })).getByText("2 selected"),
    ).toBeDefined();
  });

  it("does not expose a selected-row cache through the hook or context", () => {
    expectTypeOf<"selectedRows">().not.toMatchTypeOf<keyof UseDataTableReturn<Row>>();
    expectTypeOf<"selectedRows">().not.toMatchTypeOf<keyof DataTableContextValue<Row>>();
    const { result } = renderHook(() => useDataTable({ columns, data: pageA, rowSelection: {} }));
    expect(result.current).not.toHaveProperty("selectedRows");
  });

  it("keeps row predicates and automatic selection cleanup out of the selection action API", () => {
    expectTypeOf<SelectionAction["onClick"]>().parameter(0).toEqualTypeOf<string[]>();
    expectTypeOf<"canApply">().not.toMatchTypeOf<keyof SelectionAction>();
    expectTypeOf<"keepSelection">().not.toMatchTypeOf<keyof SelectionAction>();
  });

  it("groups actions with selection without weakening its ownership contract", () => {
    expectTypeOf<UseDataTableOptions<Row>["rowSelection"]>().toEqualTypeOf<
      RowSelectionOptions | undefined
    >();
    expectTypeOf<NonNullable<UseDataTableReturn<Row>["rowSelection"]>["actions"]>().toEqualTypeOf<
      SelectionAction[] | undefined
    >();
    expectTypeOf<
      NonNullable<DataTableContextValue<Row>["rowSelection"]>["actions"]
    >().toEqualTypeOf<SelectionAction[] | undefined>();
    expectTypeOf<RowSelectionOptions["actions"]>().toEqualTypeOf<SelectionAction[] | undefined>();
    expectTypeOf<{ actions: SelectionAction[] }>().toMatchTypeOf<RowSelectionOptions>();
    expectTypeOf<{
      actions: SelectionAction[];
      defaultSelectedIds: string[];
    }>().toMatchTypeOf<RowSelectionOptions>();
    expectTypeOf<{
      actions: SelectionAction[];
      selectedIds: string[];
      onChange: (ids: string[]) => void;
    }>().toMatchTypeOf<RowSelectionOptions>();
    expectTypeOf<{
      actions: SelectionAction[];
      selectedIds: string[];
    }>().not.toMatchTypeOf<RowSelectionOptions>();
    expectTypeOf<{
      actions: SelectionAction[];
      selectedIds: string[];
      defaultSelectedIds: string[];
      onChange: (ids: string[]) => void;
    }>().not.toMatchTypeOf<RowSelectionOptions>();
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
