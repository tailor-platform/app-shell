import * as React from "react";
import { Ellipsis, File, Image as ImageIcon, Loader2 } from "lucide-react";

import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

import { Button } from "../button";
import { Card } from "../card";
import { Menu } from "../menu";
import type { AttachmentCardProps, AttachmentItem } from "./types";

const tileClasses =
  "astw:relative astw:size-30 astw:shrink-0 astw:overflow-hidden astw:rounded-lg astw:border astw:border-border";

type TemporaryUploadItem = {
  item: AttachmentItem;
  file: File;
  previewUrl?: string;
};

function isImageItem(item: AttachmentItem): boolean {
  return item.mimeType.startsWith("image/");
}

function toFiles(fileList: FileList | null): File[] {
  return fileList ? Array.from(fileList) : [];
}

function splitFileName(fileName: string): { baseName: string; extension: string } {
  const lastDotIndex = fileName.lastIndexOf(".");
  if (lastDotIndex <= 0 || lastDotIndex === fileName.length - 1) {
    return { baseName: fileName, extension: "" };
  }

  return {
    baseName: fileName.slice(0, lastDotIndex),
    extension: fileName.slice(lastDotIndex),
  };
}

function createTemporaryUploadItem(file: File): TemporaryUploadItem {
  const previewUrl = file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined;
  return {
    file,
    previewUrl,
    item: {
      id: `temp-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
      fileName: file.name,
      mimeType: file.type || "application/octet-stream",
      previewUrl,
      status: "uploading",
    },
  };
}

function mergeAttachmentItems(externalItems: AttachmentItem[], localItems: AttachmentItem[]) {
  const merged: AttachmentItem[] = [];
  const seen = new Set<string>();

  for (const item of [...localItems, ...externalItems]) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    merged.push(item);
  }

  return merged;
}

export function AttachmentCard({
  title = "Attachments",
  description,
  items = [],
  onUpload,
  uploadFile,
  onUploadError,
  onDelete,
  onDownload,
  uploadLabel = "Upload",
  accept,
  disabled = false,
  className,
}: AttachmentCardProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = React.useState(false);
  const [localItems, setLocalItems] = React.useState<AttachmentItem[]>([]);
  const [failedImagePreviewIds, setFailedImagePreviewIds] = React.useState<Set<string>>(new Set());
  const dragDepthRef = React.useRef(0);
  const objectUrlsRef = React.useRef<Set<string>>(new Set());
  const isMountedRef = React.useRef(true);
  const toast = useToast();

  React.useEffect(() => {
    isMountedRef.current = true;
    const trackedObjectUrls = objectUrlsRef.current;
    return () => {
      isMountedRef.current = false;
      for (const objectUrl of trackedObjectUrls) {
        URL.revokeObjectURL(objectUrl);
      }
      trackedObjectUrls.clear();
    };
  }, []);

  const handleUpload = React.useCallback(
    async (files: File[]) => {
      if (disabled || files.length === 0) return;
      if (!uploadFile) {
        onUpload?.(files);
        return;
      }

      const temporaryItems = files.map(createTemporaryUploadItem);
      for (const temporaryItem of temporaryItems) {
        if (temporaryItem.previewUrl) {
          objectUrlsRef.current.add(temporaryItem.previewUrl);
        }
      }
      setLocalItems((prev) => [...temporaryItems.map((entry) => entry.item), ...prev]);

      await Promise.all(
        temporaryItems.map(async (entry) => {
          try {
            const uploadedItem = await uploadFile(entry.file);
            if (!isMountedRef.current) return;
            setLocalItems((prev) =>
              prev.map((item) =>
                item.id === entry.item.id
                  ? {
                      ...uploadedItem,
                      status: uploadedItem.status ?? "ready",
                    }
                  : item,
              ),
            );
          } catch (error: unknown) {
            if (!isMountedRef.current) return;
            const uploadError =
              error instanceof Error ? error : new Error("Failed to upload attachment");
            toast.error(`Failed to upload ${entry.file.name}`);
            onUploadError?.({ file: entry.file, error: uploadError });
            setLocalItems((prev) => prev.filter((item) => item.id !== entry.item.id));
          } finally {
            if (entry.previewUrl) {
              URL.revokeObjectURL(entry.previewUrl);
              objectUrlsRef.current.delete(entry.previewUrl);
            }
          }
        }),
      );
    },
    [disabled, onUpload, onUploadError, toast, uploadFile],
  );

  const handleInputChange = React.useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      void handleUpload(toFiles(event.target.files));
      event.target.value = "";
    },
    [handleUpload],
  );

  const handleDrop = React.useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      if (disabled) return;
      dragDepthRef.current = 0;
      setIsDragOver(false);
      void handleUpload(toFiles(event.dataTransfer.files));
    },
    [disabled, handleUpload],
  );

  const handleDragEnter = React.useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      if (disabled) return;
      dragDepthRef.current += 1;
      setIsDragOver(true);
    },
    [disabled],
  );

  const handleDragLeave = React.useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
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
      setLocalItems((prev) => prev.filter((candidate) => candidate.id !== item.id));
      setFailedImagePreviewIds((prev) => {
        if (!prev.has(item.id)) return prev;
        const next = new Set(prev);
        next.delete(item.id);
        return next;
      });
      onDelete?.(item);
    },
    [onDelete],
  );

  const displayItems = React.useMemo(
    () => mergeAttachmentItems(items, localItems),
    [items, localItems],
  );
  const hasItems = displayItems.length > 0;

  return (
    <Card.Root
      data-slot="attachment-card"
      className={cn(
        "astw:@container astw:transition-colors",
        isDragOver &&
          !disabled &&
          "astw:border-dashed astw:border-primary astw:ring-1 astw:ring-primary/30",
        className,
      )}
      onDragOver={(event) => event.preventDefault()}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className={cn("astw:px-5 astw:pt-5", hasItems ? "astw:pb-4" : "astw:pb-5")}>
        <div className="astw:flex astw:w-full astw:items-start astw:justify-between astw:gap-4">
          <div className="astw:min-w-0 astw:flex-1 astw:space-y-1">
            <h3 className="astw:text-lg astw:font-semibold astw:text-card-foreground">{title}</h3>
            {description ? (
              <div
                data-slot="attachment-card-description"
                className="astw:text-sm astw:text-muted-foreground"
              >
                {description}
              </div>
            ) : null}
          </div>
          <div className="astw:flex astw:shrink-0 astw:items-center astw:gap-2 astw:text-sm">
            <span className="astw:hidden astw:@[620px]:inline astw:text-foreground">
              Drag and drop images/files or
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="astw:text-foreground"
              disabled={disabled}
              onClick={() => inputRef.current?.click()}
            >
              {uploadLabel}
            </Button>
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
          </div>
        </div>
      </div>
      {hasItems && (
        <Card.Content className="astw:px-5 astw:pb-5">
          <div className="astw:flex astw:flex-wrap astw:gap-4">
            {displayItems.map((item) => {
              const { baseName, extension } = splitFileName(item.fileName);
              const isUploading = item.status === "uploading";
              const hasFailedImagePreview = failedImagePreviewIds.has(item.id);
              const shouldShowImagePreview =
                isImageItem(item) && !!item.previewUrl && !hasFailedImagePreview;

              return (
                <div key={item.id} className="astw:group astw:relative">
                  {isImageItem(item) ? (
                    <div
                      className={cn(
                        tileClasses,
                        shouldShowImagePreview
                          ? "astw:bg-muted"
                          : "astw:flex astw:flex-col astw:justify-between astw:bg-card astw:p-3",
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
                      {isUploading ? (
                        <div
                          className="astw:absolute astw:inset-0 astw:flex astw:items-center astw:justify-center astw:bg-black/60"
                          data-testid="attachment-upload-overlay"
                        >
                          <Loader2
                            className="astw:size-5 astw:animate-spin astw:text-white"
                            aria-hidden
                            data-testid="attachment-upload-spinner"
                          />
                        </div>
                      ) : null}
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
                      {isUploading ? (
                        <div
                          className="astw:absolute astw:inset-0 astw:flex astw:items-center astw:justify-center astw:bg-black/60"
                          data-testid="attachment-upload-overlay"
                        >
                          <Loader2
                            className="astw:size-5 astw:animate-spin astw:text-white"
                            aria-hidden
                            data-testid="attachment-upload-spinner"
                          />
                        </div>
                      ) : null}
                    </div>
                  )}
                  {!disabled && !isUploading && (
                    <div className="astw:absolute astw:top-2 astw:right-2 astw:opacity-0 astw:transition-opacity astw:group-hover:opacity-100 astw:group-focus-within:opacity-100">
                      <Menu.Root>
                        <Menu.Trigger
                          className="astw:inline-flex astw:size-7 astw:items-center astw:justify-center astw:rounded-md astw:border astw:bg-background/90 astw:text-foreground astw:shadow-xs astw:hover:bg-accent"
                          aria-label={`Attachment options for ${item.fileName}`}
                        >
                          <Ellipsis className="astw:size-4" aria-hidden />
                        </Menu.Trigger>
                        <Menu.Content>
                          <Menu.Item onClick={() => onDownload?.(item)}>Download</Menu.Item>
                          <Menu.Item onClick={() => handleDeleteItem(item)}>Delete</Menu.Item>
                        </Menu.Content>
                      </Menu.Root>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Card.Content>
      )}
    </Card.Root>
  );
}

export default AttachmentCard;
