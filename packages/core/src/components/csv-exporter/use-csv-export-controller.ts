import { useCallback, useEffect, useRef, useState } from "react";
import { unparse } from "papaparse";
import { getCellValue } from "@/components/data-table/cell-renderers";
import type { Column } from "@/components/data-table/types";
import { useToast } from "@/hooks/use-toast";
import { useCsvExporterT } from "./i18n";
import type {
  CsvExportCell,
  CsvExportColumn,
  CsvExporterState,
  CsvExporterProps,
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
  columns: readonly CsvExportColumn<TRow>[] | readonly Column<TRow>[],
): CsvExportColumn<TRow>[] {
  if (columns.length === 0 || isCsvExportColumn(columns[0])) {
    return columns as CsvExportColumn<TRow>[];
  }

  return (columns as readonly Column<TRow>[]).flatMap((column) => {
    if (!column.label) return [];
    if (!column.id && !column.accessor) {
      throw new Error(`Column "${column.label}" requires an id or accessor for CSV export`);
    }
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

/** @internal Shared export lifecycle; table columns are supplied when export starts. */
export function useCsvExportController<TRow extends Record<string, unknown>>(
  {
    defaultFilename,
    fetcher,
    pageSize = DEFAULT_PAGE_SIZE,
  }: Omit<UseCsvExporterOptions<TRow>, "columns">,
  columnSource?: UseCsvExporterOptions<TRow>["columns"],
) {
  const toast = useToast();
  const t = useCsvExporterT();
  const [isOpen, setIsOpen] = useState(false);
  const open = useCallback(() => {
    setIsOpen(true);
  }, []);
  const abortControllerRef = useRef<AbortController | null>(null);
  useEffect(
    () => () => {
      abortControllerRef.current?.abort();
      abortControllerRef.current = null;
    },
    [],
  );
  const [phase, setPhase] = useState<CsvExporterState["phase"]>("idle");
  const [progress, setProgress] = useState<CsvExporterState["progress"]>({
    completed: 0,
    total: null,
  });
  const [error, setError] = useState<Error | null>(null);

  const cancel = useCallback(() => {
    abortControllerRef.current?.abort();
  }, []);

  const exportCsv = useCallback(
    async (
      requestedFilename = defaultFilename,
      columnOverride?: readonly CsvExportColumn<TRow>[] | readonly Column<TRow>[],
    ) => {
      if (abortControllerRef.current) return false;

      const abortController = new AbortController();
      abortControllerRef.current = abortController;
      setPhase("fetching");
      setProgress({ completed: 0, total: null });
      setError(null);

      try {
        const filename = normalizeFilename(requestedFilename);
        const source = columnOverride ?? columnSource;
        const columns = source ? resolveColumns(source) : [];
        if (columns.length === 0) {
          const exportError = new Error(t("noColumns"));
          setError(exportError);
          setPhase("error");
          toast.error(exportError.message);
          return false;
        }
        const rows: TRow[] = [];
        const seenCursors = new Set<string>();
        let after: string | null = null;
        let total: number | null = null;

        for (;;) {
          const page = await fetcher({
            first: pageSize,
            after,
            signal: abortController.signal,
          });
          if (abortController.signal.aborted) throw new DOMException("Aborted", "AbortError");
          if (!page) break;

          rows.push(...page.rows);
          total ??= page.total ?? null;
          setProgress({ completed: rows.length, total });

          if (!page.pageInfo.hasNextPage) break;
          const next = page.pageInfo.endCursor;
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
        if (abortControllerRef.current !== abortController) return false;
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
    [columnSource, defaultFilename, fetcher, pageSize, t, toast],
  );

  const exporter: CsvExporterState<TRow> = {
    defaultFilename,
    exportCsv,
    cancel,
    phase,
    progress,
    error,
  };
  const props: CsvExporterProps<TRow> = { open: isOpen, onOpenChange: setIsOpen, exporter };

  return { open, props };
}
