import { ArrowUp, Loader2, Paperclip, Square } from "lucide-react";
import {
  useEffect,
  useRef,
  useState,
  type ComponentProps,
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
} from "react";

import type { AIChatStatus } from "@/ai/use-ai-chat";
import { Button } from "@/components/button";
import { Textarea } from "@/components/textarea";
import { useT } from "@/i18n-labels";
import { AttachmentChip, type AIChatAttachment } from "./attachment-chip";

type ComposerProps = {
  value: string;
  onValueChange: (value: string) => void;
  onSubmit: (message: string, attachments: AIChatAttachment[]) => void;
  onStop?: () => void;
  status: AIChatStatus;
  placeholder?: string;
  disabled?: boolean;
  submitOnEnter: boolean;
  attachments: boolean;
  accept?: string;
  multiple: boolean;
  composerActions?: ReactNode;
  rows?: number;
};

type SubmitControlProps = {
  busy: boolean;
  canSubmit: boolean;
  onStop?: () => void;
};

/** The composer's single right-side control: submit, a Stop button while streaming, or a plain busy state when there's nothing to stop. */
function SubmitControl({ busy, canSubmit, onStop }: SubmitControlProps) {
  const t = useT();

  if (!busy) {
    return (
      <Button type="submit" disabled={!canSubmit}>
        <ArrowUp className="astw:size-4" aria-hidden />
        {t("aiChatSend")}
      </Button>
    );
  }

  if (onStop) {
    return (
      <Button type="button" variant="ghost" onClick={onStop}>
        <Square className="astw:size-3.5 astw:fill-current" aria-hidden />
        {t("aiChatStop")}
      </Button>
    );
  }

  return (
    <Button type="button" disabled>
      <Loader2 className="astw:size-4 astw:animate-spin" aria-hidden />
      {t("aiChatSending")}
    </Button>
  );
}

function buildAttachment(file: File): AIChatAttachment {
  return {
    id: crypto.randomUUID(),
    file,
    fileName: file.name,
    mimeType: file.type || "application/octet-stream",
    previewUrl: file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined,
  };
}

/**
 * The composer AIChat renders as its own footer: an `AIChat`-body `Textarea`
 * over one action row, following the `form/composer` pattern — left side
 * open for `composerActions` (plus the attach button, when enabled), right
 * side fixed to the single submit control. Enter submits and is IME-safe;
 * Shift+Enter inserts a newline. The submit button becomes Stop while a
 * response is streaming.
 */
function Composer({
  value,
  onValueChange,
  onSubmit,
  onStop,
  status,
  placeholder,
  disabled = false,
  submitOnEnter,
  attachments: attachmentsEnabled,
  accept,
  multiple,
  composerActions,
  rows = 2,
}: ComposerProps) {
  const t = useT();
  const [files, setFiles] = useState<AIChatAttachment[]>([]);
  const filesRef = useRef(files);
  filesRef.current = files;
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Revoke any remaining object URLs on unmount (e.g. the user attached a
  // file and navigated away without sending).
  useEffect(() => {
    return () => {
      for (const attachment of filesRef.current) {
        if (attachment.previewUrl) URL.revokeObjectURL(attachment.previewUrl);
      }
    };
  }, []);

  const busy = status === "submitted" || status === "streaming";
  const canSubmit = !disabled && !busy && value.trim().length > 0;

  const addFiles = (incoming: FileList | File[]) => {
    setFiles((prev) => [...prev, ...Array.from(incoming).map(buildAttachment)]);
  };

  const removeFile = (id: string) => {
    setFiles((prev) => {
      const found = prev.find((f) => f.id === id);
      if (found?.previewUrl) URL.revokeObjectURL(found.previewUrl);
      return prev.filter((f) => f.id !== id);
    });
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit) return;
    const snapshot = files;
    setFiles([]);
    onValueChange("");
    onSubmit(value.trim(), snapshot);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    // isComposing guards IME text entry (e.g. kana→kanji conversion), where
    // Enter confirms a candidate rather than submitting the form.
    if (
      submitOnEnter &&
      event.key === "Enter" &&
      !event.shiftKey &&
      !event.nativeEvent.isComposing
    ) {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    }
    if (event.key === "Backspace" && event.currentTarget.value === "" && files.length > 0) {
      event.preventDefault();
      const last = files.at(-1);
      if (last) removeFile(last.id);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="astw:flex astw:shrink-0 astw:flex-col astw:gap-2 astw:border-t astw:p-3"
    >
      {attachmentsEnabled ? (
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={(event) => {
            if (event.currentTarget.files?.length) addFiles(event.currentTarget.files);
            event.currentTarget.value = "";
          }}
          className="astw:hidden"
          aria-hidden
          tabIndex={-1}
        />
      ) : null}
      {attachmentsEnabled && files.length > 0 ? (
        <div className="astw:flex astw:flex-wrap astw:gap-1.5">
          {files.map((attachment) => (
            <AttachmentChip key={attachment.id} attachment={attachment} onRemove={removeFile} />
          ))}
        </div>
      ) : null}
      <Textarea
        aria-label={t("aiChatMessage")}
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
        // `Textarea`'s `onKeyDown` type is inherited from Base UI's
        // `Field.Control`, which is typed against its default `<input>` tag —
        // the same static-vs-runtime mismatch `Textarea` itself resolves for
        // `onChange`. The handler that runs is the correct one; only the
        // types disagree.
        onKeyDown={handleKeyDown as unknown as ComponentProps<typeof Textarea>["onKeyDown"]}
        placeholder={placeholder}
        rows={rows}
        disabled={disabled}
      />
      <div className="astw:flex astw:items-center astw:justify-between astw:gap-2">
        <div className="astw:flex astw:min-w-0 astw:items-center astw:gap-2">
          {attachmentsEnabled ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={t("aiChatAttachFiles")}
              disabled={disabled}
              onClick={() => fileInputRef.current?.click()}
            >
              <Paperclip className="astw:size-4" aria-hidden />
            </Button>
          ) : null}
          {composerActions}
        </div>
        <div className="astw:shrink-0">
          <SubmitControl busy={busy} canSubmit={canSubmit} onStop={onStop} />
        </div>
      </div>
    </form>
  );
}

export { Composer, type ComposerProps };
