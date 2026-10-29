import {
  useId,
  useRef,
  useState,
  type ChangeEvent,
  type FocusEvent,
  type KeyboardEvent,
  type MouseEvent,
  type TouchEvent,
} from "react";
import { cn } from "@/lib/utils";
import { isComposing } from "@/lib/is-composing";
import { Input } from "@/components/input";
import { Tooltip } from "@/components/tooltip";
import {
  normalizeNumberText,
  parseNumberText,
  sameNumber,
  toNumberEditText,
  toNumberValue,
  toTextValue,
} from "../../cell-values";
import { useDataTableT } from "../../i18n";
import { useCellEditSession } from "../use-session";
import {
  CELL_ERROR_CLASS_NAME,
  ICON_INPUT_CLASS_NAME,
  INPUT_CLASS_NAME,
  EditableCellFrame,
  useCellValue,
  useNavigationRef,
  type DataTableEditableCellProps,
} from "./shared";

export function TypingEditCell<TRow extends Record<string, unknown>>({
  row,
  col,
  rowKey,
  colKey,
  label,
  align,
  navigation,
  cellProps,
  tooltipLabel,
}: DataTableEditableCellProps<TRow>) {
  const t = useDataTableT();
  const errorId = useId();
  const session = useCellEditSession<string>(col.edit?.error !== false);
  const { state } = session;
  const failure = state.status === "failed" ? state : undefined;
  const { current, display, change, commit, callbackError, containsErrorTarget } = useCellValue(
    row,
    col,
    failure,
  );
  const register = useNavigationRef<HTMLInputElement>(navigation, rowKey, colKey);
  const editing = state.status !== "idle";
  const [focused, setFocused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const composingRef = useRef(false);
  const selectOnMouseUpRef = useRef(false);

  const numeric = col.type === "number" || col.type === "money";
  const baselineText = numeric
    ? toNumberEditText(toNumberValue(current))
    : (toTextValue(current) ?? "");
  const text = state.status === "idle" ? baselineText : state.draft;
  const message = failure?.source === "parse" ? t("editNotANumber") : undefined;

  const revert = (notify = false) => {
    const previous = session.getState();
    session.cancel(
      notify && previous.status !== "idle" && previous.draft !== baselineText
        ? () => change(baselineText)
        : undefined,
    );
  };

  const commitDraft = (): boolean => {
    const active = session.getState();
    if (active.status === "idle" || active.status === "confirming") return true;
    const draftText = active.draft;
    const value = numeric
      ? parseNumberText(normalizeNumberText(draftText))
      : toTextValue(draftText);
    if (value === undefined) {
      session.fail(undefined, "parse");
      return false;
    }
    const unchanged =
      draftText === baselineText ||
      (numeric
        ? sameNumber(value as number | null, toNumberValue(current))
        : value === toTextValue(current));
    session.confirm(() => (unchanged ? undefined : commit(value)));
    return true;
  };

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const next = event.target.value;
    const active = session.getState();
    const previous = active.status === "idle" ? baselineText : active.draft;
    if (next !== previous) session.change(next, () => change(next));
  };

  // Keep IME output raw until cell confirmation, just like other draft changes.
  const handleCompositionEnd = () => {
    composingRef.current = false;
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    // While an IME is composing, Enter confirms the conversion, not the cell.
    if (isComposing(event.nativeEvent, composingRef.current)) return;
    const from = { rowKey, colKey };
    switch (event.key) {
      case "Enter":
        event.preventDefault();
        if (session.getState().status === "idle") {
          session.begin(baselineText);
          event.currentTarget.select();
        } else {
          commitDraft();
        }
        return;
      case "Tab": {
        const active = session.getState();
        const failedCommit = active.status === "failed" && active.source === "commit";
        if (!failedCommit && !commitDraft()) {
          event.preventDefault();
          return;
        }
        // At the first / last editable cell, native Tab leaves the table.
        if (navigation.move(from, event.shiftKey ? "prev" : "next")) event.preventDefault();
        return;
      }
      case "Escape":
        if (session.getState().status === "idle") return;
        // Handled here, so an enclosing dialog doesn't also close on this Esc.
        event.preventDefault();
        event.stopPropagation();
        revert(true);
        return;
    }
  };

  const handleFocus = (event: FocusEvent<HTMLInputElement>) => {
    const withinCell = focused || containsErrorTarget(event.relatedTarget);
    setFocused(true);
    if (withinCell) return;
    session.begin(baselineText);
    event.currentTarget.select();
  };

  const handleBlur = () => {
    setFocused(false);
    const active = session.getState();
    if (active.status === "failed") {
      // Preserve callback failures; malformed numeric blur still cancels the edit.
      if (active.source === "parse") revert(true);
      return;
    }
    if (!commitDraft()) revert(true);
  };

  const handleMouseDown = (event: MouseEvent<HTMLInputElement>) => {
    if (editing) return;
    // A right-click on a resting cell opens DataTable's cell menu instead of editing.
    if (event.button === 2) {
      event.preventDefault();
      return;
    }
    session.begin(baselineText);
    if (focused) event.currentTarget.select();
    selectOnMouseUpRef.current = true;
  };

  // The click that focuses the cell keeps the select-all from `handleFocus`;
  // otherwise mouseup would collapse it to a caret.
  const handleMouseUp = (event: MouseEvent<HTMLInputElement>) => {
    if (!selectOnMouseUpRef.current) return;
    selectOnMouseUpRef.current = false;
    event.preventDefault();
  };

  // While editing, the browser's own menu and long-press (paste, select) win
  // over DataTable's cell menu.
  const stopWhileEditing = (event: MouseEvent | TouchEvent) => {
    if (editing) event.stopPropagation();
  };

  const hint = t("editRevertHint");

  return (
    <EditableCellFrame
      cellProps={cellProps}
      display={display}
      truncate={col.truncate}
      hideDisplay={editing ? "focused" : "forced-colors"}
      tooltipLabel={tooltipLabel}
      editing={editing}
      callbackError={callbackError}
      label={label}
      onEditorLeave={handleBlur}
      onEditorCancel={() => revert(true)}
      getFailure={session.getFailure}
      confirming={state.status === "confirming"}
    >
      {message !== undefined && (
        <span id={errorId} className="astw:sr-only">
          {message}. {hint}
        </span>
      )}
      <Tooltip.Root open={message !== undefined && (focused || hovered)}>
        <Tooltip.Trigger
          render={
            <Input
              ref={register}
              type="text"
              value={text}
              readOnly={!editing}
              aria-label={label}
              aria-invalid={message !== undefined || callbackError ? true : undefined}
              aria-describedby={message !== undefined ? errorId : callbackError?.id}
              aria-keyshortcuts={callbackError ? "Alt+ArrowDown" : undefined}
              inputMode={numeric ? "text" : undefined}
              enterKeyHint="done"
              autoComplete="off"
              spellCheck={numeric ? false : undefined}
              className={cn(
                INPUT_CLASS_NAME,
                !editing && "astw:text-transparent",
                numeric && "astw:tabular-nums",
                align === "right" && "astw:text-right",
                (message !== undefined || callbackError) && CELL_ERROR_CLASS_NAME,
                callbackError && ICON_INPUT_CLASS_NAME,
              )}
              style={editing ? { WebkitTouchCallout: "default" } : undefined}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              onFocus={handleFocus}
              onCompositionStart={() => {
                composingRef.current = true;
              }}
              onCompositionEnd={handleCompositionEnd}
              onMouseDown={handleMouseDown}
              onMouseUp={handleMouseUp}
              onPointerEnter={() => setHovered(true)}
              onPointerLeave={() => setHovered(false)}
              onContextMenu={stopWhileEditing}
              onTouchStart={stopWhileEditing}
            />
          }
        />
        <Tooltip.Content>
          {message}
          <span className="astw:block astw:opacity-70">{hint}</span>
        </Tooltip.Content>
      </Tooltip.Root>
    </EditableCellFrame>
  );
}
