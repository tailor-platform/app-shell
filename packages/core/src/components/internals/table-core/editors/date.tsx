import { useLayoutEffect, useRef, useState } from "react";
import type { Popover } from "@base-ui/react/popover";
import { parseDate, type CalendarDate } from "@internationalized/date";
import { defineI18nLabels } from "@/hooks/i18n";
import { CELL_ERROR_CLASS_NAME } from "../cell-styles";
import { CalendarControl } from "./calendar-control";

const labels = defineI18nLabels({ en: { clear: "Clear date" }, ja: { clear: "日付をクリア" } });

export interface DateEditorProps {
  value: string | null | undefined;
  ariaLabel: string;
  invalid?: boolean;
  describedBy?: string;
  min?: string;
  max?: string;
  onCommit: (value: string | null) => void;
  onCancel: () => void;
  onBegin?: () => void;
  cancelToken?: number;
  containsErrorTarget?: (target: EventTarget | null) => boolean;
}

function selectedDay(value: string | null | undefined): CalendarDate | undefined {
  if (!value) return undefined;
  try {
    return parseDate(value);
  } catch {
    // Invalid consumer data remains unchanged until an explicit selection or Clear.
    return undefined;
  }
}

/** Date-only adoption; the shared control never converts dates through an instant. */
export function DateEditor({
  value,
  ariaLabel,
  invalid,
  describedBy,
  min,
  max,
  onCommit,
  onCancel,
  onBegin,
  cancelToken,
  containsErrorTarget,
}: DateEditorProps) {
  const t = labels.useT();
  const [open, setOpen] = useState(false);
  const openRef = useRef(false);
  const previousCancel = useRef(cancelToken);
  useLayoutEffect(() => {
    if (previousCancel.current === cancelToken) return;
    previousCancel.current = cancelToken;
    openRef.current = false;
    setOpen(false);
  }, [cancelToken]);
  const minValue = min ? parseDate(min) : undefined;
  const maxValue = max ? parseDate(max) : undefined;
  function cancel() {
    if (!openRef.current) return;
    openRef.current = false;
    setOpen(false);
    onCancel();
  }
  function confirm(next: CalendarDate | null) {
    if (
      next &&
      ((minValue && next.compare(minValue) < 0) || (maxValue && next.compare(maxValue) > 0))
    )
      return;
    // Close before adoption so a resulting focus-out cannot cancel a confirmed edit.
    openRef.current = false;
    setOpen(false);
    onCommit(next?.toString() ?? null);
  }
  function handleOpenChange(next: boolean, details?: Popover.Root.ChangeEventDetails) {
    if (
      !next &&
      details &&
      (containsErrorTarget?.(details.event.target) ||
        ("relatedTarget" in details.event &&
          containsErrorTarget?.(details.event.relatedTarget as EventTarget | null)))
    ) {
      details.cancel();
      return;
    }
    if (!next) {
      cancel();
      return;
    }
    if (!openRef.current) {
      openRef.current = true;
      setOpen(true);
      onBegin?.();
    }
  }
  return (
    <CalendarControl
      open={open}
      onOpenChange={handleOpenChange}
      value={selectedDay(value)}
      minValue={minValue}
      maxValue={maxValue}
      ariaLabel={ariaLabel}
      onChange={confirm}
      popupSlot="table-cell-calendar"
      clearLabel={t("clear")}
      onClear={() => confirm(null)}
      footerClassName="astw:justify-end"
      triggerProps={{
        "aria-label": value ? `${ariaLabel}, ${value}` : ariaLabel,
        "aria-invalid": invalid || undefined,
        "aria-describedby": describedBy,
        "aria-keyshortcuts": invalid ? "Alt+ArrowDown" : undefined,
        className: invalid ? CELL_ERROR_CLASS_NAME : undefined,
      }}
    />
  );
}
