import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useEffect, useState } from "react";
import { createAppShellWrapper } from "../../../tests/test-utils";
import { DataTable } from "./data-table";
import { DataTableCSVExporter } from "./csv-exporter";
import { useDataTable } from "./use-data-table";
import type { CsvExporterState } from "@/components/csv-exporter";

const wrapper = createAppShellWrapper("en");
type Row = { name: string };

function TestCSVExporter({ exporter }: { exporter: CsvExporterState<Row> }) {
  const [open, setOpen] = useState(false);
  const table = useDataTable<Row>({
    columns: [
      { id: "name", label: "Name", render: (row) => row.name },
      { id: "hidden", label: "Hidden", render: () => "hidden" },
    ],
    data: { rows: [] },
  });

  const { toggleColumn } = table;
  useEffect(() => {
    toggleColumn("hidden");
  }, [toggleColumn]);

  return (
    <DataTable.Root value={table}>
      <DataTableCSVExporter open={open} onOpenChange={setOpen} exporter={exporter} />
    </DataTable.Root>
  );
}

afterEach(() => {
  cleanup();
});

describe("DataTable.CSVExporter", () => {
  const idleExporter: CsvExporterState<Row> = {
    defaultFilename: "products.csv",
    exportCsv: vi.fn().mockResolvedValue(true),
    cancel: vi.fn(),
    phase: "idle",
    progress: { completed: 0, total: null },
    error: null,
  };

  it("reports indeterminate and determinate export progress", async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <TestCSVExporter exporter={{ ...idleExporter, phase: "fetching" }} />,
      { wrapper },
    );

    await user.click(screen.getByRole("button", { name: "CSV Export" }));
    expect(
      screen
        .getByRole("progressbar", { name: "0 rows fetched" })
        .hasAttribute("data-indeterminate"),
    ).toBe(true);

    rerender(
      <TestCSVExporter
        exporter={{ ...idleExporter, phase: "fetching", progress: { completed: 1, total: 2 } }}
      />,
    );

    const progress = screen.getByRole("progressbar", { name: "1 / 2 rows fetched" });
    expect(progress.getAttribute("aria-valuenow")).toBe("1");
    expect(progress.getAttribute("aria-valuemax")).toBe("2");
  });

  it("can reopen an in-progress export dialog", async () => {
    const user = userEvent.setup();
    const exporter: CsvExporterState<Row> = { ...idleExporter, phase: "fetching" };

    render(<TestCSVExporter exporter={exporter} />, { wrapper });

    await user.click(screen.getByRole("button", { name: "CSV Export" }));
    expect(screen.getByRole("dialog")).toBeDefined();

    await user.click(screen.getByRole("button", { name: "Close" }));
    expect(screen.queryByRole("dialog")).toBeNull();

    await user.click(screen.getByRole("button", { name: "CSV Export" }));
    expect(screen.getByRole("dialog")).toBeDefined();
  });

  it("uses the dialog filename and visible columns when starting an export", async () => {
    const user = userEvent.setup();
    const exporter: CsvExporterState<Row> = {
      ...idleExporter,
      exportCsv: vi.fn().mockResolvedValue(true),
    };

    render(<TestCSVExporter exporter={exporter} />, { wrapper });

    await user.click(screen.getByRole("button", { name: "CSV Export" }));
    const filename = screen.getByLabelText("File name");
    await user.clear(filename);
    await user.type(filename, "all-products");
    await user.click(screen.getByRole("button", { name: "Download" }));

    await waitFor(() => {
      expect(exporter.exportCsv).toHaveBeenCalled();
    });
    expect(exporter.exportCsv).toHaveBeenCalledWith("all-products", [
      expect.objectContaining({ id: "name" }),
    ]);
  });
});
