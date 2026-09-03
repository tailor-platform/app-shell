import { Paperclip, X } from "lucide-react";

import type { AttachmentItem } from "@/components/attachment";
import { useT } from "@/i18n-labels";
import { cn } from "@/lib/utils";

/**
 * A file staged in the composer before sending: `AttachmentItem`'s vocabulary
 * (id/fileName/mimeType/previewUrl) plus the raw `File` a send handler needs.
 */
type AIChatAttachment = AttachmentItem & { file: File };

type AttachmentChipProps = {
  attachment: AIChatAttachment;
  onRemove: (id: string) => void;
  className?: string;
};

function AttachmentChip({ attachment, onRemove, className }: AttachmentChipProps) {
  const t = useT();
  const isImage = attachment.mimeType.startsWith("image/");

  return (
    <div
      data-slot="ai-chat-attachment-chip"
      className={cn(
        "astw:flex astw:h-7 astw:items-center astw:gap-1.5 astw:rounded-md astw:border astw:border-border astw:bg-muted/40 astw:pl-1.5 astw:pr-1 astw:text-xs",
        className,
      )}
    >
      {isImage && attachment.previewUrl ? (
        <img
          src={attachment.previewUrl}
          alt={attachment.fileName}
          className="astw:size-4 astw:shrink-0 astw:rounded-sm astw:object-cover"
        />
      ) : (
        <Paperclip className="astw:size-3 astw:shrink-0 astw:text-muted-foreground" aria-hidden />
      )}
      <span className="astw:max-w-32 astw:truncate">{attachment.fileName}</span>
      <button
        type="button"
        aria-label={t("aiChatRemoveAttachment", { fileName: attachment.fileName })}
        className="astw:shrink-0 astw:rounded-full astw:p-0.5 astw:text-muted-foreground astw:hover:bg-accent astw:hover:text-foreground"
        onClick={() => onRemove(attachment.id)}
      >
        <X className="astw:size-3" aria-hidden />
      </button>
    </div>
  );
}

export { AttachmentChip, type AIChatAttachment };
