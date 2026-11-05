import type { ComponentProps } from "react";
import { Popover } from "@base-ui/react/popover";
import type { CalendarDate } from "@internationalized/date";
import { Button } from "@/components/button";
import { Calendar } from "@/components/calendar";
import { Input } from "@/components/input";
import { cn } from "@/lib/utils";
import { CELL_FOCUS_CLASS_NAME, OVERLAY_CLASS_NAME, POPUP_CLASS_NAME } from "../cell-styles";

export interface CalendarControlProps {
  open: boolean;
  onOpenChange: (open: boolean, details?: Popover.Root.ChangeEventDetails) => void;
  value: CalendarDate | null | undefined;
  minValue?: CalendarDate;
  maxValue?: CalendarDate;
  ariaLabel: string;
  onChange: (day: CalendarDate) => void;
  triggerProps?: ComponentProps<typeof Popover.Trigger>;
  popupSlot: string;
  clearLabel: string;
  onClear: () => void;
  footerClassName?: string;
  time?: { label: string; value: string; onChange: (text: string) => void };
  confirmation?: { label: string; disabled: boolean; onClick: () => void };
}

/** Calendar UI only; owners decide date/datetime conversion and adoption. */
export function CalendarControl({
  open,
  onOpenChange,
  value,
  minValue,
  maxValue,
  ariaLabel,
  onChange,
  triggerProps,
  popupSlot,
  clearLabel,
  onClear,
  footerClassName,
  time,
  confirmation,
}: CalendarControlProps) {
  return (
    <Popover.Root open={open} onOpenChange={onOpenChange}>
      <Popover.Trigger
        {...triggerProps}
        className={cn(
          OVERLAY_CLASS_NAME,
          CELL_FOCUS_CLASS_NAME,
          "astw:cursor-pointer astw:data-popup-open:ring-2 astw:data-popup-open:ring-inset astw:data-popup-open:ring-primary",
          triggerProps?.className,
        )}
        onKeyDown={(event) => {
          triggerProps?.onKeyDown?.(event);
          if (!event.defaultPrevented && event.key === "ArrowDown" && !open) {
            event.preventDefault();
            onOpenChange(true);
          }
        }}
      />
      <Popover.Portal style={{ position: "relative", zIndex: "var(--z-popup)" }}>
        <Popover.Positioner sideOffset={4} side="bottom" align="start">
          <Popover.Popup
            data-slot={popupSlot}
            className={POPUP_CLASS_NAME}
            onContextMenu={(event) => event.stopPropagation()}
            onTouchStart={(event) => event.stopPropagation()}
            onKeyDown={(event) => {
              if (event.key === "Escape") event.stopPropagation();
            }}
          >
            <Calendar
              aria-label={ariaLabel}
              value={value}
              defaultFocusedValue={value ?? undefined}
              minValue={minValue}
              maxValue={maxValue}
              onChange={onChange}
            />
            {time && (
              <Input
                type="time"
                aria-label={time.label}
                value={time.value}
                onChange={(event) => time.onChange(event.target.value)}
                className="astw:h-8 astw:text-body-md"
              />
            )}
            <div className={cn("astw:flex astw:justify-between astw:gap-2", footerClassName)}>
              <Button variant="ghost" size="sm" onClick={onClear}>
                {clearLabel}
              </Button>
              {confirmation && (
                <Button size="sm" disabled={confirmation.disabled} onClick={confirmation.onClick}>
                  {confirmation.label}
                </Button>
              )}
            </div>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
