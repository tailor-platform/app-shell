/** A validation rule for a single CSV column. */
export type CsvColumnRule = {
  /** Return an error message string if invalid, or undefined if valid. */
  validate: (value: unknown, row: Record<string, unknown>) => string | undefined;
};

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
  /** Transform the raw CSV string value into a typed value. */
  transform?: (raw: string) => unknown;
  /** Validation rules applied after transform. */
  rules?: CsvColumnRule[];
};

/** The full schema definition for a CSV import. */
export type CsvSchema = {
  columns: CsvColumn[];
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

/** Customizable UI text labels. */
export type CsvImporterLabels = {
  uploadTitle: string;
  uploadDescription: string;
  uploadButton: string;
  mappingTitle: string;
  mappingDescription: string;
  mappingExpectedField: string;
  mappingCsvColumn: string;
  mappingPreview: string;
  reviewTitle: string;
  reviewDescription: string;
  completeTitle: string;
  completeDescription: string;
  nextButton: string;
  backButton: string;
  importButton: string;
  closeButton: string;
  fileSizeError: string;
  parseError: string;
};

/** The step in the CSV import flow. */
export type CsvImporterStep = "upload" | "mapping" | "review" | "complete";

/** Internal props for the CsvImporter component (managed by useCsvImporter). */
export type CsvImporterProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schema: CsvSchema;
  labels: CsvImporterLabels;
  maxFileSize: number;
  onImport: (event: CsvImportEvent) => void | Promise<void>;
};
