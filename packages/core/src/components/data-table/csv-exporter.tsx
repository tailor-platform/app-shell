import { Download } from "lucide-react";
import { Button } from "@/components/button";
import { CsvExporterView } from "@/components/csv-exporter/csv-exporter";
import { useCsvExporterT } from "@/components/csv-exporter/i18n";
import type { DataTableCSVExporterProps } from "./use-data-table-csv-exporter";
import { useDataTableContext } from "./data-table-context";

/**
 * CSV exporter integrated with the enclosing DataTable.
 *
 * Accepts only props from `useDataTableCsvExporter`. The table's current visible
 * columns and order become the CSV schema when the download starts.
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
export function DataTableCSVExporter<TRow extends Record<string, unknown>>(
  props: DataTableCSVExporterProps<TRow>,
) {
  const { visibleColumns } = useDataTableContext<TRow>();
  const t = useCsvExporterT();

  return (
    <>
      <div className="astw:w-fit">
        <Button variant="outline" size="xs" onClick={() => props.onOpenChange(true)}>
          <Download className="astw:size-3" />
          {t("csvExporter")}
        </Button>
      </div>
      <CsvExporterView
        {...props}
        exporter={{
          ...props.exporter,
          exportCsv: (filename = props.exporter.defaultFilename) =>
            props.exporter.exportCsv(filename, visibleColumns),
        }}
      />
    </>
  );
}

export type { DataTableCSVExporterProps } from "./use-data-table-csv-exporter";
