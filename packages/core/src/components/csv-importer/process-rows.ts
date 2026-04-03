import type { CsvCellIssue, CsvColumnMapping, CsvCorrection, CsvSchema, ParsedRow } from "./types";

/** Single-pass: validate all cells and build parsed rows for onValidate. */
export function processRows(
  rawRows: string[][],
  csvHeaders: string[],
  mappings: CsvColumnMapping[],
  schema: CsvSchema,
  corrections: CsvCorrection[],
): { issues: CsvCellIssue[]; parsedRows: ParsedRow[] } {
  const issues: CsvCellIssue[] = [];
  const headerIndexMap = new Map<string, number>();
  for (let i = 0; i < csvHeaders.length; i++) {
    headerIndexMap.set(csvHeaders[i], i);
  }

  const activeMappings = mappings.filter((m) => m.columnKey !== null);

  const parsedRows = rawRows.map((row, rowIdx) => {
    const data: Record<string, unknown> = {};

    for (const mapping of activeMappings) {
      const colIdx = headerIndexMap.get(mapping.csvHeader);
      const correction = corrections.find(
        (c) => c.row === rowIdx && c.columnKey === mapping.columnKey,
      );
      const rawValue: string =
        correction !== undefined
          ? String(correction.newValue)
          : colIdx !== undefined
            ? row[colIdx]
            : "";

      const column = schema.columns.find((c) => c.key === mapping.columnKey);
      if (column?.schema) {
        const result = column.schema["~standard"].validate(rawValue);
        if (result instanceof Promise) {
          data[mapping.columnKey!] = rawValue;
          continue;
        }
        if (result.issues) {
          issues.push({
            rowIndex: rowIdx,
            columnKey: mapping.columnKey!,
            message: result.issues[0].message,
            level: "error",
          });
          data[mapping.columnKey!] = rawValue;
        } else {
          data[mapping.columnKey!] = result.value;
        }
      } else {
        data[mapping.columnKey!] = rawValue;
      }
    }

    return { rowIndex: rowIdx, data };
  });

  return { issues, parsedRows };
}
