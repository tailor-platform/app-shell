import { useState, type KeyboardEvent } from "react";
import { Popover } from "@base-ui/react/popover";
import type { CalendarDate } from "@internationalized/date";
import { CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTimeZone } from "@/contexts/appshell-context";
import { Button } from "@/components/button";
import { Calendar } from "@/components/calendar";
import { Input } from "@/components/input";
import type { DateTimeDraft } from "../../types";
import { sameDate, toCalendarDate, toIsoDateTime, toTimeText } from "../../cell-values";
import { useDataTableT } from "../../i18n";
import type { CellEditNavigation } from "../use-navigation";
import { useCellEditSession } from "../use-session";
import {
  OVERLAY_CLASS_NAME,
  CELL_FOCUS_CLASS_NAME,
  CELL_ERROR_CLASS_NAME,
  POPUP_CLASS_NAME,
  EditableCellFrame,
  useCellValue,
  useNavigationRef,
  type EditableColumn,
  type DataTableEditableCellProps,
} from "./shared";

type DateColumn<TRow extends Record<string, unknown>> = Extract<
  EditableColumn<TRow>,
  { type: "date" }
>;

// Date cells: a transparent button over the cell's own display, with a pointer.
const TRIGGER_CLASS_NAME = cn(
  OVERLAY_CLASS_NAME,
  CELL_FOCUS_CLASS_NAME,
  "astw:cursor-pointer",
  "astw:data-popup-open:ring-2 astw:data-popup-open:ring-inset astw:data-popup-open:ring-primary",
);

// Tab / Shift+Tab from a closed calendar moves between editable cells, the
// same way it does from a typing cell.
function tabBetweenCells(
  event: KeyboardEvent<HTMLElement>,
  open: boolean,
  navigation: CellEditNavigation,
  from: { rowKey: string; colKey: string },
) {
  if (event.key !== "Tab" || open) return;
  if (navigation.move(from, event.shiftKey ? "prev" : "next")) event.preventDefault();
}

export function DateEditCell<TRow extends Record<string, unknown>>({
  row,
  col,
  rowKey,
  colKey,
  label,
  navigation,
  cellProps,
  tooltipLabel,
  dateRenderer,
}: DataTableEditableCellProps<TRow, DateColumn<TRow>>) {
  const t = useDataTableT();
  const { value: timeZone } = useTimeZone();
  const withTime = col.typeOptions?.dateFormat === "datetime";
  const session = useCellEditSession<DateTimeDraft>(col.edit?.error !== false);
  const { state } = session;
  const { current, display, change, commit, callbackError, containsErrorTarget } = useCellValue(
    row,
    col,
    state.status === "failed" ? state : undefined,
    dateRenderer,
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
  // The trigger's accessible name carries the date hidden in the visual display.
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
    if (next) {
      session.begin(baseline);
    } else {
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
      icon={<CalendarDays />}
      tooltipLabel={tooltipLabel}
      editing={open}
      callbackError={callbackError}
      label={label}
      onEditorCancel={cancelEditing}
      getFailure={session.getFailure}
      confirming={state.status === "confirming"}
    >
      <Popover.Root open={open} onOpenChange={handleOpenChange}>
        <Popover.Trigger
          ref={register}
          aria-label={accessibleName}
          aria-invalid={callbackError ? true : undefined}
          aria-describedby={callbackError?.id}
          aria-keyshortcuts={callbackError ? "Alt+ArrowDown" : undefined}
          className={cn(TRIGGER_CLASS_NAME, callbackError && CELL_ERROR_CLASS_NAME)}
          onKeyDown={(event) => {
            if (event.key === "Escape" && !open && session.getState().status !== "idle") {
              event.preventDefault();
              event.stopPropagation();
              cancelEditing();
              return;
            }
            if (event.key === "ArrowDown" && !open) {
              event.preventDefault();
              handleOpenChange(true);
              return;
            }
            tabBetweenCells(event, open, navigation, { rowKey, colKey });
          }}
        />
        <Popover.Portal style={{ position: "relative", zIndex: "var(--z-popup)" }}>
          <Popover.Positioner sideOffset={4} side="bottom" align="start">
            <Popover.Popup
              data-slot="data-table-cell-calendar"
              className={POPUP_CLASS_NAME}
              onContextMenu={(event) => event.stopPropagation()}
              onTouchStart={(event) => event.stopPropagation()}
            >
              <Calendar
                aria-label={label}
                value={pickedDay}
                defaultFocusedValue={pickedDay ?? undefined}
                onChange={handlePick}
              />
              {withTime && (
                <Input
                  type="time"
                  aria-label={`${label} (${t("chooseTime")})`}
                  value={activeDraft.time ?? ""}
                  onChange={(event) =>
                    setDraft({
                      ...activeDraft,
                      time: event.target.value || null,
                    })
                  }
                  className="astw:h-8 astw:text-body-md"
                />
              )}
              <div className="astw:flex astw:justify-between astw:gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setDraft({ day: null, time: null });
                    finish(null);
                  }}
                >
                  {t("editClear")}
                </Button>
                {withTime && (
                  <Button
                    size="sm"
                    disabled={timestamp === undefined}
                    onClick={() => {
                      if (timestamp !== undefined) finish(timestamp);
                    }}
                  >
                    {t("editDone")}
                  </Button>
                )}
              </div>
            </Popover.Popup>
          </Popover.Positioner>
        </Popover.Portal>
      </Popover.Root>
    </EditableCellFrame>
  );
}
