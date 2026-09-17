import { useCallback, useMemo, useRef, useState } from "react";
import { unparse } from "papaparse";
import { getCellValue } from "@/components/data-table/cell-renderers";
import type { Column } from "@/components/data-table/types";
import { useToast } from "@/hooks/use-toast";
import { useCsvExporterT } from "./i18n";
import type {
  CsvCursorConnection,
  CsvExportCell,
  CsvExportColumn,
  CsvExportColumnSource,
  CsvExporter,
  UseCsvExporterOptions,
} from "./types";

const DEFAULT_PAGE_SIZE = 1000;

function toCsvCell(value: unknown): CsvExportCell {
  if (
    value == null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean" ||
    typeof value === "bigint"
  ) {
    return value;
  }
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? undefined : value.toISOString();
  if (Array.isArray(value))
    return value
      .map(toCsvCell)
      .filter((item) => item != null)
      .join(", ");
  return undefined;
}

function isCsvExportColumn<TRow extends Record<string, unknown>>(
  column: CsvExportColumn<TRow> | Column<TRow>,
): column is CsvExportColumn<TRow> {
  return "value" in column && typeof column.value === "function";
}

function resolveColumns<TRow extends Record<string, unknown>>(
  columns: CsvExportColumnSource<TRow>,
): CsvExportColumn<TRow>[] {
  if (columns.length === 0 || isCsvExportColumn(columns[0])) {
    return columns as CsvExportColumn<TRow>[];
  }

  return (columns as readonly Column<TRow>[]).flatMap((column) => {
    if (!column.label) return [];
    return {
      header: column.label,
      value: (row: TRow) => {
        return toCsvCell(getCellValue(row, column));
      },
    };
  });
}

function normalizeFilename(filename: string): string {
  const normalized = filename.trim().replace(/[\\/]/g, "_");
  if (!normalized) throw new Error("A CSV filename is required");
  return normalized.toLowerCase().endsWith(".csv") ? normalized : `${normalized}.csv`;
}

function downloadCsv(csv: string, filename: string) {
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

/**
 * Fetch every cursor page, serialize its rows as CSV, and expose progress for
 * a UI such as `DataTable.CSVExport`. The data client stays outside this hook:
 * `fetcher` only needs to return a Relay-style cursor connection.
 */
export function useCsvExporter<TRow extends Record<string, unknown>>({
  defaultFilename,
  columns: columnSource,
  fetcher,
  pageSize = DEFAULT_PAGE_SIZE,
}: UseCsvExporterOptions<TRow>): CsvExporter {
  const toast = useToast();
  const t = useCsvExporterT();
  const columns = useMemo(() => resolveColumns(columnSource), [columnSource]);
  const abortControllerRef = useRef<AbortController | null>(null);
  const [phase, setPhase] = useState<CsvExporter["phase"]>("idle");
  const [progress, setProgress] = useState<CsvExporter["progress"]>({ completed: 0, total: null });
  const [error, setError] = useState<Error | null>(null);

  const cancel = useCallback(() => {
    abortControllerRef.current?.abort();
  }, []);

  const exportCsv = useCallback(
    async (requestedFilename = defaultFilename) => {
      if (abortControllerRef.current) return false;

      const abortController = new AbortController();
      abortControllerRef.current = abortController;
      setPhase("fetching");
      setProgress({ completed: 0, total: null });
      setError(null);

      try {
        const filename = normalizeFilename(requestedFilename);
        const rows: TRow[] = [];
        const seenCursors = new Set<string>();
        let after: string | null = null;
        let total: number | null = null;

        for (;;) {
          const connection = await fetcher({
            first: pageSize,
            after,
            signal: abortController.signal,
          });
          if (abortController.signal.aborted) throw new DOMException("Aborted", "AbortError");
          if (!connection) break;

          rows.push(...connection.edges.map(({ node }) => node));
          total ??= connection.total ?? null;
          setProgress({ completed: rows.length, total });

          if (!connection.pageInfo.hasNextPage) break;
          const next = connection.pageInfo.endCursor;
          if (next == null || seenCursors.has(next)) {
            throw new Error("CSV export pagination did not advance");
          }
          seenCursors.add(next);
          after = next;
        }

        if (rows.length === 0) {
          setPhase("success");
          toast.info(t("noRows"));
          return true;
        }

        setPhase("serializing");
        const csv = unparse(
          {
            fields: columns.map((column) => column.header),
            data: rows.map((row) => columns.map((column) => column.value(row) ?? "")),
          },
          { newline: "\r\n", escapeFormulae: true },
        );

        if (abortController.signal.aborted) throw new DOMException("Aborted", "AbortError");
        setPhase("downloading");
        downloadCsv(csv, filename);
        setPhase("success");
        toast.success(t("exportComplete", { count: rows.length }));
        return true;
      } catch (caught) {
        if (
          abortController.signal.aborted ||
          (caught instanceof DOMException && caught.name === "AbortError")
        ) {
          setPhase("cancelled");
          toast.info(t("exportCancelled"));
        } else {
          const exportError = caught instanceof Error ? caught : new Error(String(caught));
          setError(exportError);
          setPhase("error");
          toast.error(t("exportFailed"));
        }
        return false;
      } finally {
        abortControllerRef.current = null;
      }
    },
    [columns, defaultFilename, fetcher, pageSize, t, toast],
  );

  return { defaultFilename, exportCsv, cancel, phase, progress, error };
}

export type { CsvCursorConnection };
