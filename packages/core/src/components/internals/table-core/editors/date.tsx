import { useLayoutEffect, useRef, useState } from "react";
import { Popover } from "@base-ui/react/popover";
import { parseDate, type CalendarDate } from "@internationalized/date";
import { Button } from "@/components/button";
import { Calendar } from "@/components/calendar";
import { defineI18nLabels } from "@/hooks/i18n";
import { cn } from "@/lib/utils";
import {
  CELL_ERROR_CLASS_NAME,
  CELL_FOCUS_CLASS_NAME,
  OVERLAY_CLASS_NAME,
  POPUP_CLASS_NAME,
} from "../cell-styles";

const labels = defineI18nLabels({
  en: { clear: "Clear date" },
  ja: { clear: "日付をクリア" },
});

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

/** Calendar dates are committed as dates, never converted through an instant/timezone. */
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
  const day = selectedDay(value);
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
    // Mark closed before adoption so a resulting focus-out cannot cancel the confirmed edit.
    openRef.current = false;
    setOpen(false);
    onCommit(next?.toString() ?? null);
  }
  function handleOpenChange(next: boolean, details: Popover.Root.ChangeEventDetails) {
    if (
      !next &&
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
    <Popover.Root open={open} onOpenChange={handleOpenChange}>
      <Popover.Trigger
        aria-label={value ? `${ariaLabel}, ${value}` : ariaLabel}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        aria-keyshortcuts={invalid ? "Alt+ArrowDown" : undefined}
        className={cn(
          OVERLAY_CLASS_NAME,
          CELL_FOCUS_CLASS_NAME,
          "astw:cursor-pointer astw:data-popup-open:ring-2 astw:data-popup-open:ring-inset astw:data-popup-open:ring-primary",
          invalid && CELL_ERROR_CLASS_NAME,
        )}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" && !openRef.current) {
            event.preventDefault();
            openRef.current = true;
            setOpen(true);
            onBegin?.();
          }
        }}
      />
      <Popover.Portal style={{ position: "relative", zIndex: "var(--z-popup)" }}>
        <Popover.Positioner sideOffset={4} side="bottom" align="start">
          <Popover.Popup
            data-slot="table-cell-calendar"
            className={POPUP_CLASS_NAME}
            onContextMenu={(event) => event.stopPropagation()}
            onTouchStart={(event) => event.stopPropagation()}
            onKeyDown={(event) => {
              if (event.key === "Escape") event.stopPropagation();
            }}
          >
            <Calendar
              aria-label={ariaLabel}
              value={day}
              defaultFocusedValue={day}
              minValue={minValue}
              maxValue={maxValue}
              onChange={(next) => confirm(next)}
            />
            <div className="astw:flex astw:justify-end">
              <Button variant="ghost" size="sm" onClick={() => confirm(null)}>
                {t("clear")}
              </Button>
            </div>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
