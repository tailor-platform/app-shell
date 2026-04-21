import * as React from "react";
import { CloudUpload, Ellipsis, File, Image as ImageIcon } from "lucide-react";

import { cn } from "@/lib/utils";

import { Menu } from "../menu";
import type { AttachmentProps, AttachmentItem } from "./types";

const tileBaseClasses =
  "astw:relative astw:size-30 astw:shrink-0 astw:overflow-hidden astw:rounded-lg";
const tileClasses = `${tileBaseClasses} astw:border astw:border-border`;

function isImageItem(item: AttachmentItem): boolean {
  return item.mimeType.startsWith("image/");
}

function toFiles(fileList: FileList | null): File[] {
  return fileList ? Array.from(fileList) : [];
}

function splitFileName(fileName: string): {
  baseName: string;
  extension: string;
} {
  const lastDotIndex = fileName.lastIndexOf(".");
  if (lastDotIndex <= 0 || lastDotIndex === fileName.length - 1) {
    return { baseName: fileName, extension: "" };
  }

  return {
    baseName: fileName.slice(0, lastDotIndex),
    extension: fileName.slice(lastDotIndex),
  };
}

export function Attachment({
  items = [],
  onUpload,
  onDelete,
  onDownload,
  uploadLabel = "Click to upload",
  uploadHint,
  accept,
  disabled = false,
  className,
}: AttachmentProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = React.useState(false);
  const [failedImagePreviewIds, setFailedImagePreviewIds] = React.useState<Set<string>>(new Set());
  const dragDepthRef = React.useRef(0);

  const handleUpload = React.useCallback(
    (files: File[]) => {
      if (disabled || files.length === 0) return;
      onUpload(files);
    },
    [disabled, onUpload],
  );

  const handleInputChange = React.useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      handleUpload(toFiles(event.target.files));
      event.target.value = "";
    },
    [handleUpload],
  );

  const handleDrop = React.useCallback(
    (event: React.DragEvent<HTMLButtonElement>) => {
      event.preventDefault();
      if (disabled) return;
      dragDepthRef.current = 0;
      setIsDragOver(false);
      handleUpload(toFiles(event.dataTransfer.files));
    },
    [disabled, handleUpload],
  );

  const handleDragEnter = React.useCallback(
    (event: React.DragEvent<HTMLButtonElement>) => {
      event.preventDefault();
      if (disabled) return;
      dragDepthRef.current += 1;
      setIsDragOver(true);
    },
    [disabled],
  );

  const handleDragLeave = React.useCallback(
    (event: React.DragEvent<HTMLButtonElement>) => {
      event.preventDefault();
      if (disabled) return;
      dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
      if (dragDepthRef.current === 0) {
        setIsDragOver(false);
      }
    },
    [disabled],
  );

  const handleImagePreviewError = React.useCallback((itemId: string) => {
    setFailedImagePreviewIds((prev) => {
      const next = new Set(prev);
      next.add(itemId);
      return next;
    });
  }, []);

  const handleDeleteItem = React.useCallback(
    (item: AttachmentItem) => {
      setFailedImagePreviewIds((prev) => {
        if (!prev.has(item.id)) return prev;
        const next = new Set(prev);
        next.delete(item.id);
        return next;
      });
      onDelete(item);
    },
    [onDelete],
  );

  return (
    <div
      data-slot="attachment"
      className={cn("astw:@container astw:flex astw:w-full astw:min-w-0 astw:flex-col", className)}
    >
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={accept}
        disabled={disabled}
        className="astw:hidden"
        data-testid="attachment-upload-input"
        onChange={handleInputChange}
      />
      <div data-slot="attachment-content" className="astw:min-w-0">
        <div className="astw:flex astw:flex-wrap astw:gap-4">
          {items.map((item) => {
            const { baseName, extension } = splitFileName(item.fileName);
            const hasFailedImagePreview = failedImagePreviewIds.has(item.id);
            const shouldShowImagePreview =
              isImageItem(item) && !!item.previewUrl && !hasFailedImagePreview;

            return (
              <div key={item.id} className="astw:group astw:relative">
                {isImageItem(item) ? (
                  <div
                    className={cn(
                      shouldShowImagePreview
                        ? cn(tileBaseClasses, "astw:bg-muted")
                        : cn(
                            tileClasses,
                            "astw:flex astw:flex-col astw:justify-between astw:bg-card astw:p-3",
                          ),
                    )}
                  >
                    {shouldShowImagePreview ? (
                      <img
                        src={item.previewUrl}
                        alt={item.fileName}
                        className="astw:size-full astw:object-cover"
                        onError={() => handleImagePreviewError(item.id)}
                      />
                    ) : (
                      <>
                        <ImageIcon
                          className="astw:size-5 astw:text-muted-foreground astw:opacity-60"
                          strokeWidth={1.5}
                          aria-hidden
                          data-testid="attachment-image-fallback-icon"
                        />
                        <p className="astw:flex astw:min-w-0 astw:items-end astw:gap-0.5 astw:text-xs astw:leading-normal astw:text-foreground">
                          <span className="astw:min-w-0 astw:flex-1 astw:line-clamp-2 astw:break-all">
                            {baseName}
                          </span>
                          {extension ? <span className="astw:shrink-0">{extension}</span> : null}
                        </p>
                      </>
                    )}
                  </div>
                ) : (
                  <div
                    className={cn(
                      tileClasses,
                      "astw:flex astw:flex-col astw:justify-between astw:bg-card astw:p-3",
                    )}
                  >
                    <File
                      className="astw:size-5 astw:text-muted-foreground astw:opacity-60"
                      strokeWidth={1.5}
                      aria-hidden
                      data-testid="attachment-file-icon"
                    />
                    <p className="astw:flex astw:min-w-0 astw:items-end astw:gap-0.5 astw:text-xs astw:leading-normal astw:text-foreground">
                      <span className="astw:min-w-0 astw:flex-1 astw:line-clamp-2 astw:break-all">
                        {baseName}
                      </span>
                      {extension ? <span className="astw:shrink-0">{extension}</span> : null}
                    </p>
                  </div>
                )}
                {!disabled && (
                  <div className="astw:absolute astw:top-2 astw:right-2 astw:opacity-0 astw:transition-opacity astw:group-hover:opacity-100 astw:group-focus-within:opacity-100">
                    <Menu.Root>
                      <Menu.Trigger
                        className="astw:inline-flex astw:size-7 astw:items-center astw:justify-center astw:rounded-md astw:border astw:bg-background/90 astw:text-foreground astw:shadow-xs astw:hover:bg-accent"
                        aria-label={`Attachment options for ${item.fileName}`}
                      >
                        <Ellipsis className="astw:size-4" aria-hidden />
                      </Menu.Trigger>
                      <Menu.Content>
                        {onDownload ? (
                          <Menu.Item onClick={() => onDownload(item)}>Download</Menu.Item>
                        ) : null}
                        <Menu.Item onClick={() => handleDeleteItem(item)}>Delete</Menu.Item>
                      </Menu.Content>
                    </Menu.Root>
                  </div>
                )}
              </div>
            );
          })}
          {!disabled && (
            <button
              type="button"
              aria-label={uploadLabel}
              data-testid="attachment-upload-tile"
              className={cn(
                "astw:flex astw:h-30 astw:w-[200px] astw:shrink-0 astw:cursor-pointer astw:flex-col astw:justify-between astw:rounded-lg astw:border-2 astw:border-dashed astw:border-border astw:bg-muted/50 astw:p-3 astw:transition-colors astw:hover:bg-muted",
                isDragOver && "astw:border-primary astw:ring-1 astw:ring-primary/30 astw:bg-muted",
              )}
              onClick={() => inputRef.current?.click()}
              onDragOver={(event) => event.preventDefault()}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <CloudUpload
                className="astw:size-5 astw:text-muted-foreground astw:opacity-60"
                strokeWidth={1.5}
                aria-hidden
              />
              <div className="astw:min-w-0 astw:self-stretch astw:text-left">
                <p className="astw:text-sm astw:leading-normal astw:text-foreground">
                  {uploadLabel}
                </p>
                {uploadHint ? (
                  <p className="astw:text-xs astw:leading-normal astw:text-muted-foreground">
                    {uploadHint}
                  </p>
                ) : null}
              </div>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default Attachment;
