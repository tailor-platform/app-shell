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

import { Button } from "@/components/button";
import { Textarea } from "@/components/textarea";
import { useT } from "@/i18n-labels";
import { cn } from "@/lib/utils";
import { useAIChatContext } from "./ai-chat-context";
import { AttachmentChip, type AIChatAttachment } from "./attachment-chip";

type AIChatComposerProps = {
  /** Called with the trimmed prompt and any staged attachments when the composer submits. */
  onSubmit: (message: string, attachments: AIChatAttachment[]) => void;
  /** Called from the Stop button while the chat's `status` is `"submitted"` or `"streaming"`. Omit to show a plain busy state with no Stop affordance. */
  onStop?: () => void;
  /** Controlled draft. Cleared (via `onValueChange("")`) after a successful submit. */
  value?: string;
  /** Uncontrolled draft's initial value. */
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  /** Disables the composer. The transcript above it is unaffected. */
  disabled?: boolean;
  /**
   * Enter submits; Shift+Enter inserts a newline. IME-safe: Enter during
   * kana→kanji conversion confirms the candidate rather than submitting.
   * @default true
   */
  submitOnEnter?: boolean;
  /**
   * Show the attach-file button and staged-attachment chips.
   * @default false
   */
  attachments?: boolean;
  /** Accepted file types for the hidden file input, when `attachments` is enabled. */
  accept?: string;
  /** @default true */
  multiple?: boolean;
  /** Open slot on the action row, left of the attach button — a visibility toggle, a model picker, a template select. */
  actions?: ReactNode;
  className?: string;
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
 * The chat's fixed footer: a `Textarea` body over one action row, following
 * the `form/composer` pattern — left side open for `actions` (plus the attach
 * button, when enabled), right side fixed to a single submit control. Enter
 * submits and is IME-safe; Shift+Enter inserts a newline. The submit button
 * becomes Stop while the chat's `status` is busy.
 *
 * Reads `status` from the surrounding `AIChat`.
 */
function Composer({
  onSubmit,
  onStop,
  value,
  defaultValue = "",
  onValueChange,
  placeholder,
  disabled = false,
  submitOnEnter = true,
  attachments: attachmentsEnabled = false,
  accept,
  multiple = true,
  actions,
  className,
}: AIChatComposerProps) {
  const { status } = useAIChatContext("AIChat.Composer");
  const t = useT();

  const [internalValue, setInternalValue] = useState(defaultValue);
  const draft = value ?? internalValue;
  const setDraft = (next: string) => {
    if (value === undefined) setInternalValue(next);
    onValueChange?.(next);
  };

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
  const canSubmit = !disabled && !busy && draft.trim().length > 0;

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
    setDraft("");
    onSubmit(draft.trim(), snapshot);
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
      data-slot="ai-chat-composer"
      onSubmit={handleSubmit}
      className={cn(
        "astw:flex astw:shrink-0 astw:flex-col astw:gap-2 astw:p-3 astw:pt-0",
        className,
      )}
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
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        // `Field.Control` types its handlers against its default `<input>`
        // tag; the element here is a `<textarea>`. Runtime is correct.
        onKeyDown={handleKeyDown as unknown as ComponentProps<typeof Textarea>["onKeyDown"]}
        placeholder={placeholder}
        rows={2}
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
          {actions}
        </div>
        <div className="astw:shrink-0">
          <SubmitControl busy={busy} canSubmit={canSubmit} onStop={onStop} />
        </div>
      </div>
    </form>
  );
}

export { Composer, type AIChatComposerProps };
