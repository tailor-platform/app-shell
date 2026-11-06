import { useMemo, type ReactNode } from "react";
import type { SelectOption } from "@/types/collection";
import { ChoiceEditor } from "@/components/internals/table-core/editors/choice";
import { toTextValue } from "@/components/internals/table-core/input-values";
import { useDataTableT } from "../../i18n";
import { useCellEditSession } from "../use-session";
import {
  EditableCellFrame,
  useCellValue,
  useNavigationRef,
  type DataTableEditableCellProps,
} from "./shared";

export type ChoiceEditPolicy = {
  options: readonly SelectOption[];
  renderOption: (item: { value: string; label: string }) => ReactNode;
};
type ChoiceDraft = { value: string | null; label: string; notified?: boolean };

/** DataTable owns callback ordering/rollback; the core owns search and dropdown interaction. */
export function ChoiceEditCell<TRow extends Record<string, unknown>>({
  row,
  col,
  rowKey,
  colKey,
  label,
  align,
  navigation,
  cellProps,
  tooltipLabel,
  display: displayValue,
  icon,
  options: choices,
  renderOption,
}: DataTableEditableCellProps<TRow> & ChoiceEditPolicy) {
  const t = useDataTableT();
  const session = useCellEditSession<ChoiceDraft>(col.edit?.error !== false);
  const { state } = session;
  const { current, display, change, commit, callbackError, containsErrorTarget } = useCellValue(
    row,
    col,
    state.status === "failed" ? state : undefined,
    displayValue,
  );
  const register = useNavigationRef<HTMLInputElement>(navigation, rowKey, colKey);
  const value = toTextValue(current);
  const noneLabel = t("editNone");
  const choicesKey = (choices ?? []).map((c) => `${c.value}\u0000${c.label}`).join("\u0001");
  // A consumer rebuilding definitions must not invalidate an active search/highlight.
  const options = useMemo(
    () => (choices ?? []).map((c) => ({ value: c.value, label: String(c.label) })),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- choicesKey captures choices by content.
    [choicesKey],
  );
  const selected = options.find((item) => item.value === value) ?? {
    value,
    label: value ?? noneLabel,
  };
  const editing = state.status !== "idle";
  const activeChoice = state.status === "idle" ? selected : state.draft;
  const begin = () => {
    if (session.getState().status === "idle") session.begin(selected);
  };
  const cancelEditing = () => {
    const active = session.getState();
    session.cancel(
      active.status !== "idle" && active.draft.notified && active.draft.value !== value
        ? () => change(value)
        : undefined,
    );
  };
  const leaveEditor = () => {
    const active = session.getState();
    if (active.status !== "failed" && active.status !== "confirming") cancelEditing();
  };
  const pick = (next: string | number | null) => {
    if (typeof next === "number") throw new Error("DataTable choices must be strings or null");
    const active = session.getState();
    if (active.status === "confirming" && active.draft.value === next)
      return session.confirmAsync(() => undefined);
    session.change(
      {
        value: next,
        label: options.find((item) => item.value === next)?.label ?? next ?? noneLabel,
        notified: next !== value,
      },
      next !== value ? () => change(next) : undefined,
    );
    return session.confirmAsync(() => (next !== value ? commit(next) : undefined));
  };
  return (
    <EditableCellFrame
      cellProps={cellProps}
      display={display}
      truncate={col.truncate}
      hideDisplay={editing ? "focused" : "forced-colors"}
      icon={icon}
      tooltipLabel={tooltipLabel}
      editing={editing}
      callbackError={callbackError}
      label={label}
      onEditorLeave={leaveEditor}
      onEditorCancel={cancelEditing}
      getFailure={session.getFailure}
      confirming={state.status === "confirming"}
    >
      <ChoiceEditor
        value={activeChoice.value}
        row={row}
        config={{ options }}
        ariaLabel={label}
        editing={editing}
        inputRef={register}
        inputClassName={align === "right" ? "astw:text-right" : undefined}
        invalid={!!callbackError}
        describedBy={callbackError?.id}
        containsErrorTarget={containsErrorTarget}
        cancelToken={session.getCancellationRevision()}
        nullOptionLabel={noneLabel}
        emptyLabel={t("editNoMatches")}
        onBegin={begin}
        onFocus={begin}
        onLeave={leaveEditor}
        onCancel={cancelEditing}
        onCommit={pick}
        onQueryChange={() => {
          const active = session.getState();
          session.change(active.status === "idle" ? selected : active.draft);
        }}
        confirmOnTab
        onTab={(event) => {
          if (navigation.move({ rowKey, colKey }, event.shiftKey ? "prev" : "next"))
            event.preventDefault();
        }}
        retry={
          state.status === "failed" && state.source === "commit"
            ? () =>
                session.confirmAsync(() =>
                  state.draft.value !== value ? commit(state.draft.value) : undefined,
                )
            : undefined
        }
        renderOption={(item) => {
          if (item.value === null)
            return <span className="astw:text-muted-foreground">{item.label}</span>;
          return renderOption({ value: String(item.value), label: item.label });
        }}
      />
    </EditableCellFrame>
  );
}
