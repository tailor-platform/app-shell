import { useState, type KeyboardEvent } from "react";
import type { Popover } from "@base-ui/react/popover";
import type { CalendarDate } from "@internationalized/date";
import { useTimeZone } from "@/contexts/appshell-context";
import { CalendarControl } from "@/components/internals/table-core/editors/calendar-control";
import { CELL_ERROR_CLASS_NAME } from "@/components/internals/table-core/cell-styles";
import type { DateTimeDraft } from "../../types";
import { sameDate, toCalendarDate, toIsoDateTime, toTimeText } from "../../cell-values";
import { useDataTableT } from "../../i18n";
import type { CellEditNavigation } from "../use-navigation";
import { useCellEditSession } from "../use-session";
import {
  EditableCellFrame,
  useCellValue,
  useNavigationRef,
  type DataTableEditableCellProps,
} from "./shared";

function tabBetweenCells(
  event: KeyboardEvent<HTMLElement>,
  open: boolean,
  navigation: CellEditNavigation,
  from: { rowKey: string; colKey: string },
) {
  if (event.key !== "Tab" || open) return;
  if (navigation.move(from, event.shiftKey ? "prev" : "next")) event.preventDefault();
}

/** DataTable owns datetime conversion, draft notifications and callback confirmation. */
export function DateEditCell<TRow extends Record<string, unknown>>({
  row,
  col,
  rowKey,
  colKey,
  label,
  navigation,
  cellProps,
  tooltipLabel,
  display: displayValue,
  icon,
  withTime,
}: DataTableEditableCellProps<TRow> & { withTime: boolean }) {
  const t = useDataTableT();
  const { value: timeZone } = useTimeZone();
  const session = useCellEditSession<DateTimeDraft>(col.edit?.error !== false);
  const { state } = session;
  const { current, display, change, commit, callbackError, containsErrorTarget } = useCellValue(
    row,
    col,
    state.status === "failed" ? state : undefined,
    displayValue,
  );
  const register = useNavigationRef<HTMLButtonElement>(navigation, rowKey, colKey);
  const baseline: DateTimeDraft = {
    day: toCalendarDate(current, timeZone)?.toString() ?? null,
    time: toTimeText(current, timeZone) || null,
  };
  const [open, setOpen] = useState(false);
  const differs = (a: DateTimeDraft, b: DateTimeDraft) =>
    a.day !== b.day || (withTime && a.time !== b.time);
  const notifyDraft = (next: DateTimeDraft) => change(withTime ? { ...next } : next.day);
  const setDraft = (next: DateTimeDraft) => {
    const active = session.getState();
    const previous = active.status === "idle" ? baseline : active.draft;
    if (!differs(previous, next)) {
      session.begin(next);
      return;
    }
    session.change(next, () => notifyDraft(next));
  };
  const cancelEditing = () => {
    const active = session.getState();
    session.cancel(
      active.status !== "idle" && differs(active.draft, baseline)
        ? () => notifyDraft(baseline)
        : undefined,
    );
    setOpen(false);
  };
  const finish = (next: string | null) => {
    session.confirm(
      () => (sameDate(next, current, withTime, timeZone) ? undefined : commit(next)),
      () => setOpen(false),
    );
  };
  const activeDraft = state.status === "idle" ? baseline : state.draft;
  const pickedDay = toCalendarDate(activeDraft.day, timeZone);
  const timestamp =
    withTime && pickedDay && activeDraft.time
      ? toIsoDateTime(pickedDay, activeDraft.time, timeZone)
      : undefined;
  const draftDisplay = withTime
    ? `${activeDraft.day ?? "—"} ${activeDraft.time ?? "—"}`
    : (activeDraft.day ?? "—");
  const visibleDisplay = state.status === "idle" ? display : draftDisplay;
  const accessibleName = typeof visibleDisplay === "string" ? `${label}, ${visibleDisplay}` : label;
  const handleOpenChange = (next: boolean, details?: Popover.Root.ChangeEventDetails) => {
    if (
      !next &&
      details &&
      (containsErrorTarget(details.event.target) ||
        ("relatedTarget" in details.event &&
          containsErrorTarget(details.event.relatedTarget as EventTarget | null)))
    ) {
      details.cancel();
      return;
    }
    if (next) session.begin(baseline);
    else {
      const active = session.getState();
      if (
        details?.reason === "escape-key" ||
        (active.status !== "failed" && active.status !== "confirming")
      ) {
        cancelEditing();
        return;
      }
    }
    setOpen(next);
  };
  const handlePick = (day: CalendarDate) => {
    const active = session.getState();
    setDraft({ ...(active.status === "idle" ? baseline : active.draft), day: day.toString() });
    if (!withTime) finish(day.toString());
  };
  return (
    <EditableCellFrame
      cellProps={cellProps}
      display={visibleDisplay}
      truncate={col.truncate}
      icon={icon}
      tooltipLabel={tooltipLabel}
      editing={open}
      callbackError={callbackError}
      label={label}
      onEditorCancel={cancelEditing}
      getFailure={session.getFailure}
      confirming={state.status === "confirming"}
    >
      <CalendarControl
        open={open}
        onOpenChange={handleOpenChange}
        value={pickedDay}
        ariaLabel={label}
        onChange={handlePick}
        popupSlot="data-table-cell-calendar"
        clearLabel={t("editClear")}
        onClear={() => {
          setDraft({ day: null, time: null });
          finish(null);
        }}
        triggerProps={{
          ref: register,
          "aria-label": accessibleName,
          "aria-invalid": callbackError ? true : undefined,
          "aria-describedby": callbackError?.id,
          "aria-keyshortcuts": callbackError ? "Alt+ArrowDown" : undefined,
          className: callbackError ? CELL_ERROR_CLASS_NAME : undefined,
          onKeyDown: (event) => {
            if (event.key === "Escape" && !open && session.getState().status !== "idle") {
              event.preventDefault();
              event.stopPropagation();
              cancelEditing();
              return;
            }
            tabBetweenCells(event, open, navigation, { rowKey, colKey });
          },
        }}
        time={
          withTime
            ? {
                label: `${label} (${t("chooseTime")})`,
                value: activeDraft.time ?? "",
                onChange: (text) => setDraft({ ...activeDraft, time: text || null }),
              }
            : undefined
        }
        confirmation={
          withTime
            ? {
                label: t("editDone"),
                disabled: timestamp === undefined,
                onClick: () => {
                  if (timestamp !== undefined) finish(timestamp);
                },
              }
            : undefined
        }
      />
    </EditableCellFrame>
  );
}
