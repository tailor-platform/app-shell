import { useCsvExportController } from "@/components/csv-exporter/use-csv-export-controller";
import type {
  CsvExporterProps,
  CsvExporterState,
  UseCsvExporterOptions,
} from "@/components/csv-exporter/types";
import type { Column } from "./types";

const dataTableCsvExporterBrand = Symbol("DataTableCsvExporter");

/** Options for a table export; its columns come from the enclosing DataTable. */
export type UseDataTableCsvExporterOptions<TRow extends Record<string, unknown>> = Omit<
  UseCsvExporterOptions<TRow>,
  "columns"
> & { columns?: never };

/** Controlled props produced by `useDataTableCsvExporter` for `DataTable.CSVExporter`. */
export type DataTableCSVExporterProps<TRow extends Record<string, unknown>> = Omit<
  CsvExporterProps<TRow>,
  "exporter"
> & {
  exporter: Omit<CsvExporterState<TRow>, "exportCsv"> & {
    readonly [dataTableCsvExporterBrand]: true;
    exportCsv: (filename: string, columns: readonly Column<TRow>[]) => Promise<boolean>;
  };
};

/**
 * Prepare a DataTable CSV export without configuring columns or reading context.
 * `DataTable.CSVExporter` supplies its current visible columns when export starts.
 * This hook can be called outside `DataTable.Root`.
 *
 * @example
 * ```tsx
 * const { props } = useDataTableCsvExporter({ defaultFilename: "products.csv", fetcher });
 *
 * <DataTable.Root value={table}>
 *   <DataTable.CSVExporter {...props} />
 * </DataTable.Root>;
 * ```
 */
export function useDataTableCsvExporter<TRow extends Record<string, unknown>>(
  options: UseDataTableCsvExporterOptions<TRow>,
) {
  const { open, props } = useCsvExportController(options);
  const tableProps: DataTableCSVExporterProps<TRow> = {
    ...props,
    exporter: { ...props.exporter, [dataTableCsvExporterBrand]: true },
  };

  return { open, props: tableProps };
}
