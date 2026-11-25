import { afterEach, describe, it, expect, vi } from "vitest";
import { cleanup, render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { resetLocalTimeZone } from "@internationalized/date";
import { createAppShellWrapper } from "../../../tests/test-utils";
import {
  TestDataTable,
  testColumns,
  testData,
  makeControl,
  wrapper,
  type TestRow,
} from "./test-utils";
import { DataTable } from "./data-table";
import { useDataTable } from "./use-data-table";
import type { DataTableData, RowAction } from "./types";

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
  resetLocalTimeZone();
  vi.restoreAllMocks();
});

describe("DataTable", () => {
  it("renders a basic data table with headers and rows", () => {
    render(<TestDataTable />, { wrapper });

    expect(screen.getByText("Name")).toBeDefined();
    expect(screen.getByText("Status")).toBeDefined();
    expect(screen.getByText("Alice")).toBeDefined();
    expect(screen.getByText("Bob")).toBeDefined();
    expect(screen.getByText("Active")).toBeDefined();
    expect(screen.getByText("Inactive")).toBeDefined();
  });

  it("renders loading state", () => {
    const { container } = render(<TestDataTable data={undefined} loading />, {
      wrapper,
    });

    expect(container.querySelectorAll('[data-datatable-state="loading"]').length).toBeGreaterThan(
      0,
    );
  });

  it("renders error state", () => {
    render(<TestDataTable data={undefined} error={new Error("Network error")} />, { wrapper });

    expect(screen.getByText(/Network error/)).toBeDefined();
  });

  it("renders empty state", () => {
    const emptyData: DataTableData<TestRow> = {
      rows: [],
    };
    render(<TestDataTable data={emptyData} />, { wrapper });

    expect(screen.getByText("No data")).toBeDefined();
  });

  describe("emptyContent", () => {
    it.each([
      ["en", "No data"],
      ["ja", "データがありません"],
    ])("preserves the localized %s default when omitted or undefined", (locale, message) => {
      const { rerender } = render(<TestDataTable data={{ rows: [] }} />, {
        wrapper: createAppShellWrapper(locale),
      });
      expect(screen.getByText(message)).toBeDefined();

      rerender(<TestDataTable data={{ rows: [] }} emptyContent={undefined} />);
      expect(screen.getByText(message)).toBeDefined();
    });

    it("renders custom text with the default muted styling instead of the default message", () => {
      render(<TestDataTable data={{ rows: [] }} emptyContent="No requests awaiting approval" />, {
        wrapper,
      });

      expect(screen.getByText("No requests awaiting approval").className).toContain(
        "astw:text-muted-foreground",
      );
      expect(screen.queryByText("No data")).toBeNull();
    });

    it("renders custom block markup without an inline wrapper", () => {
      render(
        <TestDataTable
          data={{ rows: [] }}
          emptyContent={
            <div data-testid="custom-empty-content">
              <p>No requests awaiting approval</p>
              <a href="/requests/new">Create a request</a>
            </div>
          }
        />,
        { wrapper },
      );

      expect(screen.getByText("No requests awaiting approval")).toBeDefined();
      expect(screen.getByRole("link", { name: "Create a request" }).getAttribute("href")).toBe(
        "/requests/new",
      );
      const content = screen.getByTestId("custom-empty-content");
      expect(content.parentElement?.getAttribute("data-slot")).toBe("data-table-status-content");
      expect(content.parentElement?.parentElement?.tagName).toBe("TD");
      expect(content.closest("span")).toBeNull();
      expect(screen.queryByText("No data")).toBeNull();
    });

    it.each([null, false, ""])("does not fall back to the default for %j", (emptyContent) => {
      const { container } = render(
        <TestDataTable data={{ rows: [] }} emptyContent={emptyContent} />,
        {
          wrapper,
        },
      );

      expect(screen.queryByText("No data")).toBeNull();
      const emptyRow = container.querySelector('[data-datatable-state="empty"]');
      expect(emptyRow).not.toBeNull();
      expect(emptyRow?.textContent).toBe("");
    });

    it("renders zero as custom content", () => {
      render(<TestDataTable data={{ rows: [] }} emptyContent={0} />, { wrapper });

      expect(screen.getByText("0")).toBeDefined();
      expect(screen.queryByText("No data")).toBeNull();
    });

    it.each([
      { state: "loading", loading: true, error: null, data: { rows: [] } },
      {
        state: "loading with an error",
        loading: true,
        error: new Error("fail"),
        data: { rows: [] },
      },
      { state: "error", loading: false, error: new Error("fail"), data: { rows: [] } },
      { state: "data rows", loading: false, error: null, data: testData },
    ])("does not render custom empty content during $state", ({ loading, error, data }) => {
      const { container } = render(
        <TestDataTable
          data={data}
          loading={loading}
          error={error}
          emptyContent="No requests awaiting approval"
        />,
        { wrapper },
      );

      expect(screen.queryByText("No requests awaiting approval")).toBeNull();
      expect(container.querySelector('[data-datatable-state="empty"]')).toBeNull();
    });

    it("keeps empty content local to each table instance", () => {
      const { container } = render(
        <>
          <TestDataTable data={{ rows: [] }} emptyContent="No requests awaiting approval" />
          <TestDataTable data={{ rows: [] }} />
        </>,
        { wrapper },
      );
      const tables = container.querySelectorAll<HTMLElement>('[data-slot="data-table"]');

      expect(within(tables[0]).getByText("No requests awaiting approval")).toBeDefined();
      expect(within(tables[0]).queryByText("No data")).toBeNull();
      expect(within(tables[1]).getByText("No data")).toBeDefined();
      expect(within(tables[1]).queryByText("No requests awaiting approval")).toBeNull();
    });
  });

  it.each(["empty", "error"] as const)(
    "spans visible data and utility columns in the %s state when columns are hidden",
    (state) => {
      function StatusTableWithUtilityColumns() {
        const table = useDataTable<TestRow>({
          columns: [
            { id: "name", label: "Name", type: "text" },
            { id: "status", label: "Status", type: "text" },
          ],
          data: { rows: [] },
          error: state === "error" ? new Error("Network error") : null,
          rowSelection: {},
          rowExpansion: { render: () => null },
          rowActions: [{ id: "edit", label: "Edit", onClick: vi.fn() }],
        });
        return (
          <>
            <button onClick={() => table.toggleColumn("status")}>Hide status</button>
            <DataTable.Root value={table}>
              <DataTable.Table emptyContent="Custom status" errorContent="Custom status" />
            </DataTable.Root>
          </>
        );
      }

      const { container } = render(<StatusTableWithUtilityColumns />, { wrapper });
      const statusCell = () =>
        container.querySelector<HTMLTableCellElement>(`[data-datatable-state="${state}"] td`);
      expect(container.querySelectorAll("thead th")).toHaveLength(5);
      expect(statusCell()?.colSpan).toBe(5);

      fireEvent.click(screen.getByRole("button", { name: "Hide status" }));

      expect(container.querySelectorAll("thead th")).toHaveLength(4);
      expect(statusCell()?.colSpan).toBe(4);
      expect(screen.getByText("Custom status")).toBeDefined();
    },
  );

  describe("errorContent", () => {
    it.each([
      ["en", "Error: Network error"],
      ["ja", "エラー: Network error"],
    ])("preserves the localized %s default when omitted or undefined", (locale, message) => {
      const error = new Error("Network error");
      const { rerender } = render(<TestDataTable error={error} />, {
        wrapper: createAppShellWrapper(locale),
      });
      expect(screen.getByText(message)).toBeDefined();

      rerender(<TestDataTable error={error} errorContent={undefined} />);
      expect(screen.getByText(message)).toBeDefined();
    });

    it("replaces the error message and stale rows with custom text using the default error styling", () => {
      render(
        <TestDataTable error={new Error("Network error")} errorContent="Unable to load requests" />,
        { wrapper },
      );

      expect(screen.getByText("Unable to load requests").className).toContain(
        "astw:text-danger-text",
      );
      expect(screen.queryByText(/Network error/)).toBeNull();
      expect(screen.queryByText("Alice")).toBeNull();
    });

    it("renders custom block markup and consumer-owned actions without an inline wrapper", () => {
      const onRetry = vi.fn();
      render(
        <TestDataTable
          error={new Error("Network error")}
          errorContent={
            <div data-testid="custom-error-content">
              <p>Unable to load requests</p>
              <button onClick={onRetry}>Retry</button>
            </div>
          }
        />,
        { wrapper },
      );

      const content = screen.getByTestId("custom-error-content");
      expect(content.parentElement?.getAttribute("data-slot")).toBe("data-table-status-content");
      expect(content.parentElement?.parentElement?.tagName).toBe("TD");
      expect(content.closest("span")).toBeNull();
      expect(screen.queryByText(/Network error/)).toBeNull();
      fireEvent.click(screen.getByRole("button", { name: "Retry" }));
      expect(onRetry).toHaveBeenCalledOnce();
    });

    it.each([null, false, "", 0])(
      "renders %j without falling back to the default",
      (errorContent) => {
        const { container } = render(
          <TestDataTable error={new Error("Network error")} errorContent={errorContent} />,
          { wrapper },
        );

        const errorRow = container.querySelector('[data-datatable-state="error"]');
        expect(errorRow).not.toBeNull();
        expect(errorRow?.textContent).toBe(errorContent === 0 ? "0" : "");
        expect(screen.queryByText(/Network error/)).toBeNull();
      },
    );

    it.each([
      { state: "loading with an error", loading: true, error: new Error("fail"), data: testData },
      { state: "empty", loading: false, error: null, data: { rows: [] } },
      { state: "data rows", loading: false, error: null, data: testData },
    ])("does not render error content during $state", ({ loading, error, data }) => {
      const { container } = render(
        <TestDataTable
          data={data}
          loading={loading}
          error={error}
          errorContent="Unable to load requests"
        />,
        { wrapper },
      );

      expect(screen.queryByText("Unable to load requests")).toBeNull();
      expect(container.querySelector('[data-datatable-state="error"]')).toBeNull();
    });

    it("keeps error content local to each table instance", () => {
      const error = new Error("Network error");
      const { container } = render(
        <>
          <TestDataTable error={error} errorContent="Unable to load requests" />
          <TestDataTable error={error} />
        </>,
        { wrapper },
      );
      const tables = container.querySelectorAll<HTMLElement>('[data-slot="data-table"]');

      expect(within(tables[0]).getByText("Unable to load requests")).toBeDefined();
      expect(within(tables[0]).queryByText(/Network error/)).toBeNull();
      expect(within(tables[1]).getByText("Error: Network error")).toBeDefined();
      expect(within(tables[1]).queryByText("Unable to load requests")).toBeNull();
    });
  });

  it("renders with data-slot attributes", () => {
    const { container } = render(<TestDataTable />, { wrapper });

    expect(container.querySelector('[data-slot="data-table"]')).toBeDefined();
    expect(container.querySelector('[data-slot="data-table-table"]')).toBeDefined();
    expect(container.querySelector('[data-slot="data-table-header"]')).toBeDefined();
    expect(container.querySelector('[data-slot="data-table-body"]')).toBeDefined();
  });

  it("resets the table scroll position when pagination changes page", async () => {
    const pagedData: DataTableData<TestRow> = {
      rows: testData.rows,
      pageInfo: {
        hasNextPage: true,
        hasPreviousPage: true,
        endCursor: "next-tok",
        startCursor: "prev-tok",
      },
      total: 50,
    };

    function PaginatedTable() {
      const table = useDataTable<TestRow>({
        columns: testColumns,
        data: pagedData,
        control: makeControl({ getHasPrevPage: () => true }),
      });

      return (
        <DataTable.Root value={table}>
          <DataTable.Table />
          <DataTable.Footer>
            <DataTable.Pagination />
          </DataTable.Footer>
        </DataTable.Root>
      );
    }

    const { container } = render(<PaginatedTable />, { wrapper });
    const scrollContainer = container.querySelector<HTMLDivElement>(
      '[data-slot="table-container"]',
    );

    expect(scrollContainer).not.toBeNull();
    if (!scrollContainer) return;

    scrollContainer.scrollTop = 120;
    fireEvent.click(screen.getByLabelText("Next page"));

    await waitFor(() => {
      expect(scrollContainer.scrollTop).toBe(0);
    });
  });

  describe("state exclusivity", () => {
    it("shows only skeleton when loading=true, regardless of data", () => {
      const { container } = render(<TestDataTable data={testData} loading />, {
        wrapper,
      });

      expect(container.querySelectorAll('[data-datatable-state="loading"]').length).toBeGreaterThan(
        0,
      );
      expect(container.querySelector('[data-datatable-state="error"]')).toBeNull();
      expect(container.querySelector('[data-datatable-state="empty"]')).toBeNull();
      expect(container.querySelector('[data-slot="data-table-row"]')).toBeNull();
    });

    it("shows only skeleton when loading=true and error is also set", () => {
      const { container } = render(
        <TestDataTable data={undefined} loading error={new Error("fail")} />,
        { wrapper },
      );

      expect(container.querySelectorAll('[data-datatable-state="loading"]').length).toBeGreaterThan(
        0,
      );
      expect(container.querySelector('[data-datatable-state="error"]')).toBeNull();
    });

    it("shows only error when loading=false and error is set, even with data", () => {
      const { container } = render(<TestDataTable data={testData} error={new Error("fail")} />, {
        wrapper,
      });

      expect(container.querySelector('[data-datatable-state="error"]')).not.toBeNull();
      expect(container.querySelectorAll('[data-datatable-state="loading"]')).toHaveLength(0);
      expect(container.querySelector('[data-datatable-state="empty"]')).toBeNull();
      expect(container.querySelector('[data-slot="data-table-row"]')).toBeNull();
    });

    it("shows only empty state when loading=false, no error, and rows is empty", () => {
      const { container } = render(<TestDataTable data={{ rows: [] }} />, {
        wrapper,
      });

      expect(container.querySelector('[data-datatable-state="empty"]')).not.toBeNull();
      expect(container.querySelectorAll('[data-datatable-state="loading"]')).toHaveLength(0);
      expect(container.querySelector('[data-datatable-state="error"]')).toBeNull();
      expect(container.querySelector('[data-slot="data-table-row"]')).toBeNull();
    });

    it("shows only data rows when loading=false, no error, and rows exist", () => {
      const { container } = render(<TestDataTable />, { wrapper });

      expect(container.querySelectorAll('[data-slot="data-table-row"]').length).toBeGreaterThan(0);
      expect(container.querySelectorAll('[data-datatable-state="loading"]')).toHaveLength(0);
      expect(container.querySelector('[data-datatable-state="error"]')).toBeNull();
      expect(container.querySelector('[data-datatable-state="empty"]')).toBeNull();
    });
  });

  describe("loading skeleton", () => {
    it("renders DEFAULT_ROWS (5) skeleton rows when loading with no data", () => {
      const { container } = render(<TestDataTable data={undefined} loading />, {
        wrapper,
      });

      const skeletonRows = container.querySelectorAll('[data-datatable-state="loading"]');
      expect(skeletonRows).toHaveLength(5);
    });

    it("renders skeleton rows even when data is present while loading", () => {
      const { container } = render(<TestDataTable data={testData} loading />, {
        wrapper,
      });

      const skeletonRows = container.querySelectorAll('[data-datatable-state="loading"]');
      expect(skeletonRows.length).toBeGreaterThan(0);
    });

    it("hides actual data rows while loading", () => {
      render(<TestDataTable data={testData} loading />, { wrapper });

      expect(screen.queryByText("Alice")).toBeNull();
      expect(screen.queryByText("Bob")).toBeNull();
    });

    it("each skeleton row has one cell per visible column", () => {
      const { container } = render(<TestDataTable data={undefined} loading />, {
        wrapper,
      });

      const skeletonRows = container.querySelectorAll('[data-datatable-state="loading"]');
      skeletonRows.forEach((row) => {
        // testColumns has 2 columns, no selection, no row actions
        expect(row.querySelectorAll("td")).toHaveLength(2);
      });
    });

    it("skeleton rows include selection cell when onSelectionChange is provided", () => {
      const { container } = render(
        <TestDataTable data={undefined} loading onSelectionChange={vi.fn()} />,
        { wrapper },
      );

      const skeletonRows = container.querySelectorAll('[data-datatable-state="loading"]');
      skeletonRows.forEach((row) => {
        // 2 columns + 1 selection cell
        expect(row.querySelectorAll("td")).toHaveLength(3);
      });
    });

    it("skeleton rows include actions cell when rowActions are provided", () => {
      const rowActions: RowAction<TestRow>[] = [{ id: "edit", label: "Edit", onClick: vi.fn() }];

      function TestDataTableWithActions() {
        const table = useDataTable<TestRow>({
          columns: testColumns,
          data: undefined,
          loading: true,
          rowActions,
        });
        return (
          <DataTable.Root value={table}>
            <DataTable.Table />
          </DataTable.Root>
        );
      }

      const { container } = render(<TestDataTableWithActions />, { wrapper });

      const skeletonRows = container.querySelectorAll('[data-datatable-state="loading"]');
      skeletonRows.forEach((row) => {
        // 2 columns + 1 actions cell
        expect(row.querySelectorAll("td")).toHaveLength(3);
      });
    });

    it("does not render skeleton rows when not loading", () => {
      const { container } = render(<TestDataTable />, { wrapper });

      const skeletonRows = container.querySelectorAll('[data-datatable-state="loading"]');
      expect(skeletonRows).toHaveLength(0);
    });
  });
});
