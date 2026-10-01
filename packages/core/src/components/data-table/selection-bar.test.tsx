import { afterEach, describe, it, expect, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createAppShellWrapper } from "../../../tests/test-utils";
import type { CollectionControl } from "@/types/collection";
import { DataTable } from "./data-table";
import { useDataTable } from "./use-data-table";
import type { Column, DataTableData, SelectionAction } from "./types";

afterEach(() => {
  cleanup();
});

type Vendor = { id: string; name: string; status: "active" | "inactive" | "archived" };

const vendors: Vendor[] = [
  { id: "1", name: "Acme", status: "active" },
  { id: "2", name: "Globex", status: "inactive" },
  { id: "3", name: "Initech", status: "archived" },
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

const archive = (onClick = vi.fn()): SelectionAction<Vendor> => ({
  id: "archive",
  label: "Archive",
  onClick,
});

function Harness({
  selectionActions,
  onSelectionChange,
  data = { rows: vendors, total: 3 },
  footer = "pagination",
}: {
  selectionActions?: SelectionAction<Vendor>[];
  onSelectionChange?: (ids: string[]) => void;
  data?: DataTableData<Vendor>;
  footer?: "pagination" | "empty";
}) {
  const table = useDataTable<Vendor>({
    columns,
    data,
    control: makeControl(),
    onSelectionChange,
    selectionActions,
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
  it("shows no bar until a row is selected", () => {
    const { container } = render(<Harness selectionActions={[archive()]} />, { wrapper });

    expect(queryBar()).toBeNull();
    expect(footerOf(container).hasAttribute("data-selecting")).toBe(false);
    expect(screen.getByText("3 row(s)")).toBeDefined();
  });

  it("turns the footer into the bar, owning the count, once a row is selected", () => {
    const { container } = render(<Harness selectionActions={[archive()]} />, { wrapper });

    fireEvent.click(rowCheckbox(0));

    const bar = getBar();
    expect(within(bar).getByText("1 of 3 selected")).toBeDefined();
    expect(within(bar).getByRole("button", { name: "Archive" })).toBeDefined();
    expect(within(bar).getByRole("button", { name: "Clear selection" })).toBeDefined();
    const footer = footerOf(container);
    expect(footer.hasAttribute("data-selecting")).toBe(true);
    // Sticky, so a page-scrolling table keeps the bar on screen.
    expect(footer.className).toContain("astw:sticky");
    // Pagination hides its own count while the bar shows it.
    expect(screen.queryByText("3 row(s)")).toBeNull();
    expect(screen.getByLabelText("Next page")).toBeDefined();
  });

  it("falls back to the bare count when the backend returns no total", () => {
    render(<Harness selectionActions={[archive()]} data={{ rows: vendors }} />, { wrapper });

    fireEvent.click(rowCheckbox(0));

    expect(within(getBar()).getByText("1 selected")).toBeDefined();
  });

  it("counts the rows each narrowed action applies to and disables it at zero", () => {
    const actions: SelectionAction<Vendor>[] = [
      {
        id: "activate",
        label: "Activate",
        canApply: (v) => v.status === "inactive",
        onClick: vi.fn(),
      },
      {
        id: "deactivate",
        label: "Deactivate",
        canApply: (v) => v.status === "active",
        onClick: vi.fn(),
      },
      archive(),
    ];
    render(<Harness selectionActions={actions} />, { wrapper });

    fireEvent.click(rowCheckbox(0)); // Acme — active
    fireEvent.click(rowCheckbox(2)); // Initech — archived

    const bar = getBar();
    expect(within(bar).getByRole("button", { name: "Activate (0)" })).toHaveProperty(
      "disabled",
      true,
    );
    expect(within(bar).getByRole("button", { name: "Deactivate (1)" })).toHaveProperty(
      "disabled",
      false,
    );
    // No `canApply`: applies to every selected row, so no count is shown.
    expect(within(bar).getByRole("button", { name: "Archive" })).toHaveProperty("disabled", false);
  });

  it("hands onClick only the eligible rows, plus a clearSelection helper", () => {
    const onSelectionChange = vi.fn();
    const onClick = vi.fn((_rows: Vendor[], { clearSelection }: { clearSelection: () => void }) =>
      clearSelection(),
    );
    const actions: SelectionAction<Vendor>[] = [
      { id: "deactivate", label: "Deactivate", canApply: (v) => v.status === "active", onClick },
    ];
    render(<Harness selectionActions={actions} onSelectionChange={onSelectionChange} />, {
      wrapper,
    });

    fireEvent.click(rowCheckbox(0)); // Acme — active
    fireEvent.click(rowCheckbox(1)); // Globex — inactive
    fireEvent.click(within(getBar()).getByRole("button", { name: "Deactivate (1)" }));

    expect(onClick).toHaveBeenCalledTimes(1);
    expect(onClick.mock.calls[0][0]).toEqual([vendors[0]]);
    expect(onSelectionChange).toHaveBeenLastCalledWith([]);
    expect(queryBar()).toBeNull();
  });

  it("includes rows selected on other pages", () => {
    const onClick = vi.fn();
    const { rerender } = render(<Harness selectionActions={[archive(onClick)]} />, { wrapper });

    fireEvent.click(rowCheckbox(0)); // Acme, on the first page
    const nextPage = { rows: [{ id: "4", name: "Hooli", status: "active" as const }], total: 4 };
    rerender(<Harness selectionActions={[archive(onClick)]} data={nextPage} />);
    fireEvent.click(rowCheckbox(0)); // Hooli, on the second

    expect(within(getBar()).getByText("2 of 4 selected")).toBeDefined();
    fireEvent.click(within(getBar()).getByRole("button", { name: "Archive" }));
    expect(onClick.mock.calls[0][0]).toEqual([vendors[0], nextPage.rows[0]]);
  });

  it("moves actions past the third into a More actions menu", async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();
    const actions: SelectionAction<Vendor>[] = [
      { id: "a", label: "Activate", onClick: vi.fn() },
      { id: "b", label: "Deactivate", onClick: vi.fn() },
      { id: "c", label: "Export", onClick: vi.fn() },
      {
        id: "delete",
        label: "Delete",
        variant: "destructive",
        canApply: (v) => v.status === "archived",
        onClick: onDelete,
      },
    ];
    render(<Harness selectionActions={actions} />, { wrapper });

    await user.click(rowCheckbox(2)); // Initech — archived

    const bar = getBar();
    expect(within(bar).queryByRole("button", { name: /Delete/ })).toBeNull();
    await user.click(within(bar).getByRole("button", { name: "More actions" }));
    const item = await screen.findByRole("menuitem", { name: "Delete (1)" });
    await user.click(item);

    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(onDelete.mock.calls[0][0]).toEqual([vendors[2]]);
  });

  it("Clear empties the selection and hands focus back to the header checkbox", async () => {
    const user = userEvent.setup();
    const onSelectionChange = vi.fn();
    render(<Harness selectionActions={[archive()]} onSelectionChange={onSelectionChange} />, {
      wrapper,
    });

    await user.click(rowCheckbox(0));
    await user.click(within(getBar()).getByRole("button", { name: "Clear selection" }));

    expect(onSelectionChange).toHaveBeenLastCalledWith([]);
    expect(queryBar()).toBeNull();
    expect(document.activeElement).toBe(screen.getByLabelText("Select all rows"));
  });

  it("supports arrow-key navigation between the bar's controls", async () => {
    const user = userEvent.setup();
    const actions: SelectionAction<Vendor>[] = [
      { id: "a", label: "Activate", onClick: vi.fn() },
      { id: "b", label: "Deactivate", onClick: vi.fn() },
    ];
    render(<Harness selectionActions={actions} />, { wrapper });

    await user.click(rowCheckbox(0));
    within(getBar()).getByRole("button", { name: "Activate" }).focus();
    await user.keyboard("{ArrowRight}");

    expect(document.activeElement).toBe(
      within(getBar()).getByRole("button", { name: "Deactivate" }),
    );
  });

  it("announces the count politely from the first selection on", () => {
    const { container } = render(<Harness selectionActions={[archive()]} />, { wrapper });
    const liveRegion = () => container.querySelector('[aria-live="polite"]');

    // Mounted before anything is selected, so the first tick is announced.
    expect(liveRegion()?.textContent).toBe("");
    fireEvent.click(rowCheckbox(0));
    expect(liveRegion()?.textContent).toBe("1 of 3 selected");
  });

  it("renders the bar in a footer without children", () => {
    render(<Harness selectionActions={[archive()]} footer="empty" />, { wrapper });

    fireEvent.click(rowCheckbox(0));

    expect(within(getBar()).getByRole("button", { name: "Archive" })).toBeDefined();
  });

  it("leaves the footer as it was when no selectionActions are given", () => {
    const { container } = render(<Harness onSelectionChange={vi.fn()} />, { wrapper });

    fireEvent.click(rowCheckbox(0));

    expect(queryBar()).toBeNull();
    expect(footerOf(container).hasAttribute("data-selecting")).toBe(false);
    expect(screen.getByText("1 of 3 row(s) selected")).toBeDefined();
    expect(container.querySelector('[aria-live="polite"]')).toBeNull();
  });

  it("closes the bar when the last selected row is deselected", async () => {
    render(<Harness selectionActions={[archive()]} />, { wrapper });

    fireEvent.click(rowCheckbox(0));
    expect(queryBar()).not.toBeNull();
    fireEvent.click(rowCheckbox(0));

    await waitFor(() => expect(queryBar()).toBeNull());
  });

  // ---------------------------------------------------------------------------
  // Actions that return a promise
  // ---------------------------------------------------------------------------
  describe("async actions", () => {
    it("disables every action and shows a spinner while the promise is pending", () => {
      const pending = deferred();
      const actions: SelectionAction<Vendor>[] = [
        { id: "activate", label: "Activate", onClick: () => pending.promise },
        { id: "export", label: "Export", onClick: vi.fn() },
      ];
      render(<Harness selectionActions={actions} />, { wrapper });

      fireEvent.click(rowCheckbox(0));
      const activate = within(getBar()).getByRole("button", { name: "Activate" });
      fireEvent.click(activate);

      expect(getBar().getAttribute("aria-busy")).toBe("true");
      expect(activate).toHaveProperty("disabled", true);
      expect(activate.querySelector('[data-slot="spinner"]')).not.toBeNull();
      expect(within(getBar()).getByRole("button", { name: "Export" })).toHaveProperty(
        "disabled",
        true,
      );
    });

    it("clears the selection once the promise resolves", async () => {
      const onSelectionChange = vi.fn();
      const pending = deferred();
      const actions: SelectionAction<Vendor>[] = [
        { id: "activate", label: "Activate", onClick: () => pending.promise },
      ];
      render(<Harness selectionActions={actions} onSelectionChange={onSelectionChange} />, {
        wrapper,
      });

      fireEvent.click(rowCheckbox(0));
      fireEvent.click(within(getBar()).getByRole("button", { name: "Activate" }));
      expect(queryBar()).not.toBeNull();

      await act(async () => {
        pending.resolve();
        await pending.promise;
      });

      expect(queryBar()).toBeNull();
      expect(onSelectionChange).toHaveBeenLastCalledWith([]);
    });

    it("keeps the selection after the promise when keepSelection is set", async () => {
      const exportRows = vi.fn(() => Promise.resolve());
      const actions: SelectionAction<Vendor>[] = [
        { id: "export", label: "Export", keepSelection: true, onClick: exportRows },
      ];
      render(<Harness selectionActions={actions} />, { wrapper });

      fireEvent.click(rowCheckbox(0));
      await act(async () => {
        fireEvent.click(within(getBar()).getByRole("button", { name: "Export" }));
      });

      expect(exportRows).toHaveBeenCalledTimes(1);
      expect(within(getBar()).getByRole("button", { name: "Export" })).toHaveProperty(
        "disabled",
        false,
      );
      expect(getBar().hasAttribute("aria-busy")).toBe(false);
    });

    it("keeps the selection and re-enables the actions when the promise rejects", async () => {
      const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
      const pending = deferred();
      const actions: SelectionAction<Vendor>[] = [
        { id: "activate", label: "Activate", onClick: () => pending.promise },
      ];
      render(<Harness selectionActions={actions} />, { wrapper });

      fireEvent.click(rowCheckbox(0));
      fireEvent.click(within(getBar()).getByRole("button", { name: "Activate" }));
      await act(async () => {
        pending.reject(new Error("network down"));
        await pending.promise.catch(() => {});
      });

      expect(within(getBar()).getByRole("button", { name: "Activate" })).toHaveProperty(
        "disabled",
        false,
      );
      expect(consoleError).toHaveBeenCalledWith(
        '[DataTable] Selection action "activate" failed:',
        expect.any(Error),
      );
      consoleError.mockRestore();
    });

    it("leaves the selection alone when onClick returns nothing", () => {
      // e.g. an onClick that only opens a confirm dialog
      const actions: SelectionAction<Vendor>[] = [
        { id: "delete", label: "Delete", onClick: vi.fn() },
      ];
      render(<Harness selectionActions={actions} />, { wrapper });

      fireEvent.click(rowCheckbox(0));
      fireEvent.click(within(getBar()).getByRole("button", { name: "Delete" }));

      expect(queryBar()).not.toBeNull();
      expect(getBar().hasAttribute("aria-busy")).toBe(false);
    });

    it("fires a single onSelectionChange([]) when the action also clears itself", async () => {
      const onSelectionChange = vi.fn();
      const actions: SelectionAction<Vendor>[] = [
        {
          id: "activate",
          label: "Activate",
          onClick: async (_rows, { clearSelection }) => clearSelection(),
        },
      ];
      render(<Harness selectionActions={actions} onSelectionChange={onSelectionChange} />, {
        wrapper,
      });

      fireEvent.click(rowCheckbox(0));
      await act(async () => {
        fireEvent.click(within(getBar()).getByRole("button", { name: "Activate" }));
      });

      expect(onSelectionChange.mock.calls.filter(([ids]) => ids.length === 0)).toHaveLength(1);
    });
  });
});
