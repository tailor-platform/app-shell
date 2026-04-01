import type { StandardSchemaV1 } from "@standard-schema/spec";

/** Schema definition for a single column in the CSV. */
export type CsvColumn = {
  /** Internal key — becomes the object key in import results. */
  key: string;
  /** Display label shown in the mapping UI. */
  label: string;
  /** Optional description shown as a hint in the mapping UI. */
  description?: string;
  /** Whether this column must be mapped (default: false). */
  required?: boolean;
  /** Alternative CSV header names for automatic matching. */
  aliases?: string[];
  /**
   * A Standard Schema-compatible validator for this column.
   * Handles both coercion (transform) and validation in a single declaration.
   * The raw CSV string is passed to `schema["~standard"].validate(value)`.
   * On success, the output value is used for the parsed row.
   * On failure, each issue is rendered as a cell error in the Review table.
   *
   * @see https://github.com/standard-schema/standard-schema
   */
  schema?: StandardSchemaV1;
};

/** The full schema definition for a CSV import. */
export type CsvSchema = {
  columns: CsvColumn[];
};

/** A cell-level error returned by `onValidate`. */
export type CellError = {
  /** 0-based row index in the parsed data. */
  rowIndex: number;
  /** The schema column key this error applies to. */
  columnKey: string;
  /** "error" blocks import; "warning" allows import. */
  level: "error" | "warning";
  /** Human-readable message displayed in the cell tooltip. */
  message: string;
};

/** The row data passed to `onValidate`, after transforms have been applied. */
export type ParsedRow = {
  /** 0-based row index, stable across edits. */
  rowIndex: number;
  /** Column key → transformed value. Only mapped columns are included. */
  data: Record<string, unknown>;
};

/** A single cell-level issue found during validation. */
export type CsvCellIssue = {
  /** 0-based row index. */
  row: number;
  /** The schema column key. */
  columnKey: string;
  /** The cell value that caused the issue. */
  value: unknown;
  /** Human-readable message. */
  message: string;
  /** "error" blocks import; "warning" allows import but shows a warning. */
  severity: "error" | "warning";
};

/** A mapping from a CSV header to a schema column key. */
export type CsvColumnMapping = {
  /** The header name from the CSV file. */
  csvHeader: string;
  /** The schema column key to map to, or null to skip this column. */
  columnKey: string | null;
};

/** A single correction made by the user in the review step. */
export type CsvCorrection = {
  /** 0-based row index. */
  row: number;
  /** The schema column key. */
  columnKey: string;
  /** The value before correction. */
  oldValue: unknown;
  /** The value after correction. */
  newValue: unknown;
};

/** The event payload passed to the onImport callback. */
export type CsvImportEvent = {
  /** The original file selected by the user. */
  file: File;
  /** The confirmed column mappings. */
  mappings: CsvColumnMapping[];
  /** The corrections made by the user in the review step. */
  corrections: CsvCorrection[];
  /** Any remaining issues (warnings only — errors are resolved before import). */
  issues: CsvCellIssue[];
  /** Summary statistics. */
  summary: {
    totalRows: number;
    validRows: number;
    correctedRows: number;
    skippedRows: number;
    warningRows: number;
  };
};

/** The step in the CSV import flow. */
export type CsvImporterStep = "upload" | "mapping" | "review" | "complete";

/** Internal props for the CsvImporter component (managed by useCsvImporter). */
export type CsvImporterProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schema: CsvSchema;
  maxFileSize: number;
  onImport: (event: CsvImportEvent) => void | Promise<void>;
  onValidate?: (rows: ParsedRow[]) => Promise<CellError[]>;
};
