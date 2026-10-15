import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { toast } from "sonner";
import { createAppShellWrapper } from "../../../tests/test-utils";
import { DataTable } from "./data-table";
import { DataTableCSVExporter } from "./csv-exporter";
import { useDataTable } from "./use-data-table";
import { useDataTableCsvExporter } from "./use-data-table-csv-exporter";
import type { DataTableCSVExporterProps } from "./use-data-table-csv-exporter";
import type { Column } from "./types";
import type { CsvCursorFetcher, CsvExportPage } from "@/components/csv-exporter";

const wrapper = createAppShellWrapper("en");
type Row = { name: string; sku: string };
const columns: Column<Row>[] = [
  { id: "name", label: "Name", render: (row) => row.name },
  { id: "sku", label: "SKU", render: (row) => row.sku },
];
const page: CsvExportPage<Row> = {
  rows: [{ name: "Alice", sku: "A-1" }],
  pageInfo: { hasNextPage: false, endCursor: null },
  total: 1,
};
const emptyFetcher: CsvCursorFetcher<Row> = async () => null;

function TestCSVExporter({
  fetcher = emptyFetcher,
  tableColumns = columns,
  exporter,
}: {
  fetcher?: CsvCursorFetcher<Row>;
  tableColumns?: Column<Row>[];
  exporter?: Partial<DataTableCSVExporterProps<Row>["exporter"]>;
}) {
  const table = useDataTable({ columns: tableColumns, data: { rows: [] } });
  const { props } = useDataTableCsvExporter({ defaultFilename: "products.csv", fetcher });

  return (
    <DataTable.Root value={table}>
      <button onClick={() => table.toggleColumn("sku")}>Toggle SKU</button>
      <button onClick={() => table.setColumnOrder(["sku", "name"])}>SKU first</button>
      <button onClick={table.hideAllColumns}>Hide all</button>
      <DataTableCSVExporter {...props} exporter={{ ...props.exporter, ...exporter }} />
    </DataTable.Root>
  );
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("DataTable.CSVExporter", () => {
  it("reports indeterminate and determinate export progress", async () => {
    const user = userEvent.setup();
    const { rerender } = render(<TestCSVExporter exporter={{ phase: "fetching" }} />, {
      wrapper,
    });

    await user.click(screen.getByRole("button", { name: "CSV Export" }));
    expect(
      screen
        .getByRole("progressbar", { name: "0 rows fetched" })
        .hasAttribute("data-indeterminate"),
    ).toBe(true);

    rerender(
      <TestCSVExporter exporter={{ phase: "fetching", progress: { completed: 1, total: 2 } }} />,
    );

    const progress = screen.getByRole("progressbar", { name: "1 / 2 rows fetched" });
    expect(progress.getAttribute("aria-valuenow")).toBe("1");
    expect(progress.getAttribute("aria-valuemax")).toBe("2");
  });

  it("can reopen an in-progress export dialog", async () => {
    const user = userEvent.setup();
    render(<TestCSVExporter exporter={{ phase: "fetching" }} />, { wrapper });

    await user.click(screen.getByRole("button", { name: "CSV Export" }));
    expect(screen.getByRole("dialog")).toBeDefined();
    await user.click(screen.getByRole("button", { name: "Close" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    await user.click(screen.getByRole("button", { name: "CSV Export" }));
    expect(screen.getByRole("dialog")).toBeDefined();
  });

  it("uses the dialog filename and current visible columns when starting an export", async () => {
    const user = userEvent.setup();
    const exportCsv = vi.fn().mockResolvedValue(true);
    render(<TestCSVExporter exporter={{ exportCsv }} />, { wrapper });

    await user.click(screen.getByRole("button", { name: "Toggle SKU" }));
    await user.click(screen.getByRole("button", { name: "CSV Export" }));
    const filename = screen.getByLabelText("File name");
    await user.clear(filename);
    await user.type(filename, "all-products");
    await user.click(screen.getByRole("button", { name: "Download" }));

    await waitFor(() => {
      expect(exportCsv).toHaveBeenCalledWith("all-products", [
        expect.objectContaining({ id: "name" }),
      ]);
    });
  });

  it("exports columns that are shown again, in their current table order", async () => {
    const user = userEvent.setup();
    const fetcher = vi.fn<CsvCursorFetcher<Row>>().mockResolvedValue(page);
    const downloaded: Blob[] = [];
    vi.stubGlobal("URL", {
      createObjectURL: vi.fn((blob: Blob) => {
        downloaded.push(blob);
        return "blob:csv";
      }),
      revokeObjectURL: vi.fn(),
    });
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    render(<TestCSVExporter fetcher={fetcher} />, { wrapper });

    await user.click(screen.getByRole("button", { name: "Toggle SKU" }));
    await user.click(screen.getByRole("button", { name: "Toggle SKU" }));
    await user.click(screen.getByRole("button", { name: "SKU first" }));
    await user.click(screen.getByRole("button", { name: "CSV Export" }));
    await user.click(screen.getByRole("button", { name: "Download" }));

    await waitFor(() => expect(downloaded).toHaveLength(1));
    expect(await downloaded[0]!.text()).toBe("\uFEFFSKU,Name\r\nA-1,Alice");
  });

  it("rejects hiding every column before fetching or downloading", async () => {
    const user = userEvent.setup();
    const fetcher = vi.fn<CsvCursorFetcher<Row>>();
    const errorToast = vi.spyOn(toast, "error").mockReturnValue("toast");
    const download = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    render(<TestCSVExporter fetcher={fetcher} />, { wrapper });

    await user.click(screen.getByRole("button", { name: "Hide all" }));
    await user.click(screen.getByRole("button", { name: "CSV Export" }));
    await user.click(screen.getByRole("button", { name: "Download" }));

    await waitFor(() => {
      expect(screen.getByRole("alert").textContent).toBe("Select at least one column to export");
    });
    expect(errorToast).toHaveBeenCalledExactlyOnceWith("Select at least one column to export");
    expect(fetcher).not.toHaveBeenCalled();
    expect(download).not.toHaveBeenCalled();
  });

  it("requires an id or accessor for labelled table columns before fetching", async () => {
    const user = userEvent.setup();
    const fetcher = vi.fn<CsvCursorFetcher<Row>>();
    vi.spyOn(toast, "error").mockReturnValue("toast");
    render(
      <TestCSVExporter
        fetcher={fetcher}
        tableColumns={[{ label: "Name", render: (row) => row.name }]}
      />,
      { wrapper },
    );

    await user.click(screen.getByRole("button", { name: "CSV Export" }));
    await user.click(screen.getByRole("button", { name: "Download" }));

    await waitFor(() => {
      expect(screen.getByRole("alert").textContent).toBe(
        'Column "Name" requires an id or accessor for CSV export',
      );
    });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("keeps an in-flight schema fixed and uses updated visibility on the next export", async () => {
    const user = userEvent.setup();
    let resolveFetch!: (value: CsvExportPage<Row>) => void;
    const fetcher = vi
      .fn<CsvCursorFetcher<Row>>()
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveFetch = resolve;
          }),
      )
      .mockResolvedValueOnce(page);
    const downloaded: Blob[] = [];
    vi.stubGlobal("URL", {
      createObjectURL: vi.fn((blob: Blob) => {
        downloaded.push(blob);
        return "blob:csv";
      }),
      revokeObjectURL: vi.fn(),
    });
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    render(<TestCSVExporter fetcher={fetcher} />, { wrapper });

    await user.click(screen.getByRole("button", { name: "CSV Export" }));
    await user.click(screen.getByRole("button", { name: "Download" }));
    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1));
    await user.click(screen.getByRole("button", { name: "Close" }));
    await user.click(screen.getByRole("button", { name: "Toggle SKU" }));
    await user.click(screen.getByRole("button", { name: "SKU first" }));
    await act(async () => resolveFetch(page));

    await waitFor(() => expect(downloaded).toHaveLength(1));
    expect(await downloaded[0]!.text()).toBe("\uFEFFName,SKU\r\nAlice,A-1");

    await user.click(screen.getByRole("button", { name: "CSV Export" }));
    await user.click(screen.getByRole("button", { name: "Download" }));
    await waitFor(() => expect(downloaded).toHaveLength(2));
    expect(await downloaded[1]!.text()).toBe("\uFEFFName\r\nAlice");
  });
});
