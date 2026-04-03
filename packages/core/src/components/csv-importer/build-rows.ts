import type {
  CsvSchema,
  CsvColumnMapping,
  CsvCorrection,
  CsvCellIssue,
  CsvImportEvent,
  InferCsvRow,
} from "./types";
import { parseCsvFile } from "./csv-parser";

/**
 * Build the summary statistics for a CSV import event.
 */
export function buildSummary(
  totalRows: number,
  issues: CsvCellIssue[],
  corrections: CsvCorrection[],
): CsvImportEvent["summary"] {
  const warnings = issues.filter((i) => i.level === "warning");
  const correctedRows = new Set(corrections.map((c) => c.row)).size;

  return {
    totalRows,
    validRows: totalRows - warnings.length,
    correctedRows,
    warningRows: warnings.length,
    // Reserved for a future "skip row" feature — currently no rows are ever skipped.
    skippedRows: 0,
  };
}

/**
 * Reconstruct parsed rows from the original file, applying mappings, schema coercion,
 * and user corrections.
 *
 * This is an internal function — consumers use `event.buildRows()` instead.
 */
export async function buildRows<T extends CsvSchema>(
  file: File,
  schema: T,
  mappings: CsvColumnMapping[],
  corrections: CsvCorrection[],
): Promise<InferCsvRow<T>[]> {
  const { headers, rows } = await parseCsvFile(file);

  const headerIndexMap = new Map<string, number>();
  for (let i = 0; i < headers.length; i++) {
    headerIndexMap.set(headers[i], i);
  }

  const columnMap = new Map<string, CsvSchema["columns"][number]>();
  for (const col of schema.columns) {
    columnMap.set(col.key, col);
  }

  const correctionMap = new Map<string, CsvCorrection>();
  for (const c of corrections) {
    correctionMap.set(`${c.row}:${c.columnKey}`, c);
  }

  const activeMappings = mappings.filter(
    (m): m is CsvColumnMapping & { columnKey: string } => m.columnKey !== null,
  );

  return Promise.all(
    rows.map(async (row, rowIndex) => {
      const record: Record<string, unknown> = {};

      for (const mapping of activeMappings) {
        const colIndex = headerIndexMap.get(mapping.csvHeader);
        if (colIndex === undefined) continue;

        const correctionKey = `${rowIndex}:${mapping.columnKey}`;
        const correction = correctionMap.get(correctionKey);

        const rawValue: unknown = correction ? correction.newValue : row[colIndex];

        const column = columnMap.get(mapping.columnKey);
        if (column?.schema) {
          const rawResult = column.schema["~standard"].validate(rawValue);
          const result = rawResult instanceof Promise ? await rawResult : rawResult;
          if (!result.issues) {
            record[mapping.columnKey] = result.value;
          } else {
            record[mapping.columnKey] = rawValue;
          }
        } else {
          record[mapping.columnKey] = rawValue;
        }
      }

      return record as InferCsvRow<T>;
    }),
  );
}
