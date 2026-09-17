import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { createColumnHelper } from "@/components/data-table/field-helpers";
import { createAppShellWrapper } from "../../../tests/test-utils";
import { useCsvExporter } from "./use-csv-exporter";
import type { CsvCursorFetcher, UseCsvExporterOptions } from "./types";

const wrapper = createAppShellWrapper("en");

type ExportTypeTestRow = { name: string };
const emptyExportTypeTestFetcher: CsvCursorFetcher<ExportTypeTestRow> = async () => null;

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("useCsvExporter", () => {
  it("requires a raw value source for labelled DataTable columns", () => {
    const { column } = createColumnHelper<ExportTypeTestRow>();
    const valid: UseCsvExporterOptions<ExportTypeTestRow> = {
      defaultFilename: "rows.csv",
      columns: [column({ id: "name", label: "Name", render: (row) => row.name })],
      fetcher: emptyExportTypeTestFetcher,
    };
    expect(valid.columns).toHaveLength(1);

    const invalid: UseCsvExporterOptions<ExportTypeTestRow> = {
      defaultFilename: "rows.csv",
      // @ts-expect-error Labelled DataTable columns need `id` or `accessor` for CSV export.
      columns: [column({ label: "Name", render: (row) => row.name })],
      fetcher: emptyExportTypeTestFetcher,
    };
    expect(invalid).toBeDefined();
  });

  it("fetches every cursor page and derives CSV columns from DataTable columns", async () => {
    type Row = { id: string; name: string; formula: string };
    const { column } = createColumnHelper<Row>();
    const columns = [
      column({ id: "name", label: "Name", render: (row) => row.name }),
      column({ id: "formula", label: "Formula", render: (row) => row.formula }),
      column({ render: () => <button>View</button> }),
    ];
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce({
        edges: [{ node: { id: "1", name: "Alice", formula: "=SUM(A1:A2)" } }],
        pageInfo: { hasNextPage: true, endCursor: "cursor-1" },
        total: 2,
      })
      .mockResolvedValueOnce({
        edges: [{ node: { id: "2", name: "Bob", formula: "safe" } }],
        pageInfo: { hasNextPage: false, endCursor: "cursor-2" },
        total: 2,
      });
    const downloaded: Blob[] = [];
    const createObjectURL = vi.fn((blob: Blob) => {
      downloaded.push(blob);
      return "blob:csv";
    });
    vi.stubGlobal("URL", { createObjectURL, revokeObjectURL: vi.fn() });
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

    const { result } = renderHook(
      () =>
        useCsvExporter({
          defaultFilename: "products",
          columns,
          fetcher,
        }),
      { wrapper },
    );

    await act(() => result.current.exportCsv());

    expect(fetcher).toHaveBeenNthCalledWith(1, {
      first: 1000,
      after: null,
      signal: expect.any(AbortSignal),
    });
    expect(fetcher).toHaveBeenNthCalledWith(2, {
      first: 1000,
      after: "cursor-1",
      signal: expect.any(AbortSignal),
    });
    expect(result.current.phase).toBe("success");
    expect(result.current.progress).toEqual({ completed: 2, total: 2 });

    expect(await downloaded[0]!.text()).toBe(
      '\uFEFFName,Formula\r\nAlice,"\'=SUM(A1:A2)"\r\nBob,safe',
    );
  });

  it("cancels an in-flight fetch", async () => {
    const fetcher = vi.fn(
      ({ signal }: { signal: AbortSignal }) =>
        new Promise<never>((_resolve, reject) => {
          signal.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")));
        }),
    );
    const { result } = renderHook(
      () =>
        useCsvExporter({
          defaultFilename: "products.csv",
          columns: [{ header: "Name", value: () => "Alice" }],
          fetcher,
        }),
      { wrapper },
    );

    let exportPromise!: Promise<void>;
    act(() => {
      exportPromise = result.current.exportCsv();
    });
    act(() => result.current.cancel());
    await act(async () => {
      await exportPromise;
    });

    await waitFor(() => {
      expect(result.current.phase).toBe("cancelled");
    });
  });
});
