import Papa from "papaparse";
import Encoding from "encoding-japanese";

/** Detect encoding and decode a File to a UTF-8 string. */
async function decodeFile(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  const detected = Encoding.detect(bytes);

  if (detected && detected !== "ASCII" && detected !== "UTF8") {
    const unicodeArray = Encoding.convert(bytes, {
      to: "UNICODE",
      from: detected,
    });
    return Encoding.codeToString(unicodeArray);
  }

  return new TextDecoder("utf-8").decode(bytes);
}

export type ParsedCsv = {
  headers: string[];
  rows: string[][];
};

/** Parse a CSV file with automatic encoding detection. */
export async function parseCsvFile(file: File): Promise<ParsedCsv> {
  const text = await decodeFile(file);

  return new Promise<ParsedCsv>((resolve, reject) => {
    Papa.parse(text, {
      skipEmptyLines: true,
      complete: (result) => {
        const data = result.data as string[][];
        if (data.length === 0) {
          reject(new Error("CSV file is empty"));
          return;
        }
        const headers = data[0];
        const rows = data.slice(1);
        resolve({ headers, rows });
      },
      error: (error: Error) => {
        reject(new Error(`Failed to parse CSV: ${error.message}`));
      },
    });
  });
}

/** Auto-match CSV headers to schema columns using exact match or aliases. */
export function autoMatchHeaders(
  csvHeaders: string[],
  columns: readonly {
    key: string;
    label: string;
    aliases?: readonly string[];
  }[],
): { csvHeader: string; columnKey: string | null }[] {
  const usedKeys = new Set<string>();

  return csvHeaders.map((csvHeader) => {
    const normalized = csvHeader.trim().toLowerCase();

    for (const col of columns) {
      if (usedKeys.has(col.key)) continue;

      const candidates = [col.key, col.label, ...(col.aliases ?? [])];
      const match = candidates.some((c) => c.trim().toLowerCase() === normalized);

      if (match) {
        usedKeys.add(col.key);
        return { csvHeader, columnKey: col.key };
      }
    }

    return { csvHeader, columnKey: null };
  });
}
