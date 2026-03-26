import * as React from "react";
import { useCallback, useRef, useState } from "react";
import { Dialog as BaseDialog } from "@base-ui/react/dialog";
import {
  UploadIcon,
  FileIcon,
  AlertTriangleIcon,
  CheckCircle2Icon,
  XIcon,
  ArrowRightIcon,
  ArrowLeftIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import type {
  CsvImporterProps,
  CsvImporterStep,
  CsvColumnMapping,
  CsvCellIssue,
  CsvCorrection,
  CsvImportEvent,
  CsvSchema,
  CsvImporterLabels,
} from "./types";
import { parseCsvFile, autoMatchHeaders } from "./csv-parser";

// ─── Upload Step ─────────────────────────────────────────

function UploadStep({
  labels,
  maxFileSize,
  onFileSelected,
  error,
}: {
  labels: CsvImporterLabels;
  maxFileSize: number;
  onFileSelected: (file: File) => void;
  error: string | null;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFile = useCallback(
    (file: File) => {
      onFileSelected(file);
    },
    [onFileSelected],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  const maxSizeMB = (maxFileSize / (1024 * 1024)).toFixed(0);

  return (
    <div data-slot="csv-importer-upload" className="astw:flex astw:flex-col astw:gap-4">
      <div className="astw:text-center">
        <h3 className="astw:text-lg astw:font-semibold">{labels.uploadTitle}</h3>
        <p className="astw:text-muted-foreground astw:text-sm">{labels.uploadDescription}</p>
      </div>
      <button
        type="button"
        className={cn(
          "astw:flex astw:w-full astw:flex-col astw:items-center astw:justify-center astw:gap-4 astw:rounded-lg astw:border-2 astw:border-dashed astw:bg-transparent astw:p-10 astw:transition-colors astw:cursor-pointer",
          isDragging
            ? "astw:border-primary astw:bg-primary/5"
            : "astw:border-muted-foreground/25 astw:hover:border-primary/50",
        )}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => inputRef.current?.click()}
      >
        <UploadIcon className="astw:text-muted-foreground astw:size-10" />
        <div className="astw:text-center">
          <p className="astw:text-sm astw:font-medium">{labels.uploadButton}</p>
          <p className="astw:text-muted-foreground astw:text-xs">
            CSV (max {maxSizeMB}MB)
          </p>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          className="astw:hidden"
          onChange={handleInputChange}
        />
      </button>
      {error && (
        <div className="astw:flex astw:items-center astw:gap-2 astw:rounded-md astw:bg-destructive/10 astw:px-3 astw:py-2 astw:text-sm astw:text-destructive">
          <AlertTriangleIcon className="astw:size-4 astw:shrink-0" />
          {error}
        </div>
      )}
    </div>
  );
}

// ─── Mapping Step ────────────────────────────────────────

function MappingStep({
  labels,
  csvHeaders,
  schema,
  mappings,
  onMappingChange,
}: {
  labels: CsvImporterLabels;
  csvHeaders: string[];
  schema: CsvSchema;
  mappings: CsvColumnMapping[];
  onMappingChange: (csvHeader: string, columnKey: string | null) => void;
}) {
  const unmappedRequiredColumns = schema.columns.filter(
    (col) =>
      col.required &&
      !mappings.some((m) => m.columnKey === col.key),
  );

  return (
    <div data-slot="csv-importer-mapping" className="astw:flex astw:flex-col astw:gap-4">
      <div className="astw:text-center">
        <h3 className="astw:text-lg astw:font-semibold">{labels.mappingTitle}</h3>
        <p className="astw:text-muted-foreground astw:text-sm">{labels.mappingDescription}</p>
      </div>
      <div className="astw:flex astw:flex-col astw:gap-2 astw:max-h-[400px] astw:overflow-y-auto">
        {csvHeaders.map((header) => {
          const mapping = mappings.find((m) => m.csvHeader === header);
          const currentKey = mapping?.columnKey ?? null;

          return (
            <div
              key={header}
              className="astw:flex astw:items-center astw:gap-3 astw:rounded-md astw:border astw:px-3 astw:py-2"
            >
              <div className="astw:flex astw:items-center astw:gap-2 astw:min-w-0 astw:flex-1">
                <FileIcon className="astw:text-muted-foreground astw:size-4 astw:shrink-0" />
                <span className="astw:text-sm astw:font-medium astw:truncate">{header}</span>
              </div>
              <ArrowRightIcon className="astw:text-muted-foreground astw:size-4 astw:shrink-0" />
              <select
                className="astw:border-input astw:bg-background astw:text-foreground astw:flex astw:h-9 astw:flex-1 astw:rounded-md astw:border astw:px-3 astw:py-1 astw:text-sm"
                value={currentKey ?? ""}
                onChange={(e) => {
                  const value = e.target.value;
                  onMappingChange(header, value === "" ? null : value);
                }}
              >
                <option value="">{labels.mappingSkip}</option>
                {schema.columns.map((col) => {
                  const isUsedByOther = mappings.some(
                    (m) => m.columnKey === col.key && m.csvHeader !== header,
                  );
                  return (
                    <option key={col.key} value={col.key} disabled={isUsedByOther}>
                      {col.label}{col.required ? " *" : ""}
                    </option>
                  );
                })}
              </select>
            </div>
          );
        })}
      </div>
      {unmappedRequiredColumns.length > 0 && (
        <div className="astw:flex astw:items-start astw:gap-2 astw:rounded-md astw:bg-destructive/10 astw:px-3 astw:py-2 astw:text-sm astw:text-destructive">
          <AlertTriangleIcon className="astw:size-4 astw:shrink-0 astw:mt-0.5" />
          <div>
            {labels.requiredColumnError}:{" "}
            {unmappedRequiredColumns.map((c) => c.label).join(", ")}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Review Step ─────────────────────────────────────────

function ReviewStep({
  labels,
  schema,
  csvHeaders,
  rawRows,
  mappings,
  issues,
  corrections,
  onCellEdit,
}: {
  labels: CsvImporterLabels;
  schema: CsvSchema;
  csvHeaders: string[];
  rawRows: string[][];
  mappings: CsvColumnMapping[];
  issues: CsvCellIssue[];
  corrections: CsvCorrection[];
  onCellEdit: (row: number, columnKey: string, value: string) => void;
}) {
  const activeMappings = mappings.filter((m) => m.columnKey !== null);
  const headerIndexMap = new Map<string, number>();
  for (let i = 0; i < csvHeaders.length; i++) {
    headerIndexMap.set(csvHeaders[i], i);
  }

  const errorCount = issues.filter((i) => i.severity === "error").length;
  const warningCount = issues.filter((i) => i.severity === "warning").length;

  const getCorrectedValue = (rowIdx: number, columnKey: string): string | undefined => {
    const correction = corrections.find(
      (c) => c.row === rowIdx && c.columnKey === columnKey,
    );
    return correction ? String(correction.newValue) : undefined;
  };

  const getIssue = (rowIdx: number, columnKey: string): CsvCellIssue | undefined => {
    return issues.find((i) => i.row === rowIdx && i.columnKey === columnKey);
  };

  return (
    <div data-slot="csv-importer-review" className="astw:flex astw:flex-col astw:gap-4">
      <div className="astw:text-center">
        <h3 className="astw:text-lg astw:font-semibold">{labels.reviewTitle}</h3>
        <p className="astw:text-muted-foreground astw:text-sm">{labels.reviewDescription}</p>
      </div>

      <div className="astw:flex astw:gap-4 astw:text-sm">
        <span>Total: {rawRows.length} rows</span>
        {errorCount > 0 && (
          <span className="astw:text-destructive">Errors: {errorCount}</span>
        )}
        {warningCount > 0 && (
          <span className="astw:text-yellow-600">Warnings: {warningCount}</span>
        )}
      </div>

      <div className="astw:overflow-auto astw:max-h-[400px] astw:rounded-md astw:border">
        <table className="astw:w-full astw:text-sm">
          <thead className="astw:bg-muted astw:sticky astw:top-0">
            <tr>
              <th className="astw:px-3 astw:py-2 astw:text-left astw:font-medium astw:text-muted-foreground">#</th>
              {activeMappings.map((m) => {
                const col = schema.columns.find((c) => c.key === m.columnKey);
                return (
                  <th
                    key={m.csvHeader}
                    className="astw:px-3 astw:py-2 astw:text-left astw:font-medium astw:text-muted-foreground"
                  >
                    {col?.label ?? m.columnKey}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {rawRows.map((row, rowIdx) => (
              <tr key={rowIdx} className="astw:border-t">
                <td className="astw:px-3 astw:py-1 astw:text-muted-foreground">{rowIdx + 1}</td>
                {activeMappings.map((m) => {
                  const colIdx = headerIndexMap.get(m.csvHeader);
                  const rawValue = colIdx !== undefined ? row[colIdx] : "";
                  const correctedValue = getCorrectedValue(rowIdx, m.columnKey!);
                  const displayValue = correctedValue ?? rawValue;
                  const issue = getIssue(rowIdx, m.columnKey!);

                  return (
                    <td
                      key={m.csvHeader}
                      className={cn(
                        "astw:px-1 astw:py-1",
                        issue?.severity === "error" && "astw:bg-destructive/10",
                        issue?.severity === "warning" && "astw:bg-yellow-50",
                      )}
                    >
                      <div className="astw:flex astw:flex-col astw:gap-0.5">
                        <input
                          type="text"
                          className={cn(
                            "astw:w-full astw:rounded astw:border astw:px-2 astw:py-1 astw:text-sm astw:bg-transparent",
                            issue?.severity === "error" && "astw:border-destructive",
                            issue?.severity === "warning" && "astw:border-yellow-500",
                            !issue && "astw:border-transparent",
                          )}
                          value={displayValue}
                          onChange={(e) => onCellEdit(rowIdx, m.columnKey!, e.target.value)}
                        />
                        {issue && (
                          <span
                            className={cn(
                              "astw:text-xs astw:px-2",
                              issue.severity === "error"
                                ? "astw:text-destructive"
                                : "astw:text-yellow-600",
                            )}
                          >
                            {issue.message}
                          </span>
                        )}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Complete Step ───────────────────────────────────────

function CompleteStep({ labels }: { labels: CsvImporterLabels }) {
  return (
    <div
      data-slot="csv-importer-complete"
      className="astw:flex astw:flex-col astw:items-center astw:gap-4 astw:py-8"
    >
      <CheckCircle2Icon className="astw:text-primary astw:size-12" />
      <div className="astw:text-center">
        <h3 className="astw:text-lg astw:font-semibold">{labels.completeTitle}</h3>
        <p className="astw:text-muted-foreground astw:text-sm">{labels.completeDescription}</p>
      </div>
    </div>
  );
}

// ─── Validation Logic ────────────────────────────────────

function validateRows(
  rawRows: string[][],
  csvHeaders: string[],
  mappings: CsvColumnMapping[],
  schema: CsvSchema,
  corrections: CsvCorrection[],
): CsvCellIssue[] {
  const issues: CsvCellIssue[] = [];
  const headerIndexMap = new Map<string, number>();
  for (let i = 0; i < csvHeaders.length; i++) {
    headerIndexMap.set(csvHeaders[i], i);
  }

  const activeMappings = mappings.filter((m) => m.columnKey !== null);

  for (let rowIdx = 0; rowIdx < rawRows.length; rowIdx++) {
    const row = rawRows[rowIdx];
    const rowRecord: Record<string, unknown> = {};

    // First pass: build row record with transforms
    for (const mapping of activeMappings) {
      const colIdx = headerIndexMap.get(mapping.csvHeader);
      const correction = corrections.find(
        (c) => c.row === rowIdx && c.columnKey === mapping.columnKey,
      );
      let rawValue: string =
        correction !== undefined
          ? String(correction.newValue)
          : colIdx !== undefined
            ? row[colIdx]
            : "";

      const column = schema.columns.find((c) => c.key === mapping.columnKey);
      if (column?.transform) {
        try {
          rowRecord[mapping.columnKey!] = column.transform(rawValue);
        } catch (e) {
          // Transform failure → warning
          rowRecord[mapping.columnKey!] = rawValue;
          issues.push({
            row: rowIdx,
            columnKey: mapping.columnKey!,
            value: rawValue,
            message:
              e instanceof Error
                ? `Transform failed: ${e.message}`
                : "Transform failed",
            severity: "warning",
          });
        }
      } else {
        rowRecord[mapping.columnKey!] = rawValue;
      }
    }

    // Second pass: run validation rules
    for (const mapping of activeMappings) {
      const column = schema.columns.find((c) => c.key === mapping.columnKey);
      if (!column?.rules) continue;

      const value = rowRecord[mapping.columnKey!];
      for (const rule of column.rules) {
        const errorMessage = rule.validate(value, rowRecord);
        if (errorMessage) {
          issues.push({
            row: rowIdx,
            columnKey: mapping.columnKey!,
            value,
            message: errorMessage,
            severity: "error",
          });
          break; // Only first error per cell
        }
      }
    }
  }

  return issues;
}

// ─── Main Component ──────────────────────────────────────

export function CsvImporter({
  open,
  onOpenChange,
  schema,
  labels,
  maxFileSize,
  onImport,
}: CsvImporterProps) {
  const [step, setStep] = useState<CsvImporterStep>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<string[][]>([]);
  const [mappings, setMappings] = useState<CsvColumnMapping[]>([]);
  const [issues, setIssues] = useState<CsvCellIssue[]>([]);
  const [corrections, setCorrections] = useState<CsvCorrection[]>([]);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);

  const reset = useCallback(() => {
    setStep("upload");
    setFile(null);
    setCsvHeaders([]);
    setRawRows([]);
    setMappings([]);
    setIssues([]);
    setCorrections([]);
    setUploadError(null);
    setImporting(false);
  }, []);

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen) {
        reset();
      }
      onOpenChange(nextOpen);
    },
    [onOpenChange, reset],
  );

  const handleFileSelected = useCallback(
    async (selectedFile: File) => {
      setUploadError(null);

      if (selectedFile.size > maxFileSize) {
        setUploadError(labels.fileSizeError);
        return;
      }

      try {
        const { headers, rows } = await parseCsvFile(selectedFile);
        setFile(selectedFile);
        setCsvHeaders(headers);
        setRawRows(rows);

        const autoMappings = autoMatchHeaders(headers, schema.columns);
        setMappings(autoMappings);
        setStep("mapping");
      } catch {
        setUploadError(labels.parseError);
      }
    },
    [maxFileSize, labels, schema],
  );

  const handleMappingChange = useCallback(
    (csvHeader: string, columnKey: string | null) => {
      setMappings((prev) =>
        prev.map((m) => (m.csvHeader === csvHeader ? { ...m, columnKey } : m)),
      );
    },
    [],
  );

  const handleGoToReview = useCallback(() => {
    const validationIssues = validateRows(rawRows, csvHeaders, mappings, schema, corrections);
    setIssues(validationIssues);
    setStep("review");
  }, [rawRows, csvHeaders, mappings, schema, corrections]);

  const handleCellEdit = useCallback(
    (rowIdx: number, columnKey: string, value: string) => {
      setCorrections((prev) => {
        const existing = prev.find(
          (c) => c.row === rowIdx && c.columnKey === columnKey,
        );
        if (existing) {
          return prev.map((c) =>
            c.row === rowIdx && c.columnKey === columnKey
              ? { ...c, newValue: value }
              : c,
          );
        }
        // Find the original value
        const mapping = mappings.find((m) => m.columnKey === columnKey);
        const headerIdx = csvHeaders.indexOf(mapping?.csvHeader ?? "");
        const oldValue = headerIdx >= 0 ? rawRows[rowIdx][headerIdx] : "";
        return [...prev, { row: rowIdx, columnKey, oldValue, newValue: value }];
      });

      // Re-validate after edit
      setIssues((prev) => {
        const column = schema.columns.find((c) => c.key === columnKey);
        if (!column) return prev;

        // Remove old issues for this cell
        const filtered = prev.filter(
          (i) => !(i.row === rowIdx && i.columnKey === columnKey),
        );

        // Build row record for context
        const headerIndexMap = new Map<string, number>();
        for (let i = 0; i < csvHeaders.length; i++) {
          headerIndexMap.set(csvHeaders[i], i);
        }
        const rowRecord: Record<string, unknown> = {};
        for (const m of mappings) {
          if (!m.columnKey) continue;
          const colIdx = headerIndexMap.get(m.csvHeader);
          if (m.columnKey === columnKey) {
            rowRecord[m.columnKey] = value;
          } else {
            const corr = corrections.find(
              (c) => c.row === rowIdx && c.columnKey === m.columnKey,
            );
            rowRecord[m.columnKey] = corr
              ? corr.newValue
              : colIdx !== undefined
                ? rawRows[rowIdx][colIdx]
                : "";
          }
        }

        // Transform
        let transformedValue: unknown = value;
        if (column.transform) {
          try {
            transformedValue = column.transform(value);
          } catch (e) {
            return [
              ...filtered,
              {
                row: rowIdx,
                columnKey,
                value,
                message:
                  e instanceof Error
                    ? `Transform failed: ${e.message}`
                    : "Transform failed",
                severity: "warning" as const,
              },
            ];
          }
        }

        // Validate
        if (column.rules) {
          for (const rule of column.rules) {
            const errorMessage = rule.validate(transformedValue, rowRecord);
            if (errorMessage) {
              return [
                ...filtered,
                {
                  row: rowIdx,
                  columnKey,
                  value: transformedValue,
                  message: errorMessage,
                  severity: "error" as const,
                },
              ];
            }
          }
        }

        return filtered;
      });
    },
    [mappings, csvHeaders, rawRows, schema, corrections],
  );

  const hasErrors = issues.some((i) => i.severity === "error");
  const hasUnmappedRequired = schema.columns.some(
    (col) => col.required && !mappings.some((m) => m.columnKey === col.key),
  );

  const handleImport = useCallback(async () => {
    if (!file) return;

    const warnings = issues.filter((i) => i.severity === "warning");
    const correctedRows = new Set(corrections.map((c) => c.row)).size;

    const event: CsvImportEvent = {
      file,
      mappings,
      corrections,
      issues: warnings,
      summary: {
        totalRows: rawRows.length,
        validRows: rawRows.length - warnings.length,
        correctedRows,
        skippedRows: 0,
        warningRows: warnings.length,
      },
    };

    setImporting(true);
    try {
      await onImport(event);
      setStep("complete");
    } finally {
      setImporting(false);
    }
  }, [file, mappings, corrections, issues, rawRows, onImport]);

  return (
    <BaseDialog.Root open={open} onOpenChange={handleOpenChange}>
      <BaseDialog.Portal>
        <BaseDialog.Backdrop
          className="astw:data-open:animate-in astw:data-ending-style:animate-out astw:data-ending-style:fade-out-0 astw:data-open:fade-in-0 astw:fill-mode-forwards astw:fixed astw:inset-0 astw:z-50 astw:bg-black/50"
        />
        <BaseDialog.Popup
          data-slot="csv-importer"
          className="astw:bg-background astw:data-open:animate-in astw:data-ending-style:animate-out astw:data-ending-style:fade-out-0 astw:data-open:fade-in-0 astw:data-ending-style:zoom-out-95 astw:data-open:zoom-in-95 astw:fill-mode-forwards astw:fixed astw:top-[50%] astw:left-[50%] astw:z-50 astw:flex astw:flex-col astw:w-full astw:max-w-2xl astw:max-w-[calc(100%-2rem)] astw:max-h-[85vh] astw:translate-x-[-50%] astw:translate-y-[-50%] astw:rounded-lg astw:border astw:shadow-lg"
        >
          {/* Header with step indicators */}
          <div className="astw:flex astw:items-center astw:justify-between astw:border-b astw:px-6 astw:py-4">
            <div className="astw:flex astw:items-center astw:gap-2">
              {(["upload", "mapping", "review", "complete"] as const).map(
                (s, idx) => (
                  <React.Fragment key={s}>
                    {idx > 0 && (
                      <div
                        className={cn(
                          "astw:h-px astw:w-6",
                          stepIndex(step) >= idx
                            ? "astw:bg-primary"
                            : "astw:bg-muted-foreground/25",
                        )}
                      />
                    )}
                    <div
                      className={cn(
                        "astw:flex astw:size-7 astw:items-center astw:justify-center astw:rounded-full astw:text-xs astw:font-medium",
                        step === s
                          ? "astw:bg-primary astw:text-primary-foreground"
                          : stepIndex(step) > idx
                            ? "astw:bg-primary/20 astw:text-primary"
                            : "astw:bg-muted astw:text-muted-foreground",
                      )}
                    >
                      {idx + 1}
                    </div>
                  </React.Fragment>
                ),
              )}
            </div>
            <BaseDialog.Close className="astw:rounded-xs astw:opacity-70 astw:transition-opacity astw:hover:opacity-100 astw:focus:outline-hidden">
              <XIcon className="astw:size-4" />
              <span className="astw:sr-only">Close</span>
            </BaseDialog.Close>
          </div>

          {/* Content */}
          <div className="astw:flex-1 astw:overflow-y-auto astw:px-6 astw:py-4">
            {step === "upload" && (
              <UploadStep
                labels={labels}
                maxFileSize={maxFileSize}
                onFileSelected={handleFileSelected}
                error={uploadError}
              />
            )}
            {step === "mapping" && (
              <MappingStep
                labels={labels}
                csvHeaders={csvHeaders}
                schema={schema}
                mappings={mappings}
                onMappingChange={handleMappingChange}
              />
            )}
            {step === "review" && (
              <ReviewStep
                labels={labels}
                schema={schema}
                csvHeaders={csvHeaders}
                rawRows={rawRows}
                mappings={mappings}
                issues={issues}
                corrections={corrections}
                onCellEdit={handleCellEdit}
              />
            )}
            {step === "complete" && <CompleteStep labels={labels} />}
          </div>

          {/* Footer with navigation buttons */}
          <div className="astw:flex astw:justify-between astw:border-t astw:px-6 astw:py-4">
            <div>
              {step === "mapping" && (
                <button
                  type="button"
                  className="astw:inline-flex astw:items-center astw:gap-2 astw:rounded-md astw:border astw:px-4 astw:py-2 astw:text-sm astw:font-medium astw:transition-colors astw:hover:bg-muted"
                  onClick={() => {
                    reset();
                    setStep("upload");
                  }}
                >
                  <ArrowLeftIcon className="astw:size-4" />
                  {labels.backButton}
                </button>
              )}
              {step === "review" && (
                <button
                  type="button"
                  className="astw:inline-flex astw:items-center astw:gap-2 astw:rounded-md astw:border astw:px-4 astw:py-2 astw:text-sm astw:font-medium astw:transition-colors astw:hover:bg-muted"
                  onClick={() => setStep("mapping")}
                >
                  <ArrowLeftIcon className="astw:size-4" />
                  {labels.backButton}
                </button>
              )}
            </div>
            <div>
              {step === "mapping" && (
                <button
                  type="button"
                  className="astw:inline-flex astw:items-center astw:gap-2 astw:rounded-md astw:bg-primary astw:text-primary-foreground astw:px-4 astw:py-2 astw:text-sm astw:font-medium astw:transition-colors astw:hover:bg-primary/90 astw:disabled:opacity-50 astw:disabled:pointer-events-none"
                  onClick={handleGoToReview}
                  disabled={hasUnmappedRequired}
                >
                  {labels.nextButton}
                  <ArrowRightIcon className="astw:size-4" />
                </button>
              )}
              {step === "review" && (
                <button
                  type="button"
                  className="astw:inline-flex astw:items-center astw:gap-2 astw:rounded-md astw:bg-primary astw:text-primary-foreground astw:px-4 astw:py-2 astw:text-sm astw:font-medium astw:transition-colors astw:hover:bg-primary/90 astw:disabled:opacity-50 astw:disabled:pointer-events-none"
                  onClick={handleImport}
                  disabled={hasErrors || importing}
                >
                  {importing ? (
                    <span className="astw:inline-flex astw:items-center astw:gap-2">
                      <span className="astw:size-4 astw:animate-spin astw:rounded-full astw:border-2 astw:border-current astw:border-t-transparent" />
                      Importing...
                    </span>
                  ) : (
                    labels.importButton
                  )}
                </button>
              )}
              {step === "complete" && (
                <button
                  type="button"
                  className="astw:inline-flex astw:items-center astw:gap-2 astw:rounded-md astw:bg-primary astw:text-primary-foreground astw:px-4 astw:py-2 astw:text-sm astw:font-medium astw:transition-colors astw:hover:bg-primary/90"
                  onClick={() => handleOpenChange(false)}
                >
                  {labels.closeButton}
                </button>
              )}
            </div>
          </div>
        </BaseDialog.Popup>
      </BaseDialog.Portal>
    </BaseDialog.Root>
  );
}

function stepIndex(step: CsvImporterStep): number {
  const steps: CsvImporterStep[] = ["upload", "mapping", "review", "complete"];
  return steps.indexOf(step);
}
