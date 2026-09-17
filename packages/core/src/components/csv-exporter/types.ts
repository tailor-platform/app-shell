import type { Column } from "@/components/data-table/types";

export type CsvExportCell = string | number | boolean | bigint | null | undefined;

/** A CSV column independent of any rendered table. */
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

export type CsvExportPhase =
  | "idle"
  | "fetching"
  | "serializing"
  | "downloading"
  | "success"
  | "error"
  | "cancelled";

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

export interface CsvExporter<TRow extends Record<string, unknown> = Record<string, unknown>> {
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
