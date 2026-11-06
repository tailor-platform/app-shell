import { useRef, useState, type ComponentProps, type KeyboardEvent, type Ref } from "react";
import { Input } from "@/components/input";
import { Tooltip } from "@/components/tooltip";
import { cn } from "@/lib/utils";
import { isComposing } from "@/lib/is-composing";
import { CELL_ERROR_CLASS_NAME, ICON_INPUT_CLASS_NAME, INPUT_CLASS_NAME } from "../cell-styles";

export interface TypingEditorProps {
  value: string;
  editing: boolean;
  ariaLabel: string;
  numeric?: boolean;
  align?: "left" | "center" | "right";
  inputRef?: Ref<HTMLInputElement>;
  inputMode?: ComponentProps<typeof Input>["inputMode"];
  readOnly?: boolean;
  invalid?: boolean;
  describedBy?: string;
  iconSpace?: boolean;
  parseError?: { id: string; message: string; hint: string };
  containsErrorTarget?: (target: EventTarget | null) => boolean;
  onBegin: () => void;
  onChange: (text: string) => void;
  onCommit: () => void;
  onCancel: () => void;
  onTab: (event: KeyboardEvent<HTMLInputElement>) => void;
}

/** Shared input/IME/focus mechanics; parsing and confirmation policy belong to the owner. */
export function TypingEditor({
  value,
  editing,
  ariaLabel,
  numeric,
  align,
  inputRef,
  inputMode,
  readOnly,
  invalid,
  describedBy,
  iconSpace,
  parseError,
  containsErrorTarget,
  onBegin,
  onChange,
  onCommit,
  onCancel,
  onTab,
}: TypingEditorProps) {
  const [focused, setFocused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const composing = useRef(false);
  const selectOnMouseUp = useRef(false);
  const input = (
    <Input
      ref={inputRef}
      type="text"
      value={value}
      readOnly={readOnly}
      aria-label={ariaLabel}
      aria-invalid={invalid || parseError ? true : undefined}
      aria-describedby={parseError?.id ?? describedBy}
      aria-keyshortcuts={invalid && !parseError ? "Alt+ArrowDown" : undefined}
      inputMode={inputMode}
      enterKeyHint="done"
      autoComplete="off"
      spellCheck={numeric ? false : undefined}
      className={cn(
        INPUT_CLASS_NAME,
        !editing && "astw:text-transparent",
        numeric && "astw:tabular-nums",
        align === "right" && "astw:text-right",
        (invalid || parseError) && CELL_ERROR_CLASS_NAME,
        iconSpace && ICON_INPUT_CLASS_NAME,
      )}
      style={editing ? { WebkitTouchCallout: "default" } : undefined}
      onChange={(event) => onChange(event.target.value)}
      onKeyDown={(event) => {
        if (isComposing(event.nativeEvent, composing.current)) return;
        if (event.key === "Enter") {
          event.preventDefault();
          if (!editing) {
            onBegin();
            event.currentTarget.select();
          } else onCommit();
        } else if (event.key === "Tab") onTab(event);
        else if (event.key === "Escape" && editing) {
          event.preventDefault();
          event.stopPropagation();
          onCancel();
        }
      }}
      onFocus={(event) => {
        const withinCell = focused || containsErrorTarget?.(event.relatedTarget);
        setFocused(true);
        if (withinCell) return;
        onBegin();
        event.currentTarget.select();
      }}
      onBlur={() => setFocused(false)}
      onCompositionStart={() => {
        composing.current = true;
      }}
      onCompositionEnd={() => {
        composing.current = false;
      }}
      onMouseDown={(event) => {
        if (editing || !readOnly) return;
        if (event.button === 2) {
          event.preventDefault();
          return;
        }
        onBegin();
        if (focused) event.currentTarget.select();
        selectOnMouseUp.current = true;
      }}
      onMouseUp={(event) => {
        if (!selectOnMouseUp.current) return;
        selectOnMouseUp.current = false;
        event.preventDefault();
      }}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      onContextMenu={(event) => {
        if (editing) event.stopPropagation();
      }}
      onTouchStart={(event) => {
        if (editing) event.stopPropagation();
      }}
    />
  );
  return (
    <>
      {parseError && (
        <span id={parseError.id} className="astw:sr-only">
          {parseError.message}. {parseError.hint}
        </span>
      )}
      <Tooltip.Root open={!!parseError && (focused || hovered)}>
        <Tooltip.Trigger render={input} />
        <Tooltip.Content>
          {parseError?.message}
          <span className="astw:block astw:opacity-70">{parseError?.hint}</span>
        </Tooltip.Content>
      </Tooltip.Root>
    </>
  );
}
