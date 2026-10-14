import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, renderHook } from "@testing-library/react";
import { toast } from "sonner";
import { createAppShellWrapper } from "../../../tests/test-utils";
import { useCsvExporter } from "@/components/csv-exporter";
import { DataTable } from "./data-table";
import { useDataTableCsvExporter } from "./use-data-table-csv-exporter";
import type { UseDataTableCsvExporterOptions } from "./use-data-table-csv-exporter";
import type {
  CsvCursorFetcher,
  CsvExportPage,
  UseCsvExporterOptions,
} from "@/components/csv-exporter";
import type { DataTableCSVExporterProps } from "@/index";

const wrapper = createAppShellWrapper("en");
type Row = { name: string };
const fetcher: CsvCursorFetcher<Row> = async () => null;

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("useDataTableCsvExporter", () => {
  it("returns controlled props and an open action without DataTable context", () => {
    const { result } = renderHook(
      () => useDataTableCsvExporter({ defaultFilename: "products.csv", fetcher }),
      { wrapper },
    );

    expect(result.current.props.open).toBe(false);
    expect(result.current.props.exporter.phase).toBe("idle");
    act(() => result.current.open());
    expect(result.current.props.open).toBe(true);
    act(() => result.current.props.onOpenChange(false));
    expect(result.current.props.open).toBe(false);
  });

  it("rejects column configuration, including options from a standalone hook", () => {
    const standalone: UseCsvExporterOptions<Row> = {
      defaultFilename: "products.csv",
      fetcher,
      columns: [{ header: "Name", value: (row) => row.name }],
    };
    const invalid: UseDataTableCsvExporterOptions<Row> = {
      defaultFilename: "products.csv",
      fetcher,
      // @ts-expect-error Table export columns are supplied by the component, not the hook.
      columns: [],
    };
    // @ts-expect-error Columns must also be rejected when options are passed through a variable.
    const invalidSpread: UseDataTableCsvExporterOptions<Row> = { ...standalone };

    expect(invalid).toBeDefined();
    expect(invalidSpread).toBeDefined();
  });

  it("accepts only the dedicated exporter, even when controlled props are recomposed", () => {
    const { result } = renderHook(
      () => ({
        table: useDataTableCsvExporter({ defaultFilename: "products.csv", fetcher }),
        standalone: useCsvExporter({
          defaultFilename: "report.csv",
          fetcher,
          columns: [{ header: "Name", value: (row) => row.name }],
        }),
      }),
      { wrapper },
    );
    const tableProps: DataTableCSVExporterProps<Row> = result.current.table.props;
    const valid = <DataTable.CSVExporter {...tableProps} />;
    // @ts-expect-error A standalone exporter does not carry the private table brand.
    const invalid = <DataTable.CSVExporter {...result.current.standalone.props} />;
    const substituted: DataTableCSVExporterProps<Row> = {
      ...tableProps,
      // @ts-expect-error Keeping table props cannot make a standalone exporter valid.
      exporter: result.current.standalone.props.exporter,
    };
    const startWithoutColumns = () => {
      // @ts-expect-error A table export requires the columns supplied by DataTable.CSVExporter.
      return tableProps.exporter.exportCsv();
    };

    expect(valid).toBeDefined();
    expect(invalid).toBeDefined();
    expect(substituted).toBeDefined();
    expect(startWithoutColumns).toBeTypeOf("function");
  });

  it("cancels an in-flight table export", async () => {
    const pendingFetcher = vi.fn<CsvCursorFetcher<Row>>(
      ({ signal }) =>
        new Promise((_resolve, reject) => {
          signal.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")));
        }),
    );
    vi.spyOn(toast, "info").mockReturnValue("toast");
    const { result } = renderHook(
      () => useDataTableCsvExporter({ defaultFilename: "products.csv", fetcher: pendingFetcher }),
      { wrapper },
    );
    let exportPromise!: Promise<boolean>;
    act(() => {
      exportPromise = result.current.props.exporter.exportCsv("products.csv", [
        { id: "name", label: "Name", render: (row) => row.name },
      ]);
    });
    act(() => result.current.props.exporter.cancel());
    await act(async () => {
      await expect(exportPromise).resolves.toBe(false);
    });

    expect(result.current.props.exporter.phase).toBe("cancelled");
  });

  it.each(["resolves", "rejects"])(
    "aborts on unmount without side effects when the pending fetch later %s",
    async (outcome) => {
      let resolveFetch!: (page: CsvExportPage<Row>) => void;
      let rejectFetch!: (error: Error) => void;
      let signal!: AbortSignal;
      const pendingFetcher = vi.fn<CsvCursorFetcher<Row>>(({ signal: nextSignal }) => {
        signal = nextSignal;
        return new Promise((resolve, reject) => {
          resolveFetch = resolve;
          rejectFetch = reject;
        });
      });
      const errorToast = vi.spyOn(toast, "error").mockReturnValue("toast");
      const infoToast = vi.spyOn(toast, "info").mockReturnValue("toast");
      const successToast = vi.spyOn(toast, "success").mockReturnValue("toast");
      const download = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
      const { result, unmount } = renderHook(
        () => useDataTableCsvExporter({ defaultFilename: "products.csv", fetcher: pendingFetcher }),
        { wrapper },
      );
      let exportPromise!: Promise<boolean>;
      act(() => {
        exportPromise = result.current.props.exporter.exportCsv("products.csv", [
          { id: "name", label: "Name", render: (row) => row.name },
        ]);
      });
      unmount();
      expect(signal.aborted).toBe(true);
      if (outcome === "resolves") {
        resolveFetch({
          rows: [{ name: "Alice" }],
          pageInfo: { hasNextPage: false, endCursor: null },
        });
      } else {
        rejectFetch(new Error("Fetch failed after unmount"));
      }

      await expect(exportPromise).resolves.toBe(false);
      expect(pendingFetcher).toHaveBeenCalledTimes(1);
      expect(download).not.toHaveBeenCalled();
      expect(errorToast).not.toHaveBeenCalled();
      expect(infoToast).not.toHaveBeenCalled();
      expect(successToast).not.toHaveBeenCalled();
    },
  );
});
