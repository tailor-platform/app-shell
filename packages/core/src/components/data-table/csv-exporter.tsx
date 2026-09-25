import { Download } from "lucide-react";
import { Button } from "@/components/button";
import { CsvExporterView } from "@/components/csv-exporter/csv-exporter";
import { useCsvExporterT } from "@/components/csv-exporter/i18n";
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
  const t = useCsvExporterT();

  return (
    <>
      <div className="astw:w-fit">
        <Button variant="outline" size="xs" onClick={() => props.onOpenChange(true)}>
          <Download className="astw:size-3" />
          {t("csvExporter")}
        </Button>
      </div>
      <CsvExporterView {...props} columnOverride={visibleColumns} />
    </>
  );
}

export type DataTableCSVExporterProps<TRow extends Record<string, unknown>> =
  CsvExporterProps<TRow>;
