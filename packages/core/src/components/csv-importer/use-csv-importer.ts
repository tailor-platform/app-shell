import { useCallback, useState } from "react";
import type { CsvSchema, CsvImportEvent, CsvImporterProps, CsvImporterLabels } from "./types";

const DEFAULT_MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const DEFAULT_LABELS: CsvImporterLabels = {
  uploadTitle: "Upload CSV",
  uploadDescription: "Select a CSV file to import",
  uploadButton: "Choose file",
  mappingTitle: "Map columns",
  mappingDescription: "Match CSV columns to the expected fields",
  mappingSkip: "Skip",
  reviewTitle: "Review data",
  reviewDescription: "Review and fix any issues before importing",
  completeTitle: "Import complete",
  completeDescription: "Your data has been imported successfully",
  nextButton: "Next",
  backButton: "Back",
  importButton: "Import",
  closeButton: "Close",
  fileSizeError: "File size exceeds the maximum allowed size",
  parseError: "Failed to parse the CSV file",
  requiredColumnError: "This column is required and must be mapped",
};

type UseCsvImporterOptions = {
  schema: CsvSchema;
  onImport: (event: CsvImportEvent) => void | Promise<void>;
  maxFileSize?: number;
  labels?: Partial<CsvImporterLabels>;
};

export function useCsvImporter(options: UseCsvImporterOptions) {
  const { schema, onImport, maxFileSize, labels } = options;
  const [isOpen, setIsOpen] = useState(false);

  const open = useCallback(() => {
    setIsOpen(true);
  }, []);

  const mergedLabels: CsvImporterLabels = {
    ...DEFAULT_LABELS,
    ...labels,
  };

  const props: CsvImporterProps = {
    open: isOpen,
    onOpenChange: setIsOpen,
    schema,
    labels: mergedLabels,
    maxFileSize: maxFileSize ?? DEFAULT_MAX_FILE_SIZE,
    onImport,
  };

  return { open, props };
}
