import type { CsvImportEvent, CsvSchema, CsvColumnMapping, CsvCorrection } from "./types";
import { parseCsvFile } from "./csv-parser";

/**
 * Reconstruct parsed rows from the original file, applying mappings, transforms,
 * and user corrections.
 *
 * Use this when you want the fully-processed row data on the frontend side.
 * If you're sending file + mappings + corrections to a backend, you don't need this.
 */
export async function buildRows(
  event: CsvImportEvent,
  schema: CsvSchema,
): Promise<Record<string, unknown>[]> {
  const { headers, rows } = await parseCsvFile(event.file);

  const headerIndexMap = new Map<string, number>();
  for (let i = 0; i < headers.length; i++) {
    headerIndexMap.set(headers[i], i);
  }

  const columnMap = new Map<string, CsvSchema["columns"][number]>();
  for (const col of schema.columns) {
    columnMap.set(col.key, col);
  }

  const correctionMap = new Map<string, CsvCorrection>();
  for (const c of event.corrections) {
    correctionMap.set(`${c.row}:${c.columnKey}`, c);
  }

  const activeMappings = event.mappings.filter(
    (m): m is CsvColumnMapping & { columnKey: string } => m.columnKey !== null,
  );

  return rows.map((row, rowIndex) => {
    const record: Record<string, unknown> = {};

    for (const mapping of activeMappings) {
      const colIndex = headerIndexMap.get(mapping.csvHeader);
      if (colIndex === undefined) continue;

      const correctionKey = `${rowIndex}:${mapping.columnKey}`;
      const correction = correctionMap.get(correctionKey);

      let value: unknown = correction ? correction.newValue : row[colIndex];

      const column = columnMap.get(mapping.columnKey);
      if (column?.transform && typeof value === "string") {
        try {
          value = column.transform(value);
        } catch {
          // Keep raw value if transform fails
        }
      }

      record[mapping.columnKey] = value;
    }

    return record;
  });
}
