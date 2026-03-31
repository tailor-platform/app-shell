export interface AttachmentItem {
  /** Unique identifier for the attachment item. */
  id: string;
  /** Original filename shown for non-image attachments. */
  fileName: string;
  /** MIME type used to switch image/file preview rendering. */
  mimeType: string;
  /** Optional preview URL for image attachments. */
  previewUrl?: string;
  /** Lifecycle status used for upload rendering. */
  status?: "ready" | "uploading" | "error";
  /** Optional upload error message for UI/telemetry. */
  errorMessage?: string;
}

export interface AttachmentCardProps {
  /** Card title text. */
  title?: string;
  /** List of attachments to render. */
  items?: AttachmentItem[];
  /** Called when files are selected or dropped. */
  onUpload?: (files: File[]) => void;
  /** Optional async upload handler for built-in upload lifecycle UX. */
  uploadFile?: (file: File) => Promise<AttachmentItem>;
  /** Called when an async upload fails. */
  onUploadError?: (ctx: { file: File; error: Error }) => void;
  /** Optional retry handler used by consumers for error recovery strategies. */
  onRetryUpload?: (item: AttachmentItem) => Promise<AttachmentItem>;
  /** Called when delete action is selected for an item. */
  onDelete?: (item: AttachmentItem) => void;
  /** Called when download action is selected for an item. */
  onDownload?: (item: AttachmentItem) => void;
  /** Upload button label. */
  uploadLabel?: string;
  /** Accepted file types passed to the hidden file input. */
  accept?: string;
  /** Disable upload and item actions. */
  disabled?: boolean;
  /** Additional classes applied on the card root. */
  className?: string;
}
