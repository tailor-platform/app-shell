import * as React from "react";
import { UploadIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Dialog } from "./dialog";
import { Button } from "./button";
/**
 * Props for the FileUploadDialog component.
 */
export interface FileUploadDialogProps {
  /** Controlled open state. */
  open: boolean;
  /** Open state change handler. */
  onOpenChange: (open: boolean) => void;
  /** Called when a file is selected or dropped (single file). */
  onUpload: (file: File) => void;
  /** Dialog title. */
  title?: string;
  /** Helper text below the title. */
  description?: string;
  /** Accepted file types (e.g. ".pdf,.png,.jpg,.tiff"). */
  accept?: string;
  /** Upload button label. */
  uploadLabel?: string;
  /** Disable the upload area and button. */
  disabled?: boolean;
  /** Additional CSS classes on the dialog content. */
  className?: string;
}

/**
 * A reusable file upload dialog with drag-and-drop support.
 *
 * @example
 * ```tsx
 * const [open, setOpen] = React.useState(false);
 *
 * <FileUploadDialog
 *   open={open}
 *   onOpenChange={setOpen}
 *   onUpload={(file) => console.log(file)}
 *   title="Upload Invoice"
 *   description="Upload a PDF or image of a supplier invoice."
 *   accept=".pdf,.png,.jpg,.tiff"
 * />
 * ```
 */
export function FileUploadDialog({
  open,
  onOpenChange,
  onUpload,
  title = "Upload File",
  description,
  accept,
  uploadLabel = "Upload",
  disabled = false,
  className,
}: FileUploadDialogProps) {
  const [file, setFile] = React.useState<File | null>(null);
  const [isDragOver, setIsDragOver] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Reset file state when dialog closes
  React.useEffect(() => {
    if (!open) {
      setFile(null);
      setIsDragOver(false);
    }
  }, [open]);

  function isAcceptedFile(candidate: File): boolean {
    if (!accept) return true;
    const accepted = accept.split(",").map((s) => s.trim().toLowerCase());
    const ext = `.${candidate.name.split(".").pop()?.toLowerCase()}`;
    const mime = candidate.type.toLowerCase();
    return accepted.some(
      (a) => a === ext || a === mime || (a.endsWith("/*") && mime.startsWith(a.replace("/*", "/"))),
    );
  }

  function handleFileSelect(selected: File | undefined) {
    if (selected && isAcceptedFile(selected)) {
      setFile(selected);
    }
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) setIsDragOver(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    if (disabled) return;

    const dropped = e.dataTransfer.files[0];
    handleFileSelect(dropped);
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    handleFileSelect(selected);
    // Reset input so re-selecting the same file triggers change
    if (inputRef.current) inputRef.current.value = "";
  }

  function handleUpload() {
    if (file) {
      onUpload(file);
      onOpenChange(false);
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Content className={cn("astw:sm:max-w-md", className)}>
        <Dialog.Header>
          <Dialog.Title>{title}</Dialog.Title>
          {description && <Dialog.Description>{description}</Dialog.Description>}
        </Dialog.Header>

        {/* Drop zone */}
        <button
          type="button"
          data-slot="file-upload-dropzone"
          aria-label="Click to select a file or drag and drop"
          disabled={disabled}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={cn(
            "astw:flex astw:w-full astw:flex-col astw:items-center astw:justify-center astw:gap-2 astw:rounded-lg astw:border-2 astw:border-dashed astw:p-8 astw:text-center astw:transition-colors astw:cursor-pointer astw:bg-transparent",
            isDragOver
              ? "astw:border-primary astw:bg-primary/5"
              : "astw:border-muted-foreground/25 astw:hover:border-muted-foreground/50",
            disabled && "astw:pointer-events-none astw:opacity-50",
          )}
        >
          <UploadIcon className="astw:size-8 astw:text-muted-foreground" />
          {file ? (
            <p className="astw:text-sm astw:font-medium astw:text-foreground astw:truncate astw:max-w-full">
              {file.name}
            </p>
          ) : (
            <>
              <p className="astw:text-sm astw:font-medium astw:text-foreground">
                Click to select a file
              </p>
              {accept && (
                <p className="astw:text-xs astw:text-muted-foreground">
                  {accept.replace(/\./g, "").toUpperCase().replace(/,/g, ", ")}
                </p>
              )}
            </>
          )}
        </button>

        <input
          ref={inputRef}
          type="file"
          accept={accept}
          onChange={handleInputChange}
          className="astw:sr-only"
          tabIndex={-1}
          aria-hidden
        />

        <Dialog.Footer>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={disabled}>
            Cancel
          </Button>
          <Button onClick={handleUpload} disabled={disabled || !file}>
            <UploadIcon />
            {uploadLabel}
          </Button>
        </Dialog.Footer>
      </Dialog.Content>
    </Dialog.Root>
  );
}
