import type * as React from "react";

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
  status?: "ready" | "uploading";
}

interface AttachmentCardBaseProps {
  /** Card title text. */
  title?: string;
  /**
   * Optional helper text shown under the title (e.g. accepted formats and max file size).
   * Omit when no supplementary guidance is needed.
   */
  description?: React.ReactNode;
  /** List of attachments to render. */
  items?: AttachmentItem[];
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

type ControlledUploadProps = {
  /** Called when files are selected or dropped. */
  onUpload: (files: File[]) => void;
  uploadFile?: never;
  onUploadError?: never;
};

type AsyncUploadProps = {
  onUpload?: never;
  /** Optional async upload handler for built-in upload lifecycle UX. */
  uploadFile: (file: File) => Promise<AttachmentItem>;
  /** Called when an async upload fails. */
  onUploadError?: (ctx: { file: File; error: Error }) => void;
};

type ReadOnlyListProps = {
  onUpload?: undefined;
  uploadFile?: undefined;
  onUploadError?: never;
};

export type AttachmentCardProps = AttachmentCardBaseProps &
  (ControlledUploadProps | AsyncUploadProps | ReadOnlyListProps);
