import type { Column } from "@/components/data-table/types";

/** A scalar value supported by a CSV cell. Nullish values become empty cells. */
export type CsvExportCell = string | number | boolean | bigint | null | undefined;

/**
 * A CSV column independent of any rendered table.
 *
 * Use this form when the export is a report with its own headers or value
 * formatting, rather than a copy of a DataTable's visible columns.
 *
 * @example
 * ```tsx
 * const columns: CsvExportColumn<Product>[] = [
 *   { header: "Product code", value: (product) => product.code },
 *   { header: "Created", value: (product) => product.createdAt.toISOString() },
 * ];
 * ```
 */
export interface CsvExportColumn<TRow> {
  header: string;
  value: (row: TRow) => CsvExportCell;
}

/** A Relay-style cursor page returned by a CSV export data source. */
export interface CsvCursorConnection<TRow> {
  edges: readonly { node: TRow }[];
  pageInfo: {
    hasNextPage: boolean;
    endCursor: string | null;
  };
  /** Enables a determinate progress bar when the backend provides a count. */
  total?: number | null;
}

/**
 * Fetches one page for a client-side CSV export. Throw client or API errors;
 * `useCsvExporter` reports them and stops before downloading a partial file.
 *
 * Honor `signal` when the data client supports cancellation.
 */
export type CsvCursorFetcher<TRow> = (pagination: {
  first: number;
  after: string | null;
  signal: AbortSignal;
}) => Promise<CsvCursorConnection<TRow> | null | undefined>;

type CsvExportableDataTableColumn<TRow extends Record<string, unknown>> =
  | (Column<TRow> & { label?: undefined })
  | (Column<TRow> & {
      label: string;
      id: string;
    })
  | (Column<TRow> & {
      label: string;
      accessor: (row: TRow) => unknown;
    });

export type CsvExportColumnSource<TRow extends Record<string, unknown>> =
  | readonly CsvExportColumn<TRow>[]
  | readonly CsvExportableDataTableColumn<TRow>[];

type CsvExportColumnOverride<TRow extends Record<string, unknown>> =
  | readonly CsvExportColumn<TRow>[]
  | readonly Column<TRow>[];

/** Current stage of a CSV export. */
export type CsvExportPhase =
  | "idle"
  | "fetching"
  | "serializing"
  | "downloading"
  | "success"
  | "error"
  | "cancelled";

/**
 * Configuration for `useCsvExporter`.
 *
 * Pass DataTable columns to make `DataTable.CSVExporter` honor the user's
 * visible-column layout, or pass `CsvExportColumn[]` for a fixed report schema.
 */
export interface UseCsvExporterOptions<TRow extends Record<string, unknown>> {
  /** Initial filename displayed in the export dialog. The .csv suffix is added when omitted. */
  defaultFilename: string;
  /** Explicit CSV columns, or DataTable columns to derive them from. */
  columns: CsvExportColumnSource<TRow>;
  /** Fetches one cursor page. The hook fetches every page. */
  fetcher: CsvCursorFetcher<TRow>;
  /** Rows requested per cursor page. Defaults to 1000. */
  pageSize?: number;
}

/**
 * State and actions returned inside `useCsvExporter`'s `props` value.
 *
 * `CsvExporter` and `DataTable.CSVExporter` receive this value through their
 * `exporter` prop. Call `exportCsv()` from a
 * custom button when no DataTable is involved.
 *
 * @example
 * ```tsx
 * const { open, props } = useCsvExporter({ defaultFilename: "products.csv", columns, fetcher });
 *
 * <Button onClick={open}>Export CSV</Button>
 * <CsvExporter {...props} />;
 * ```
 */
export interface CsvExporterState<TRow extends Record<string, unknown> = Record<string, unknown>> {
  defaultFilename: string;
  /** Resolves true when the export completed (including an empty result). */
  exportCsv: (filename?: string, columns?: CsvExportColumnOverride<TRow>) => Promise<boolean>;
  cancel: () => void;
  phase: CsvExportPhase;
  progress: {
    completed: number;
    total: number | null;
  };
  error: Error | null;
}

/**
 * Props for `CsvExporter`, managed by `useCsvExporter`.
 *
 * Spread the hook's `props` return value directly onto the component.
 * `DataTable.CSVExporter` accepts the same props and additionally reconciles
 * DataTable's visible-column layout.
 */
export interface CsvExporterProps<TRow extends Record<string, unknown> = Record<string, unknown>> {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exporter: CsvExporterState<TRow>;
}
