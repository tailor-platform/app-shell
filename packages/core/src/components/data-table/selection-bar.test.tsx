import { afterEach, describe, it, expect, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createAppShellWrapper } from "../../../tests/test-utils";
import type { CollectionControl } from "@/types/collection";
import { DataTable } from "./data-table";
import { useDataTable } from "./use-data-table";
import type { Column, DataTableData, RowSelectionOptions, SelectionAction } from "./types";

afterEach(() => cleanup());

type Vendor = { id: string; name: string };
const vendors: Vendor[] = [
  { id: "1", name: "Acme" },
  { id: "2", name: "Globex" },
  { id: "3", name: "Initech" },
];
const columns: Column<Vendor>[] = [{ label: "Name", render: (row) => row.name }];

function makeControl(): CollectionControl {
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
  };
}

const archive = (onClick: SelectionAction["onClick"] = vi.fn()): SelectionAction => ({
  id: "archive",
  label: "Archive",
  onClick,
});

function Harness({
  onSelectionChange,
  rowSelection,
  data = { rows: vendors, total: 3 },
  footer = "pagination",
}: {
  onSelectionChange?: (ids: string[]) => void;
  rowSelection?: RowSelectionOptions;
  data?: DataTableData<Vendor>;
  footer?: "pagination" | "empty";
}) {
  const table = useDataTable({
    columns,
    data,
    control: makeControl(),
    onSelectionChange,
    rowSelection,
  });
  return (
    <DataTable.Root value={table}>
      <DataTable.Table />
      {footer === "pagination" ? (
        <DataTable.Footer>
          <DataTable.Pagination />
        </DataTable.Footer>
      ) : (
        <DataTable.Footer />
      )}
    </DataTable.Root>
  );
}

const wrapper = createAppShellWrapper("en");
const rowCheckbox = (index: number) => screen.getAllByLabelText("Select row")[index];
const queryBar = () => screen.queryByRole("toolbar", { name: "Bulk actions" });
const getBar = () => screen.getByRole("toolbar", { name: "Bulk actions" });
const actionButton = () => within(getBar()).getByRole("button", { name: "Archive" });
const footerOf = (container: HTMLElement) =>
  container.querySelector<HTMLElement>('[data-slot="data-table-footer"]')!;

/** A promise the test settles by hand, to observe an action while it is pending. */
function deferred() {
  let resolve!: () => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<void>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe("DataTable selection actions", () => {
  it("turns the footer into the bar, owning the count, only while selected", () => {
    const { container } = render(<Harness rowSelection={{ actions: [archive()] }} />, { wrapper });
    expect(queryBar()).toBeNull();
    expect(footerOf(container).hasAttribute("data-selecting")).toBe(false);
    expect(screen.getByText("3 row(s)")).toBeDefined();
    fireEvent.click(rowCheckbox(0));
    expect(within(getBar()).getByText("1 of 3 selected")).toBeDefined();
    expect(actionButton()).toHaveProperty("disabled", false);
    expect(within(getBar()).getByRole("button", { name: "Clear selection" })).toBeDefined();
    expect(footerOf(container).hasAttribute("data-selecting")).toBe(true);
    expect(footerOf(container).className).toContain("astw:sticky");
    expect(screen.queryByText("3 row(s)")).toBeNull();
    expect(screen.getByLabelText("Next page")).toBeDefined();
    fireEvent.click(rowCheckbox(0));
    expect(queryBar()).toBeNull();
  });

  it("falls back to the bare count when the backend returns no total", () => {
    render(<Harness rowSelection={{ actions: [archive()] }} data={{ rows: vendors }} />, {
      wrapper,
    });
    fireEvent.click(rowCheckbox(0));
    expect(within(getBar()).getByText("1 selected")).toBeDefined();
  });

  it.each(["controlled", "uncontrolled"] as const)(
    "passes all preselected IDs regardless of loaded rows in %s mode",
    (mode) => {
      const onClick = vi.fn();
      const ids = ["unseen", "2", "also-unseen"];
      const rowSelection =
        mode === "controlled"
          ? { selectedIds: ids, onChange: vi.fn() }
          : { defaultSelectedIds: ids };
      const { rerender } = render(
        <Harness rowSelection={{ ...rowSelection, actions: [archive(onClick)] }} />,
        { wrapper },
      );
      expect(actionButton()).toHaveProperty("disabled", false);
      fireEvent.click(actionButton());
      expect(onClick).toHaveBeenLastCalledWith(ids, expect.any(Object));
      rerender(
        <Harness
          rowSelection={{ ...rowSelection, actions: [archive(onClick)] }}
          data={{ rows: [] }}
        />,
      );
      expect(actionButton()).toHaveProperty("disabled", false);
      fireEvent.click(actionButton());
      expect(onClick).toHaveBeenLastCalledWith(ids, expect.any(Object));
      expect(within(getBar()).getByText("3 selected")).toBeDefined();
    },
  );

  it("includes IDs selected on other pages", () => {
    const onClick = vi.fn();
    const { rerender } = render(<Harness rowSelection={{ actions: [archive(onClick)] }} />, {
      wrapper,
    });
    fireEvent.click(rowCheckbox(0));
    rerender(
      <Harness
        rowSelection={{ actions: [archive(onClick)] }}
        data={{ rows: [{ id: "4", name: "Hooli" }], total: 4 }}
      />,
    );
    fireEvent.click(rowCheckbox(0));
    expect(within(getBar()).getByText("2 of 4 selected")).toBeDefined();
    fireEvent.click(actionButton());
    expect(onClick).toHaveBeenCalledExactlyOnceWith(["1", "4"], expect.any(Object));
  });

  it("gives each click a snapshot isolated from later selection and handler mutation", () => {
    const onClick = vi.fn((ids: string[]) => {
      ids.pop();
    });
    render(<Harness rowSelection={{ actions: [archive(onClick)] }} />, { wrapper });
    fireEvent.click(rowCheckbox(0));
    fireEvent.click(rowCheckbox(1));
    fireEvent.click(actionButton());
    expect(within(getBar()).getByText("2 of 3 selected")).toBeDefined();
    fireEvent.click(rowCheckbox(2));
    expect(onClick.mock.calls[0][0]).toEqual(["1"]);
    fireEvent.click(actionButton());
    expect(onClick.mock.calls[1][0]).toEqual(["1", "2"]);
    expect(onClick.mock.calls[0][0]).not.toBe(onClick.mock.calls[1][0]);
  });

  it("moves actions past the third into a More actions menu with the complete ID payload", async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();
    const actions: SelectionAction[] = [
      { id: "a", label: "Activate", onClick: vi.fn() },
      { id: "b", label: "Deactivate", onClick: vi.fn() },
      { id: "c", label: "Export", onClick: vi.fn() },
      { id: "delete", label: "Delete", variant: "destructive", onClick: onDelete },
    ];
    render(<Harness rowSelection={{ actions, defaultSelectedIds: ["unseen", "3"] }} />, {
      wrapper,
    });
    expect(within(getBar()).queryByRole("button", { name: "Delete" })).toBeNull();
    await user.click(within(getBar()).getByRole("button", { name: "More actions" }));
    await user.click(await screen.findByRole("menuitem", { name: "Delete" }));
    expect(onDelete).toHaveBeenCalledExactlyOnceWith(["unseen", "3"], expect.any(Object));
  });

  it("Clear empties selection and hands focus back to the header checkbox", async () => {
    const user = userEvent.setup();
    const onSelectionChange = vi.fn();
    render(
      <Harness rowSelection={{ actions: [archive()] }} onSelectionChange={onSelectionChange} />,
      {
        wrapper,
      },
    );
    await user.click(rowCheckbox(0));
    await user.click(within(getBar()).getByRole("button", { name: "Clear selection" }));
    expect(onSelectionChange).toHaveBeenLastCalledWith([]);
    expect(queryBar()).toBeNull();
    expect(document.activeElement).toBe(screen.getByLabelText("Select all rows"));
  });

  it("supports arrow-key navigation between the bar's controls", async () => {
    const user = userEvent.setup();
    render(
      <Harness
        rowSelection={{ actions: [archive(), { id: "export", label: "Export", onClick: vi.fn() }] }}
      />,
      { wrapper },
    );
    await user.click(rowCheckbox(0));
    actionButton().focus();
    await user.keyboard("{ArrowRight}");
    expect(document.activeElement).toBe(within(getBar()).getByRole("button", { name: "Export" }));
  });

  it("announces the count politely from the first selection on", () => {
    const { container } = render(<Harness rowSelection={{ actions: [archive()] }} />, { wrapper });
    const liveRegion = () => container.querySelector('[aria-live="polite"]');
    expect(liveRegion()?.textContent).toBe("");
    fireEvent.click(rowCheckbox(0));
    expect(liveRegion()?.textContent).toBe("1 of 3 selected");
  });

  it("renders the bar in a footer without children", () => {
    render(<Harness rowSelection={{ actions: [archive()] }} footer="empty" />, { wrapper });
    fireEvent.click(rowCheckbox(0));
    expect(actionButton()).toBeDefined();
  });

  it.each([{}, { actions: [] }])(
    "enables selection without a bulk-action bar for rowSelection %j",
    (rowSelection) => {
      const { container } = render(<Harness rowSelection={rowSelection} />, { wrapper });
      fireEvent.click(rowCheckbox(0));
      expect(rowCheckbox(0).getAttribute("aria-checked")).toBe("true");
      expect(queryBar()).toBeNull();
      expect(footerOf(container).hasAttribute("data-selecting")).toBe(false);
      expect(screen.getByText("1 of 3 row(s) selected")).toBeDefined();
    },
  );

  it("leaves the footer unchanged when no bulk actions are given", () => {
    const { container } = render(<Harness onSelectionChange={vi.fn()} />, { wrapper });
    fireEvent.click(rowCheckbox(0));
    expect(queryBar()).toBeNull();
    expect(footerOf(container).hasAttribute("data-selecting")).toBe(false);
    expect(screen.getByText("1 of 3 row(s) selected")).toBeDefined();
    expect(container.querySelector('[aria-live="polite"]')).toBeNull();
  });

  describe("async actions", () => {
    it("disables all actions, overflow and Clear with a spinner while pending, without clearing on success", async () => {
      const pending = deferred();
      const onClick = vi.fn(() => pending.promise);
      const onSelectionChange = vi.fn();
      render(
        <Harness
          rowSelection={{
            actions: [
              archive(onClick),
              ...["Export", "Activate", "Delete"].map((label) => ({
                id: label,
                label,
                onClick: vi.fn(),
              })),
            ],
          }}
          onSelectionChange={onSelectionChange}
        />,
        { wrapper },
      );
      fireEvent.click(rowCheckbox(0));
      fireEvent.click(actionButton());
      expect(getBar().getAttribute("aria-busy")).toBe("true");
      expect(actionButton().querySelector('[data-slot="spinner"]')).not.toBeNull();
      for (const button of within(getBar()).getAllByRole("button"))
        expect(button).toHaveProperty("disabled", true);
      fireEvent.click(actionButton());
      expect(onClick).toHaveBeenCalledTimes(1);
      fireEvent.click(rowCheckbox(1));
      expect(onClick.mock.calls[0]).toEqual([["1"], expect.any(Object)]);
      onSelectionChange.mockClear();
      await act(async () => {
        pending.resolve();
        await pending.promise;
      });
      expect(within(getBar()).getByText("2 of 3 selected")).toBeDefined();
      expect(actionButton()).toHaveProperty("disabled", false);
      expect(getBar().hasAttribute("aria-busy")).toBe(false);
      expect(onSelectionChange).not.toHaveBeenCalled();
    });

    it("keeps selection and re-enables actions on rejection", async () => {
      const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
      const pending = deferred();
      const onSelectionChange = vi.fn();
      render(
        <Harness
          rowSelection={{ actions: [archive(() => pending.promise)] }}
          onSelectionChange={onSelectionChange}
        />,
        { wrapper },
      );
      fireEvent.click(rowCheckbox(0));
      fireEvent.click(actionButton());
      onSelectionChange.mockClear();
      await act(async () => {
        pending.reject(new Error("network down"));
        await pending.promise.catch(() => {});
      });
      expect(actionButton()).toHaveProperty("disabled", false);
      expect(within(getBar()).getByText("1 of 3 selected")).toBeDefined();
      expect(onSelectionChange).not.toHaveBeenCalled();
      expect(consoleError).toHaveBeenCalledWith(
        '[DataTable] Selection action "archive" failed:',
        expect.any(Error),
      );
      consoleError.mockRestore();
    });

    it("leaves selection alone when onClick returns nothing", () => {
      render(<Harness rowSelection={{ actions: [archive()] }} />, { wrapper });
      fireEvent.click(rowCheckbox(0));
      fireEvent.click(actionButton());
      expect(queryBar()).not.toBeNull();
      expect(getBar().hasAttribute("aria-busy")).toBe(false);
    });

    it("allows an action to explicitly clear selection exactly once", async () => {
      const onSelectionChange = vi.fn();
      render(
        <Harness
          rowSelection={{
            actions: [
              archive(async (ids, { clearSelection }) => {
                expect(ids).toEqual(["1"]);
                clearSelection();
              }),
            ],
          }}
          onSelectionChange={onSelectionChange}
        />,
        { wrapper },
      );
      fireEvent.click(rowCheckbox(0));
      await act(async () => {
        fireEvent.click(actionButton());
      });
      expect(queryBar()).toBeNull();
      expect(onSelectionChange.mock.calls.filter(([ids]) => ids.length === 0)).toHaveLength(1);
    });

    it("keeps pending state when the bar unmounts and remounts mid-request", async () => {
      const pending = deferred();
      render(<Harness rowSelection={{ actions: [archive(() => pending.promise)] }} />, { wrapper });
      fireEvent.click(rowCheckbox(0));
      fireEvent.click(actionButton());
      fireEvent.click(rowCheckbox(0));
      expect(queryBar()).toBeNull();
      fireEvent.click(rowCheckbox(0));
      expect(getBar().getAttribute("aria-busy")).toBe("true");
      expect(actionButton()).toHaveProperty("disabled", true);
      await act(async () => {
        pending.resolve();
        await pending.promise;
      });
      expect(actionButton()).toHaveProperty("disabled", false);
      expect(within(getBar()).getByText("1 of 3 selected")).toBeDefined();
    });

    it("tracks a request handed back later through run without changing selection", async () => {
      const pending = deferred();
      const onSelectionChange = vi.fn();
      let confirm: (() => void) | undefined;
      render(
        <Harness
          rowSelection={{
            actions: [
              archive((_ids, { run }) => {
                confirm = () => void run(pending.promise);
              }),
            ],
          }}
          onSelectionChange={onSelectionChange}
        />,
        { wrapper },
      );
      fireEvent.click(rowCheckbox(0));
      fireEvent.click(actionButton());
      expect(getBar().hasAttribute("aria-busy")).toBe(false);
      act(() => confirm?.());
      expect(getBar().getAttribute("aria-busy")).toBe("true");
      expect(within(getBar()).getByRole("button", { name: "Clear selection" })).toHaveProperty(
        "disabled",
        true,
      );
      await act(async () => {
        pending.resolve();
        await pending.promise;
      });
      expect(actionButton()).toHaveProperty("disabled", false);
      expect(onSelectionChange).toHaveBeenCalledExactlyOnceWith(["1"]);
    });
  });
});
