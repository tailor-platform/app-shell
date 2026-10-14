import { useCsvExportController } from "./use-csv-export-controller";
import type { UseCsvExporterOptions } from "./types";

/**
 * Fetch cursor-paginated rows and export them using the supplied column schema.
 * Returns controlled props for the standalone `CsvExporter` and an open action.
 *
 * @example
 * ```tsx
 * const { open, props } = useCsvExporter({
 *   defaultFilename: "products.csv",
 *   columns,
 *   fetcher: ({ first, after, signal }) => client.listProducts({ first, after, signal }),
 * });
 *
 * <Button onClick={open}>Export CSV</Button>
 * <CsvExporter {...props} />;
 * ```
 *
 * DataTable column definitions can be used as a configured schema, but do not
 * follow a table's visibility or order. Use `useDataTableCsvExporter` with
 * `DataTable.CSVExporter` for that integration.
 */
export function useCsvExporter<TRow extends Record<string, unknown>>({
  columns,
  ...options
}: UseCsvExporterOptions<TRow>) {
  return useCsvExportController(options, columns);
}

export type { CsvExportPage } from "./types";
