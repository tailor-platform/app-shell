import { useCallback, useState } from "react";
import type { CsvSchema, CsvImportEvent, CsvImporterProps, CsvCellIssue, ParsedRow } from "./types";

const DEFAULT_MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

type UseCsvImporterOptions<T extends CsvSchema> = {
  schema: T;
  onImport: (event: CsvImportEvent<T>) => void | Promise<void>;
  onValidate?: (rows: ParsedRow[]) => Promise<CsvCellIssue[]>;
  maxFileSize?: number;
};

export function useCsvImporter<const T extends CsvSchema>(options: UseCsvImporterOptions<T>) {
  const { schema, onImport, onValidate, maxFileSize } = options;
  const [isOpen, setIsOpen] = useState(false);

  const open = useCallback(() => {
    setIsOpen(true);
  }, []);

  const props: CsvImporterProps<T> = {
    open: isOpen,
    onOpenChange: setIsOpen,
    schema,
    maxFileSize: maxFileSize ?? DEFAULT_MAX_FILE_SIZE,
    onImport,
    onValidate,
  };

  return { open, props };
}
