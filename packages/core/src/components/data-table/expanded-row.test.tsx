import { afterEach, describe, it, expect, vi } from "vitest";
import {
  act,
  cleanup,
  render,
  renderHook,
  screen,
  fireEvent,
  waitFor,
} from "@testing-library/react";
import type { ReactNode } from "react";
import { resetLocalTimeZone } from "@internationalized/date";
import { testColumns, testData, wrapper, strictWrapper, type TestRow } from "./test-utils";
import { DataTable } from "./data-table";
import { useDataTable } from "./use-data-table";
import type {
  DataTableData,
  RowAction,
  RowExpansionOptions,
  UseDataTableOptions,
  UseDataTableReturn,
} from "./types";

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
  resetLocalTimeZone();
  vi.restoreAllMocks();
});

// Detail-panel render props shared by the "expandable rows" block. The
// focusable variant lets tests drive focus into an open panel.
const detail = (row: TestRow) => <div>Details for {row.name}</div>;

const focusableDetail = () => (
  <button type="button" data-testid="inner">
    Inner
  </button>
);

describe("DataTable", () => {
  describe("expandable rows", () => {
    const EXPAND_TH = '[data-slot="data-table-header"] th[data-col-key="__datatable_expand__"]';
    const EXPANDED_ROW = '[data-slot="data-table-expanded-row"]';

    function ExpandHarness(props: {
      data?: DataTableData<TestRow>;
      loading?: boolean;
      error?: Error | null;
      onClickRow?: (row: TestRow) => void;
      onSelectionChange?: (ids: string[]) => void;
      rowActions?: RowAction<TestRow>[];
      renderExpandedRow?: (row: TestRow) => ReactNode;
      canExpandRow?: (row: TestRow) => boolean;
      expandRowLabel?: (row: TestRow) => string;
      expandedIds?: string[];
      onExpandedChange?: (ids: string[]) => void;
    }) {
      const table = useDataTable<TestRow>({
        columns: testColumns,
        data: "data" in props ? props.data : testData,
        loading: props.loading,
        error: props.error,
        onClickRow: props.onClickRow,
        onSelectionChange: props.onSelectionChange,
        rowActions: props.rowActions,
        rowExpansion: props.renderExpandedRow
          ? // Cast because the harness keeps flat props and picks the union
            // branch at runtime; the branches themselves are covered by the
            // type-level test below.
            ({
              render: props.renderExpandedRow,
              canExpand: props.canExpandRow,
              getLabel: props.expandRowLabel,
              expandedIds: props.expandedIds,
              onChange: props.onExpandedChange,
            } as RowExpansionOptions<TestRow>)
          : undefined,
      });
      return (
        <DataTable.Root value={table}>
          <DataTable.Table />
        </DataTable.Root>
      );
    }

    it("rejects incoherent rowExpansion configs at compile time", () => {
      const base = { columns: testColumns, data: testData };
      type Options = UseDataTableOptions<TestRow>;

      // The directive sits on the offending property, which is where TS reports
      // the mismatch.
      const missingOnChange: Options = {
        ...base,
        // @ts-expect-error — `expandedIds` without `onChange` is inert. Making it
        // unrepresentable is what removed the hook's dev-time warning effect.
        rowExpansion: { render: detail, expandedIds: ["1"] },
      };

      const labelWithoutRender: Options = {
        ...base,
        // @ts-expect-error — a label with no renderer does nothing.
        rowExpansion: { getLabel: (r: TestRow) => r.name },
      };

      const controlled: Options = {
        ...base,
        rowExpansion: { render: detail, expandedIds: ["1"], onChange: () => {} },
      };
      const uncontrolled: Options = { ...base, rowExpansion: { render: detail } };
      // `onChange` alone stays legal — in uncontrolled mode it is a notification.
      const notified: Options = {
        ...base,
        rowExpansion: { render: detail, onChange: () => {} },
      };

      expect([
        missingOnChange,
        labelWithoutRender,
        controlled,
        uncontrolled,
        notified,
      ]).toHaveLength(5);
    });

    it("renders no expand column when renderExpandedRow is absent", () => {
      const { container } = render(<ExpandHarness />, { wrapper });

      expect(container.querySelector(EXPAND_TH)).toBeNull();
      expect(screen.queryByLabelText("Expand row")).toBeNull();
    });

    it("renders an expand column when renderExpandedRow is provided", () => {
      const { container } = render(<ExpandHarness renderExpandedRow={detail} />, { wrapper });

      const th = container.querySelector(EXPAND_TH);
      expect(th).not.toBeNull();
      // Never an empty <th> — the header carries sr-only text.
      expect(th?.textContent).toBe("Expand");
      expect(screen.getAllByLabelText("Expand row")).toHaveLength(2);
    });

    it("clicking the chevron reveals the render prop's content", () => {
      render(<ExpandHarness renderExpandedRow={detail} />, { wrapper });

      expect(screen.queryByText("Details for Alice")).toBeNull();
      fireEvent.click(screen.getAllByLabelText("Expand row")[0]);

      expect(screen.getByText("Details for Alice")).toBeDefined();
      // Only the clicked row opens.
      expect(screen.queryByText("Details for Bob")).toBeNull();
    });

    it("clicking the chevron again collapses the row", async () => {
      render(<ExpandHarness renderExpandedRow={detail} />, { wrapper });

      fireEvent.click(screen.getAllByLabelText("Expand row")[0]);
      expect(screen.getByText("Details for Alice")).toBeDefined();

      fireEvent.click(screen.getByLabelText("Collapse row"));

      // The row stays mounted while the collapse transition plays, so removal
      // is asynchronous — `aria-expanded` flips immediately, the DOM catches up.
      await waitFor(() => expect(screen.queryByText("Details for Alice")).toBeNull());
    });

    it("keeps the detail row mounted while collapsing, marked data-state='closed'", async () => {
      const { container } = render(<ExpandHarness renderExpandedRow={detail} />, { wrapper });

      fireEvent.click(screen.getAllByLabelText("Expand row")[0]);
      expect(container.querySelector(`${EXPANDED_ROW}[data-state="open"]`)).not.toBeNull();

      fireEvent.click(screen.getByLabelText("Collapse row"));

      // Still in the DOM, but flipped to the closed state — this is what gives
      // the exit transition something to animate. Without the presence state
      // machine React would remove the row on the same tick and it would snap.
      expect(container.querySelector(`${EXPANDED_ROW}[data-state="closed"]`)).not.toBeNull();
      // The trigger's state is not deferred — it reports collapsed right away
      // (both rows now read "Expand row", so index into them).
      expect(screen.getAllByLabelText("Expand row")[0].getAttribute("aria-expanded")).toBe("false");

      await waitFor(() => expect(container.querySelector(EXPANDED_ROW)).toBeNull());
    });

    it("exposes aria-expanded on the trigger, flipping false → true", () => {
      render(<ExpandHarness renderExpandedRow={detail} />, { wrapper });

      const trigger = screen.getAllByLabelText("Expand row")[0];
      expect(trigger.getAttribute("aria-expanded")).toBe("false");

      fireEvent.click(trigger);
      expect(screen.getByLabelText("Collapse row").getAttribute("aria-expanded")).toBe("true");
    });

    it("points aria-controls at a present element while expanded, and omits it while collapsed", () => {
      render(<ExpandHarness renderExpandedRow={detail} />, { wrapper });

      const trigger = screen.getAllByLabelText("Expand row")[0];
      // Must never point at an id that is absent from the DOM.
      expect(trigger.getAttribute("aria-controls")).toBeNull();

      fireEvent.click(trigger);
      const controls = screen.getByLabelText("Collapse row").getAttribute("aria-controls");
      expect(controls).toBeTruthy();
      expect(document.getElementById(controls as string)).not.toBeNull();
    });

    it("spans the detail cell across selection + expand + columns + actions", () => {
      const { container } = render(
        <ExpandHarness
          renderExpandedRow={detail}
          onSelectionChange={vi.fn()}
          rowActions={[{ id: "edit", label: "Edit", onClick: vi.fn() }]}
        />,
        { wrapper },
      );

      fireEvent.click(screen.getAllByLabelText("Expand row")[0]);

      // 1 selection + 1 expand + 2 visible columns + 1 actions
      expect(container.querySelector(`${EXPANDED_ROW} td`)?.getAttribute("colspan")).toBe("5");
    });

    it("keeps several rows open at once", () => {
      const { container } = render(<ExpandHarness renderExpandedRow={detail} />, { wrapper });

      const triggers = screen.getAllByLabelText("Expand row");
      fireEvent.click(triggers[0]);
      fireEvent.click(screen.getAllByLabelText("Expand row")[0]); // Bob's, after Alice's flipped

      expect(screen.getByText("Details for Alice")).toBeDefined();
      expect(screen.getByText("Details for Bob")).toBeDefined();
      expect(container.querySelectorAll(EXPANDED_ROW)).toHaveLength(2);
    });

    it("does not fire onClickRow when the chevron is used", () => {
      const onClickRow = vi.fn();
      render(<ExpandHarness renderExpandedRow={detail} onClickRow={onClickRow} />, { wrapper });

      fireEvent.click(screen.getAllByLabelText("Expand row")[0]);

      expect(onClickRow).not.toHaveBeenCalled();
      expect(screen.getByText("Details for Alice")).toBeDefined();
    });

    it("renders no chevron for rows without an id", () => {
      // Expansion is keyed by id, so an id-less row gets no chevron at all
      // rather than a disabled one — a row must never be un-toggleable.
      const mixed: DataTableData<TestRow> = {
        rows: [
          { id: "1", name: "Alice", status: "Active" },
          { name: "Bob", status: "Inactive" } as TestRow,
        ],
      };
      const { container } = render(<ExpandHarness data={mixed} renderExpandedRow={detail} />, {
        wrapper,
      });

      expect(screen.getAllByLabelText("Expand row")).toHaveLength(1);
      // The cell is still rendered (empty), so the column count stays consistent.
      const bodyRows = container.querySelectorAll('[data-slot="data-table-row"]');
      expect(bodyRows[1].querySelectorAll("td")).toHaveLength(3);
    });

    it("renders no chevron for a row that canExpandRow rejects", () => {
      render(
        <ExpandHarness renderExpandedRow={detail} canExpandRow={(row) => row.name === "Alice"} />,
        { wrapper },
      );

      const triggers = screen.getAllByLabelText("Expand row");
      expect(triggers).toHaveLength(1);
      fireEvent.click(triggers[0]);
      expect(screen.getByText("Details for Alice")).toBeDefined();
    });

    it("builds a contextual accessible name from expandRowLabel", () => {
      render(<ExpandHarness renderExpandedRow={detail} expandRowLabel={(row) => row.name} />, {
        wrapper,
      });

      const trigger = screen.getByLabelText("Expand row Alice");
      expect(screen.getByLabelText("Expand row Bob")).toBeDefined();

      fireEvent.click(trigger);
      expect(screen.getByLabelText("Collapse row Alice")).toBeDefined();
    });

    it("renders the panel as a named region", () => {
      render(<ExpandHarness renderExpandedRow={detail} expandRowLabel={(row) => row.name} />, {
        wrapper,
      });

      fireEvent.click(screen.getByLabelText("Expand row Alice"));

      const region = screen.getByRole("region", { name: "Alice details" });
      expect(region.textContent).toBe("Details for Alice");
    });

    it("returns focus to the trigger when the panel collapses while focus is inside it", async () => {
      render(<ExpandHarness renderExpandedRow={focusableDetail} />, { wrapper });

      fireEvent.click(screen.getAllByLabelText("Expand row")[0]);

      const inner = screen.getByTestId("inner");
      act(() => inner.focus());
      expect(document.activeElement).toBe(inner);

      const trigger = screen.getByLabelText("Collapse row");
      fireEvent.click(trigger);

      // The handoff runs on unmount, which now waits for the collapse
      // transition. Without it, focus would fall to <body> and the user would
      // lose their place in the table.
      await waitFor(() => expect(document.activeElement).toBe(trigger));
    });

    it("renders the matching rows open from a controlled expandedIds", () => {
      const { container } = render(
        <ExpandHarness renderExpandedRow={detail} expandedIds={["2"]} onExpandedChange={vi.fn()} />,
        { wrapper },
      );

      expect(screen.getByText("Details for Bob")).toBeDefined();
      expect(screen.queryByText("Details for Alice")).toBeNull();
      expect(container.querySelectorAll(EXPANDED_ROW)).toHaveLength(1);
    });

    it("reports controlled toggles through onExpandedChange without changing internal state", () => {
      const onExpandedChange = vi.fn();
      render(
        <ExpandHarness
          renderExpandedRow={detail}
          expandedIds={[]}
          onExpandedChange={onExpandedChange}
        />,
        { wrapper },
      );

      fireEvent.click(screen.getAllByLabelText("Expand row")[0]);

      expect(onExpandedChange).toHaveBeenCalledWith(["1"]);
      // The caller owns the state — nothing opens until `expandedIds` changes.
      expect(screen.queryByText("Details for Alice")).toBeNull();
    });

    it("pins the expand column left at the selection column's measured offset", () => {
      const { container } = render(
        <ExpandHarness renderExpandedRow={detail} onSelectionChange={vi.fn()} />,
        { wrapper },
      );

      const th = container.querySelector<HTMLElement>(EXPAND_TH);
      expect(th?.style.position).toBe("sticky");
      expect(th?.style.left).toBe("52px");
      // The freeze seam moves off the selection column onto the expand column.
      const selectionTh = container.querySelector<HTMLElement>(
        '[data-slot="data-table-header"] th[data-col-key="__datatable_selection__"]',
      );
      expect(th?.className).toContain("data-pin-shadow-left");
      expect(selectionTh?.className).not.toContain("data-pin-shadow-left");
    });

    it("includes an expand cell in the skeleton rows", () => {
      const { container } = render(
        <ExpandHarness data={undefined} loading renderExpandedRow={detail} />,
        { wrapper },
      );

      const loadingRow = container.querySelector('[data-datatable-state="loading"]');
      // 1 expand + 2 visible columns — row heights match before and after load.
      expect(loadingRow?.querySelectorAll("td")).toHaveLength(3);
    });

    it("spans the expand column in the empty and error status rows", () => {
      const { container: emptyContainer } = render(
        <ExpandHarness data={{ rows: [] }} renderExpandedRow={detail} />,
        { wrapper },
      );
      expect(
        emptyContainer.querySelector('[data-datatable-state="empty"] td')?.getAttribute("colspan"),
      ).toBe("3");

      const { container: errorContainer } = render(
        <ExpandHarness data={undefined} error={new Error("boom")} renderExpandedRow={detail} />,
        { wrapper },
      );
      expect(
        errorContainer.querySelector('[data-datatable-state="error"] td')?.getAttribute("colspan"),
      ).toBe("3");
    });

    // -----------------------------------------------------------------------
    // Regressions found in review
    // -----------------------------------------------------------------------

    it("keeps row keys unique when an id-less row's index matches another row's id", () => {
      // `{id: "1"}` at index 0 and an id-less row at index 1 both keyed to "1"
      // (React stringifies keys), so React reconciled two siblings under one key.
      // The keys are namespaced now, so the two spaces can't overlap.
      const err = vi.spyOn(console, "error").mockImplementation(() => {});
      const collidingData: DataTableData<TestRow> = {
        rows: [
          { id: "1", name: "Alice", status: "Active" },
          { name: "Bob", status: "Inactive" } as TestRow,
          { id: "2", name: "Carol", status: "Active" },
        ],
      };
      render(<ExpandHarness data={collidingData} renderExpandedRow={detail} />, { wrapper });

      expect(err.mock.calls.filter((call) => String(call[0]).includes("same key"))).toHaveLength(0);
      err.mockRestore();
    });

    it("closes a row that becomes non-expandable while open", async () => {
      // `canExpandRow` gates both directions. A row whose predicate flips to
      // false goes quiet: no panel, no chevron. Its id stays in `expandedIds`
      // but is inert — the alternative (letting the set alone open a panel)
      // renders detail content for a row the consumer told us to skip.
      function Harness({ canExpand }: { canExpand: boolean }) {
        return (
          <ExpandHarness
            renderExpandedRow={detail}
            canExpandRow={() => canExpand}
            expandedIds={["1"]}
            onExpandedChange={vi.fn()}
          />
        );
      }
      const { rerender } = render(<Harness canExpand />, { wrapper });
      expect(screen.getByText("Details for Alice")).toBeDefined();

      rerender(<Harness canExpand={false} />);

      await waitFor(() => expect(screen.queryByText("Details for Alice")).toBeNull());
      expect(screen.queryByLabelText("Collapse row")).toBeNull();
      expect(screen.queryByLabelText("Expand row")).toBeNull();
    });

    it("does not open a panel for a row canExpandRow rejects, even when its id is in expandedIds", () => {
      // Restoring `expandedIds` from a URL or storage must not run
      // `renderExpandedRow` against a row the consumer excluded — that row may
      // have no detail data at all.
      const renderExpandedRow = vi.fn(detail);
      render(
        <ExpandHarness
          renderExpandedRow={renderExpandedRow}
          canExpandRow={() => false}
          expandedIds={["1", "2"]}
          onExpandedChange={vi.fn()}
        />,
        { wrapper },
      );

      expect(screen.queryByText("Details for Alice")).toBeNull();
      expect(screen.queryByRole("region")).toBeNull();
      expect(renderExpandedRow).not.toHaveBeenCalled();
    });

    it("marks the closing panel inert so it leaves the tab order and a11y tree", async () => {
      const { container } = render(<ExpandHarness renderExpandedRow={focusableDetail} />, {
        wrapper,
      });

      fireEvent.click(screen.getAllByLabelText("Expand row")[0]);
      const panel = container.querySelector(`${EXPANDED_ROW} section`);
      expect(panel?.hasAttribute("inert")).toBe(false);

      fireEvent.click(screen.getByLabelText("Collapse row"));

      // Zero height and zero opacity still leave descendants focusable and
      // announced, so the closing window needs `inert` explicitly.
      expect(container.querySelector(`${EXPANDED_ROW} section`)?.hasAttribute("inert")).toBe(true);
      await waitFor(() => expect(container.querySelector(EXPANDED_ROW)).toBeNull());
    });

    it("sanitises whitespace in row ids so the panel id and aria-controls stay valid", () => {
      const spaced: DataTableData<TestRow> = {
        rows: [{ id: "ORD 4471", name: "Alice", status: "Active" }],
      };
      render(<ExpandHarness data={spaced} renderExpandedRow={detail} />, { wrapper });

      fireEvent.click(screen.getByLabelText("Expand row"));

      const controls = screen
        .getByLabelText("Collapse row")
        .getAttribute("aria-controls") as string;
      // `aria-controls` is an IDREF *list*: a space would split it into two
      // references that resolve to nothing, silently dropping the association.
      expect(controls).not.toMatch(/\s/);
      expect(document.getElementById(controls)).not.toBeNull();
    });

    it("moves focus to the table container when the whole row unmounts from under it", () => {
      // The collapse-by-click test covers the case where the trigger survives.
      // Here the row disappears (refetch/filter/pagination) while focus is in the
      // panel, so the trigger is gone too and focus would otherwise hit <body>.
      const { container, rerender } = render(
        <ExpandHarness data={testData} renderExpandedRow={focusableDetail} />,
        { wrapper },
      );

      fireEvent.click(screen.getAllByLabelText("Expand row")[0]);
      const inner = screen.getByTestId("inner");
      act(() => inner.focus());
      expect(document.activeElement).toBe(inner);

      // Alice drops out of the result set entirely.
      rerender(
        <ExpandHarness
          data={{ rows: [{ id: "2", name: "Bob", status: "Inactive" }] }}
          renderExpandedRow={focusableDetail}
        />,
      );

      const scrollContainer = container.querySelector<HTMLElement>('[data-slot="table-container"]');
      expect(document.activeElement).toBe(scrollContainer);
      expect(document.activeElement).not.toBe(document.body);
    });

    it("does not measure a nested DataTable's header into the outer table's widths", () => {
      // Shared column keys must not let a nested header overwrite the outer width.
      vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(
        function (this: HTMLElement) {
          if (this.dataset.colKey !== "__datatable_selection__") return new DOMRect();
          return new DOMRect(0, 0, this.closest("[data-nested]") ? 40 : 70, 40);
        },
      );

      function NestedTable() {
        const table = useDataTable<TestRow>({
          columns: testColumns,
          data: { rows: [testData.rows[0]] },
          onSelectionChange: vi.fn(),
        });
        return (
          <div data-nested>
            <DataTable.Root value={table}>
              <DataTable.Table />
            </DataTable.Root>
          </div>
        );
      }

      let api!: UseDataTableReturn<TestRow>;
      function Harness() {
        const table = useDataTable<TestRow>({
          columns: testColumns,
          data: testData,
          onSelectionChange: vi.fn(),
          rowExpansion: { render: () => <NestedTable /> },
        });
        api = table;
        return (
          <DataTable.Root value={table}>
            <DataTable.Table />
          </DataTable.Root>
        );
      }
      const { container } = render(<Harness />, { wrapper });

      fireEvent.click(screen.getAllByLabelText("Expand row")[0]);
      expect(container.querySelectorAll("table").length).toBeGreaterThan(1);

      const selectionHeaders = container.querySelectorAll<HTMLElement>(
        '[data-slot="data-table-header"] th[data-col-key="__datatable_selection__"]',
      );
      expect(selectionHeaders).toHaveLength(2);
      expect(Array.from(selectionHeaders, (cell) => cell.getBoundingClientRect().width)).toEqual([
        70, 40,
      ]);

      // Resubscribe while the nested table is mounted to exercise the ownership filter.
      act(() => api.toggleColumn("Status"));

      expect(container.querySelector<HTMLElement>(EXPAND_TH)?.style.left).toBe("70px");
    });

    it("keeps collapseAllRows stable and inert while nothing is expanded", () => {
      // The documented "collapse on page change" recipe lists it in an effect's
      // dependency array; an unstable identity plus an unconditional state write
      // there loops until React bails with a max-update-depth error.
      const seen: (() => void)[] = [];
      const onExpandedChange = vi.fn();
      function Harness() {
        const table = useDataTable<TestRow>({
          columns: testColumns,
          data: testData,
          rowExpansion: { render: detail, onChange: onExpandedChange },
        });
        if (table.collapseAllRows) seen.push(table.collapseAllRows);
        return (
          <DataTable.Root value={table}>
            <DataTable.Table />
          </DataTable.Root>
        );
      }
      const { rerender } = render(<Harness />, { wrapper });
      rerender(<Harness />);

      expect(seen.length).toBeGreaterThan(1);
      expect(seen[seen.length - 1]).toBe(seen[0]);

      // Collapsing an already-collapsed table is a no-op, not a spurious event.
      act(() => seen[0]());
      expect(onExpandedChange).not.toHaveBeenCalled();

      // The identity must survive an actual expansion, not just a re-render.
      // `expandedRowIds` is a fresh Set on every expansion change, so having it
      // in the useCallback deps kept the identity churning — and the documented
      // effect recipe then re-fired on expand and collapsed the row the user had
      // just opened. A rerender-only assertion never sees that.
      fireEvent.click(screen.getAllByLabelText("Expand row")[0]);
      expect(screen.getByText("Details for Alice")).toBeDefined();
      expect(seen[seen.length - 1]).toBe(seen[0]);
    });

    it("calls onExpandedChange once per toggle under StrictMode", () => {
      const onExpandedChange = vi.fn();
      render(<ExpandHarness renderExpandedRow={detail} onExpandedChange={onExpandedChange} />, {
        wrapper: strictWrapper,
      });

      fireEvent.click(screen.getAllByLabelText("Expand row")[0]);

      expect(onExpandedChange).toHaveBeenCalledTimes(1);
      expect(onExpandedChange).toHaveBeenCalledWith(["1"]);
    });

    it("composes several expansion toggles dispatched in one commit", () => {
      const onChange = vi.fn();
      const { result } = renderHook(() =>
        useDataTable<TestRow>({
          columns: testColumns,
          data: testData,
          rowExpansion: { render: detail, onChange },
        }),
      );

      act(() => {
        result.current.toggleRowExpansion?.(testData.rows[0]);
        result.current.toggleRowExpansion?.(testData.rows[1]);
      });

      expect(result.current.expandedIds).toEqual(["1", "2"]);
      expect(onChange).toHaveBeenLastCalledWith(["1", "2"]);
    });

    it("applies collapseAllRows before a toggle in the same commit", () => {
      const { result } = renderHook(() =>
        useDataTable<TestRow>({
          columns: testColumns,
          data: testData,
          rowExpansion: { render: detail },
        }),
      );

      act(() => {
        result.current.toggleRowExpansion?.(testData.rows[0]);
        result.current.toggleRowExpansion?.(testData.rows[1]);
      });

      act(() => {
        result.current.collapseAllRows?.();
        result.current.toggleRowExpansion?.(testData.rows[1]);
      });

      expect(result.current.expandedIds).toEqual(["2"]);
    });

    it("keeps toggleRowExpansion stable across an expansion", () => {
      const seen: ((row: TestRow) => void)[] = [];
      function Harness() {
        const table = useDataTable<TestRow>({
          columns: testColumns,
          data: testData,
          rowExpansion: { render: detail },
        });
        if (table.toggleRowExpansion) seen.push(table.toggleRowExpansion);
        return (
          <DataTable.Root value={table}>
            <DataTable.Table />
          </DataTable.Root>
        );
      }
      render(<Harness />, { wrapper });

      fireEvent.click(screen.getAllByLabelText("Expand row")[0]);

      expect(seen.length).toBeGreaterThan(1);
      expect(seen[seen.length - 1]).toBe(seen[0]);
    });

    it("leaves --data-table-viewport unset when the scrollport measures zero", () => {
      // jsdom reports clientWidth 0, matching a table mounted inside a hidden
      // container. Writing `0px` would collapse every panel via min(100%, 0px).
      const { container } = render(<ExpandHarness renderExpandedRow={detail} />, { wrapper });

      const scrollContainer = container.querySelector<HTMLElement>('[data-slot="table-container"]');
      expect(scrollContainer?.style.getPropertyValue("--data-table-viewport")).toBe("");

      // The panel therefore falls back to 100% rather than 0.
      fireEvent.click(screen.getAllByLabelText("Expand row")[0]);
      expect(screen.getByText("Details for Alice")).toBeDefined();
    });
  });
});
