import { ArrowUp, Loader2, Square } from "lucide-react";
import {
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

type AIChatComposerProps = {
  /** Called with the trimmed prompt when the composer submits. */
  onSubmit: (message: string) => void;
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
  /** Open slot on the action row — a visibility toggle, a model picker, a template select. */
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

/**
 * The chat's fixed footer: a `Textarea` body over one action row, following
 * the `form/composer` pattern — left side open for `actions`, right side fixed
 * to a single submit control. Enter submits and is IME-safe; Shift+Enter
 * inserts a newline. The submit button becomes Stop while the chat's `status`
 * is busy.
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

  const busy = status === "submitted" || status === "streaming";
  const canSubmit = !disabled && !busy && draft.trim().length > 0;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit) return;
    setDraft("");
    onSubmit(draft.trim());
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
        <div className="astw:flex astw:min-w-0 astw:items-center astw:gap-2">{actions}</div>
        <div className="astw:shrink-0">
          <SubmitControl busy={busy} canSubmit={canSubmit} onStop={onStop} />
        </div>
      </div>
    </form>
  );
}

export { Composer, type AIChatComposerProps };
