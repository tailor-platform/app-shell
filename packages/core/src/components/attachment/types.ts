export interface AttachmentItem {
  /** Unique identifier for the attachment item. */
  id: string;
  /** Original filename shown for non-image attachments. */
  fileName: string;
  /** MIME type used to switch image/file preview rendering. */
  mimeType: string;
  /** Optional preview URL for image attachments. */
  previewUrl?: string;
}

export type AttachmentOperation =
  | { type: "upload"; file: File; item: AttachmentItem }
  | { type: "delete"; item: AttachmentItem };

export type AttachmentProps = {
  /** List of attachments to render. */
  items?: AttachmentItem[];
  /** Called when files are selected or dropped. */
  onUpload: (files: File[]) => void;
  /** Called when delete action is selected for an item. */
  onDelete: (item: AttachmentItem) => void;
  /** Called when download action is selected for an item. */
  onDownload?: (item: AttachmentItem) => void;
  /** Upload label shown in the upload tile. */
  uploadLabel?: string;
  /** Supporting text shown below the upload label (e.g. accepted formats, max size). */
  uploadHint?: string;
  /** Accepted file types passed to the hidden file input. */
  accept?: string;
  /** Disable upload and item actions. */
  disabled?: boolean;
  /**
   * Classes on the root wrapper. The component does not apply outer padding or borders—use
   * this, or a parent such as `Card.Content`, for spacing and chrome.
   */
  className?: string;
};

export type UseAttachmentOptions = {
  /** Initial items to populate (e.g. from an existing record). */
  initialItems?: AttachmentItem[];
  /** Accepted file types passed to the hidden file input. */
  accept?: string;
  /** Disable upload and item actions. */
  disabled?: boolean;
};
