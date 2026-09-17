import { CsvExporterView } from "@/components/csv-exporter/csv-exporter";
import type { CsvExporterProps } from "@/components/csv-exporter";
import { useDataTableContext } from "./data-table-context";

/**
 * CSV exporter integrated with the enclosing DataTable.
 *
 * Its UI and lifecycle are identical to `CsvExporter`; the only addition is
 * that the table's current visible columns and order become the CSV schema when
 * `useCsvExporter` was configured with DataTable columns.
 *
 * @example
 * ```tsx
 * const { props } = useCsvExporter({ defaultFilename: "products.csv", columns, fetcher });
 *
 * <DataTable.Root value={table}>
 *   <DataTable.CSVExporter {...props} />
 * </DataTable.Root>;
 * ```
 */
export function DataTableCSVExporter<TRow extends Record<string, unknown>>(
  props: CsvExporterProps<TRow>,
) {
  const { visibleColumns } = useDataTableContext<TRow>();

  return <CsvExporterView {...props} columnOverride={visibleColumns} />;
}

export type DataTableCSVExporterProps<TRow extends Record<string, unknown>> =
  CsvExporterProps<TRow>;
