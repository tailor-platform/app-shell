import { useId } from "react";
import { TypingEditor } from "@/components/internals/table-core/editors/typing";
import {
  normalizeNumberText,
  parseNumberText,
  sameNumber,
  toNumberEditText,
  toNumberValue,
  toTextValue,
} from "@/components/internals/table-core/input-values";
import { useDataTableT } from "../../i18n";
import { useCellEditSession } from "../use-session";
import {
  EditableCellFrame,
  useCellValue,
  useNavigationRef,
  type DataTableEditableCellProps,
} from "./shared";

/** DataTable owns raw draft notifications, equality and callback confirmation. */
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
  const handleBlur = () => {
    const active = session.getState();
    if (active.status === "failed") {
      // Callback failures stay visible; malformed numeric blur cancels the edit.
      if (active.source === "parse") revert(true);
      return;
    }
    if (!commitDraft()) revert(true);
  };
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
      <TypingEditor
        value={text}
        editing={editing}
        ariaLabel={label}
        numeric={numeric}
        align={align}
        inputRef={register}
        inputMode={numeric ? "text" : undefined}
        readOnly={!editing}
        invalid={!!callbackError}
        describedBy={callbackError?.id}
        iconSpace={!!callbackError}
        containsErrorTarget={containsErrorTarget}
        parseError={
          message !== undefined ? { id: errorId, message, hint: t("editRevertHint") } : undefined
        }
        onBegin={() => session.begin(baselineText)}
        onChange={(next) => {
          const active = session.getState();
          const previous = active.status === "idle" ? baselineText : active.draft;
          if (next !== previous) session.change(next, () => change(next));
        }}
        onCommit={commitDraft}
        onCancel={() => revert(true)}
        onTab={(event) => {
          const active = session.getState();
          const failedCommit = active.status === "failed" && active.source === "commit";
          if (!failedCommit && !commitDraft()) {
            event.preventDefault();
            return;
          }
          if (navigation.move({ rowKey, colKey }, event.shiftKey ? "prev" : "next"))
            event.preventDefault();
        }}
      />
    </EditableCellFrame>
  );
}
