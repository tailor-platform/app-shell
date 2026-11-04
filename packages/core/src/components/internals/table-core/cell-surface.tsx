import { useLayoutEffect, useRef, useState, type ComponentProps, type ReactNode } from "react";
import { Popover } from "@base-ui/react/popover";
import { CircleAlert, X } from "lucide-react";
import { Button } from "@/components/button";
import { Table } from "@/components/table";
import { Tooltip } from "@/components/tooltip";
import { cn } from "@/lib/utils";
import type { CellErrorUI, CellSurfaceFailure } from "./cell-error";
import {
  CELL_ERROR_CLASS_NAME,
  CELL_ICON_CLASS_NAME,
  EDITABLE_CELL_CLASS_NAME,
  ICON_SPACE_CLASS_NAME,
  POPUP_CLASS_NAME,
} from "./cell-styles";

export interface CellSurfaceLabels {
  errorHint: string;
  showError: string;
  errorDialog: string;
  closeError: string;
}

export interface EditableCellSurfaceProps {
  cellProps: ComponentProps<typeof Table.Cell>;
  display: ReactNode;
  truncate?: boolean;
  tooltipLabel?: ReactNode;
  editing: boolean;
  /** Immediate checkbox actions retain the tint while their control stays focused. */
  clearTintOnFocus?: boolean;
  callbackError?: CellErrorUI;
  labels: CellSurfaceLabels;
  errorSlot?: string;
  onEditorLeave?: () => void;
  onEditorCancel: () => void;
  getFailure: () => CellSurfaceFailure | undefined;
  confirming: boolean;
  hideDisplay?: "focused" | "forced-colors";
  icon?: ReactNode;
  children: ReactNode;
}

/** Owns exactly one td; adapters supply resolved content, labels and editing policy. */
export function EditableCellSurface({
  cellProps,
  display,
  truncate,
  hideDisplay,
  icon,
  tooltipLabel,
  editing,
  clearTintOnFocus = true,
  callbackError,
  labels,
  errorSlot = "table-cell-error",
  onEditorLeave,
  onEditorCancel,
  getFailure,
  confirming,
  children,
}: EditableCellSurfaceProps) {
  const [tooltipOpen, setTooltipOpen] = useState(false);
  const [dismissedFailure, setDismissedFailure] = useState<CellSurfaceFailure | null>(null);
  const [manuallyOpenedFailure, setManuallyOpenedFailure] = useState<CellSurfaceFailure | null>(
    null,
  );
  const [navigationDismissedFailure, setNavigationDismissedFailure] =
    useState<CellSurfaceFailure | null>(null);
  const errorActionsRef = useRef<Popover.Root.Actions | null>(null);
  const tabNavigationRef = useRef(false);
  const errorOpen = !!callbackError && dismissedFailure !== callbackError.failure;
  const showTooltip = tooltipLabel != null && !editing && !callbackError;
  const dismissForNavigation = () => {
    const failure = getFailure();
    if (!failure || failure.source === "parse") return;
    setNavigationDismissedFailure(failure);
    setDismissedFailure(failure);
  };
  useLayoutEffect(() => {
    // Remove closing focus guards before native Tab chooses its destination.
    if (!errorOpen && navigationDismissedFailure === callbackError?.failure)
      errorActionsRef.current?.unmount();
  }, [errorOpen, callbackError?.failure, navigationDismissedFailure]);
  const cell = (
    <Table.Cell
      {...cellProps}
      data-editable=""
      aria-busy={confirming || undefined}
      className={cn(
        cellProps.className,
        "astw:relative astw:group/cell",
        EDITABLE_CELL_CLASS_NAME,
        clearTintOnFocus && "astw:focus-within:[background-image:none]",
        callbackError && CELL_ERROR_CLASS_NAME,
      )}
      onBlur={(event) => {
        cellProps.onBlur?.(event);
        if (event.defaultPrevented) return;
        if (
          event.currentTarget.contains(event.relatedTarget) ||
          callbackError?.containsTarget(event.relatedTarget)
        )
          return;
        if (tabNavigationRef.current) dismissForNavigation();
        onEditorLeave?.();
      }}
      onKeyDown={(event) => {
        cellProps.onKeyDown?.(event);
        if (
          event.key === "Tab" &&
          !event.defaultPrevented &&
          event.currentTarget.contains(event.target as Node)
        )
          dismissForNavigation();
        tabNavigationRef.current = false;
      }}
      onKeyDownCapture={(event) => {
        cellProps.onKeyDownCapture?.(event);
        tabNavigationRef.current =
          event.key === "Tab" && event.currentTarget.contains(event.target as Node);
        if (event.defaultPrevented) return;
        if (
          callbackError &&
          event.key === "Escape" &&
          !callbackError.popupRef.current?.contains(event.target as Node)
        ) {
          event.preventDefault();
          event.stopPropagation();
          if (errorOpen) setDismissedFailure(callbackError.failure);
          else onEditorCancel();
          return;
        }
        if (callbackError && event.altKey && event.key === "ArrowDown") {
          event.preventDefault();
          event.stopPropagation();
          setNavigationDismissedFailure(null);
          setManuallyOpenedFailure(callbackError.failure);
          setDismissedFailure(null);
          if (errorOpen) callbackError.popupRef.current?.focus({ preventScroll: true });
        }
      }}
      onClick={(event) => {
        cellProps.onClick?.(event);
        event.stopPropagation();
      }}
    >
      <span
        aria-hidden="true"
        className={cn(
          "astw:block",
          (icon !== undefined || callbackError) && ICON_SPACE_CLASS_NAME,
          truncate && "astw:truncate",
          hideDisplay && "astw:forced-colors:invisible",
          hideDisplay === "focused" && "astw:invisible",
        )}
      >
        {display}
      </span>
      {children}
      {callbackError && (
        <>
          <output id={callbackError.id} className="astw:sr-only">
            {callbackError.message}. {labels.errorHint}
          </output>
          <Popover.Root
            actionsRef={errorActionsRef}
            open={errorOpen}
            onOpenChange={(open) => {
              setDismissedFailure(open ? null : callbackError.failure);
              if (open) {
                setNavigationDismissedFailure(null);
                setManuallyOpenedFailure(callbackError.failure);
              }
            }}
          >
            <Popover.Trigger
              ref={callbackError.triggerRef}
              aria-label={labels.showError}
              aria-keyshortcuts="Alt+ArrowDown"
              tabIndex={-1}
              className="astw:absolute astw:inset-y-0 astw:right-2 astw:z-10 astw:flex astw:items-center astw:text-danger-text astw:outline-none astw:[td:last-child>&]:right-6"
              onContextMenu={(event) => event.stopPropagation()}
            >
              <CircleAlert aria-hidden="true" strokeWidth={2.5} className="astw:size-3.5" />
            </Popover.Trigger>
            <Popover.Portal style={{ position: "relative", zIndex: "var(--z-popup)" }}>
              <Popover.Positioner
                anchor={() => callbackError.triggerRef.current?.closest("td") ?? null}
                sideOffset={2}
                side="bottom"
                align="start"
              >
                <Popover.Popup
                  ref={callbackError.popupRef}
                  initialFocus={manuallyOpenedFailure === callbackError.failure}
                  finalFocus={navigationDismissedFailure !== callbackError.failure}
                  aria-label={labels.errorDialog}
                  data-slot={errorSlot}
                  className={cn(
                    POPUP_CLASS_NAME,
                    "astw:[background-image:linear-gradient(var(--danger-surface),var(--danger-surface))]",
                    "astw:max-w-xs astw:border-0 astw:px-2.5 astw:py-2 astw:text-body-sm astw:text-danger-text astw:shadow-sm astw:outline-none",
                  )}
                  onContextMenu={(event) => event.stopPropagation()}
                  onTouchStart={(event) => event.stopPropagation()}
                  onKeyDown={(event) => {
                    if (event.key === "Escape") event.stopPropagation();
                  }}
                >
                  <div className="astw:flex astw:items-center astw:gap-2">
                    <div className="astw:min-w-0 astw:flex-1">{callbackError.content}</div>
                    <Popover.Close
                      aria-label={labels.closeError}
                      render={<Button variant="ghost" size="icon" className="astw:size-6" />}
                    >
                      <X aria-hidden="true" className="astw:size-4" />
                    </Popover.Close>
                  </div>
                </Popover.Popup>
              </Popover.Positioner>
            </Popover.Portal>
          </Popover.Root>
        </>
      )}
      {icon !== undefined && !callbackError && (
        <span aria-hidden="true" className={CELL_ICON_CLASS_NAME}>
          {icon}
        </span>
      )}
    </Table.Cell>
  );
  return (
    <Tooltip.Root open={showTooltip && tooltipOpen} onOpenChange={setTooltipOpen}>
      <Tooltip.Trigger disabled={!showTooltip} render={cell} />
      <Tooltip.Content>{tooltipLabel}</Tooltip.Content>
    </Tooltip.Root>
  );
}
