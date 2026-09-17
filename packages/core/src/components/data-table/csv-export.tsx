import { useEffect, useId, useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/button";
import { Dialog } from "@/components/dialog";
import { Input } from "@/components/input";
import { Spinner } from "@/components/spinner";
import { useCsvExporterT } from "@/components/csv-exporter/i18n";
import type { CsvExporter } from "@/components/csv-exporter";

export interface DataTableCSVExportProps {
  exporter: CsvExporter;
}

/**
 * Standard CSV export button and progress dialog. Supply the stateful value
 * returned by `useCsvExporter` through `exporter`.
 */
export function DataTableCSVExport({ exporter }: DataTableCSVExportProps) {
  const t = useCsvExporterT();
  const filenameId = useId();
  const [open, setOpen] = useState(false);
  const [filename, setFilename] = useState(exporter.defaultFilename);
  const [filenameError, setFilenameError] = useState<string | null>(null);
  const isExporting =
    exporter.phase === "fetching" ||
    exporter.phase === "serializing" ||
    exporter.phase === "downloading";
  const total = exporter.progress.total;
  const progress =
    total != null && total > 0 ? Math.min(100, (exporter.progress.completed / total) * 100) : null;

  useEffect(() => {
    if (exporter.phase === "success") setOpen(false);
  }, [exporter.phase]);

  const onOpenChange = (nextOpen: boolean) => {
    if (nextOpen && !isExporting) {
      setFilename(exporter.defaultFilename);
      setFilenameError(null);
    }
    setOpen(nextOpen);
  };

  const startExport = () => {
    if (!filename.trim()) {
      setFilenameError(t("invalidFilename"));
      return;
    }
    setFilenameError(null);
    void exporter.exportCsv(filename);
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <div className="astw:w-fit">
        <Dialog.Trigger render={<Button variant="outline" size="xs" />}>
          <Download className="astw:size-3" />
          {t("csvExport")}
        </Dialog.Trigger>
      </div>
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
          <form
            className="astw:flex astw:flex-col astw:gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              startExport();
            }}
          >
            <label className="astw:text-sm astw:font-medium" htmlFor={filenameId}>
              {t("filename")}
            </label>
            <Input
              id={filenameId}
              value={filename}
              onChange={(event) => {
                setFilename(event.target.value);
                setFilenameError(null);
              }}
              aria-invalid={filenameError != null}
              aria-describedby={filenameError ? `${filenameId}-error` : undefined}
            />
            {filenameError && (
              <p
                id={`${filenameId}-error`}
                className="astw:text-sm astw:text-destructive"
                role="alert"
              >
                {filenameError}
              </p>
            )}
            {exporter.error && (
              <p className="astw:text-sm astw:text-destructive" role="alert">
                {exporter.error.message}
              </p>
            )}
          </form>
        )}

        <Dialog.Footer>
          {isExporting ? (
            <Button variant="outline" onClick={exporter.cancel}>
              {t("cancel")}
            </Button>
          ) : (
            <>
              <Dialog.Close render={<Button variant="outline" />}>{t("cancel")}</Dialog.Close>
              <Button onClick={startExport}>
                {exporter.phase === "error" ? t("retry") : t("download")}
              </Button>
            </>
          )}
        </Dialog.Footer>
      </Dialog.Content>
    </Dialog.Root>
  );
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
