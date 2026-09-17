import { useId, useState } from "react";
import { Button } from "@/components/button";
import { Dialog } from "@/components/dialog";
import { Field } from "@/components/field";
import { Form } from "@/components/form";
import { Spinner } from "@/components/spinner";
import { useCsvExporterT } from "@/components/csv-exporter/i18n";
import type { Column } from "@/components/data-table/types";
import type { CsvExporterProps } from "./types";

type CsvExporterViewProps<TRow extends Record<string, unknown>> = CsvExporterProps<TRow> & {
  columnOverride?: readonly Column<TRow>[];
};

/** @internal Shared CSV export UI. DataTable supplies its visible columns here. */
export function CsvExporterView<TRow extends Record<string, unknown>>({
  open,
  onOpenChange,
  exporter,
  columnOverride,
}: CsvExporterViewProps<TRow>) {
  const t = useCsvExporterT();
  const formId = useId();
  const [filename, setFilename] = useState(exporter.defaultFilename);
  const isExporting =
    exporter.phase === "fetching" ||
    exporter.phase === "serializing" ||
    exporter.phase === "downloading";
  const total = exporter.progress.total;
  const progress =
    total != null && total > 0 ? Math.min(100, (exporter.progress.completed / total) * 100) : null;

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) setFilename(exporter.defaultFilename);
    onOpenChange(nextOpen);
  };

  const startExport = async ({ filename: exportFilename }: { filename: string }) => {
    if (await exporter.exportCsv(exportFilename, columnOverride)) onOpenChange(false);
  };

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Content>
        <Dialog.Header>
          <Dialog.Title>{isExporting ? t("exporting") : t("dialogTitle")}</Dialog.Title>
        </Dialog.Header>

        {isExporting ? (
          <div className="astw:flex astw:flex-col astw:gap-3" aria-live="polite" aria-busy="true">
            {exporter.phase === "fetching" ? (
              <>
                <p className="astw:text-sm">{t("fetchingRows", exporter.progress)}</p>
                <CsvExportProgress label={t("fetchingRows", exporter.progress)} value={progress} />
              </>
            ) : (
              <div className="astw:flex astw:items-center astw:gap-2 astw:text-sm">
                <Spinner size="sm" aria-label={t("creatingFile")} />
                <p>{t("creatingFile")}</p>
              </div>
            )}
          </div>
        ) : (
          <Form<{ filename: string }>
            id={formId}
            className="astw:flex astw:flex-col astw:gap-2"
            noValidate
            onFormSubmit={startExport}
          >
            <Field.Root
              name="filename"
              validate={(value) =>
                typeof value === "string" && value.trim() ? undefined : t("invalidFilename")
              }
            >
              <Field.Label>{t("filename")}</Field.Label>
              <Field.Control
                required
                value={filename}
                onChange={(event) => setFilename(event.target.value)}
              />
              <Field.Error />
            </Field.Root>
            {exporter.error && (
              <p className="astw:text-sm astw:text-destructive" role="alert">
                {exporter.error.message}
              </p>
            )}
          </Form>
        )}

        <Dialog.Footer>
          {isExporting ? (
            <Button variant="outline" onClick={exporter.cancel}>
              {t("cancel")}
            </Button>
          ) : (
            <>
              <Dialog.Close render={<Button variant="outline" />}>{t("cancel")}</Dialog.Close>
              <Button type="submit" form={formId}>
                {exporter.phase === "error" ? t("retry") : t("download")}
              </Button>
            </>
          )}
        </Dialog.Footer>
      </Dialog.Content>
    </Dialog.Root>
  );
}

/**
 * Standard CSV export button, filename dialog, and progress UI.
 *
 * @example
 * ```tsx
 * const { open, props } = useCsvExporter({
 *   defaultFilename: "products.csv",
 *   columns,
 *   fetcher,
 * });
 *
 * <Button onClick={open}>Export CSV</Button>
 * <CsvExporter {...props} />;
 * ```
 *
 * Use `DataTable.CSVExporter` instead when the export should reconcile the
 * current DataTable column layout.
 */
export function CsvExporter<TRow extends Record<string, unknown>>(props: CsvExporterProps<TRow>) {
  return <CsvExporterView {...props} />;
}

function CsvExportProgress({ label, value }: { label: string; value: number | null }) {
  if (value == null) {
    return (
      <div
        aria-hidden
        className="astw:bg-muted astw:flex astw:h-2 astw:w-full astw:overflow-hidden astw:rounded-full"
      >
        <div className="astw:h-full astw:w-1/3 astw:animate-pulse astw:rounded-full astw:bg-primary astw:motion-reduce:animate-none" />
      </div>
    );
  }

  return (
    <progress
      aria-label={label}
      aria-valuetext={label}
      className="astw:h-2 astw:w-full astw:appearance-none astw:overflow-hidden astw:rounded-full astw:[&::-moz-progress-bar]:rounded-full astw:[&::-moz-progress-bar]:bg-primary astw:[&::-webkit-progress-bar]:rounded-full astw:[&::-webkit-progress-bar]:bg-muted astw:[&::-webkit-progress-value]:rounded-full astw:[&::-webkit-progress-value]:bg-primary"
      max={100}
      value={value}
    />
  );
}
