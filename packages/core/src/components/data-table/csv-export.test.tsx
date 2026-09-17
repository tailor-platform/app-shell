import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createAppShellWrapper } from "../../../tests/test-utils";
import { DataTable } from "./data-table";
import { DataTableCSVExport } from "./csv-export";
import type { CsvExporter } from "@/components/csv-exporter";

const wrapper = createAppShellWrapper("en");

afterEach(() => {
  cleanup();
});

describe("DataTable.CSVExport", () => {
  const idleExporter: CsvExporter = {
    defaultFilename: "products.csv",
    exportCsv: vi.fn().mockResolvedValue(undefined),
    cancel: vi.fn(),
    phase: "idle",
    progress: { completed: 0, total: null },
    error: null,
  };

  it("moves a direct toolbar child beside column controls", () => {
    const { container } = render(
      <DataTable.Toolbar>
        <span>Filters</span>
        <DataTable.CSVExport exporter={idleExporter} />
      </DataTable.Toolbar>,
      { wrapper },
    );

    const toolbar = container.querySelector('[data-slot="data-table-toolbar"]')!;
    expect(toolbar.children).toHaveLength(2);
    expect(toolbar.children[0]?.textContent).toContain("Filters");
    expect(toolbar.children[1]?.textContent).toContain("CSV Export");
  });

  it("can reopen an in-progress export dialog", async () => {
    const user = userEvent.setup();
    const exporter: CsvExporter = { ...idleExporter, phase: "fetching" };

    render(<DataTableCSVExport exporter={exporter} />, { wrapper });

    await user.click(screen.getByRole("button", { name: "CSV Export" }));
    expect(screen.getByRole("dialog")).toBeDefined();

    await user.click(screen.getByRole("button", { name: "Close" }));
    expect(screen.queryByRole("dialog")).toBeNull();

    await user.click(screen.getByRole("button", { name: "CSV Export" }));
    expect(screen.getByRole("dialog")).toBeDefined();
  });

  it("uses the dialog filename when starting an export", async () => {
    const user = userEvent.setup();
    const exporter: CsvExporter = {
      ...idleExporter,
      exportCsv: vi.fn().mockResolvedValue(undefined),
    };

    render(<DataTableCSVExport exporter={exporter} />, { wrapper });

    await user.click(screen.getByRole("button", { name: "CSV Export" }));
    const filename = screen.getByLabelText("File name");
    await user.clear(filename);
    await user.type(filename, "all-products");
    await user.click(screen.getByRole("button", { name: "Download" }));

    expect(exporter.exportCsv).toHaveBeenCalledWith("all-products");
  });
});
