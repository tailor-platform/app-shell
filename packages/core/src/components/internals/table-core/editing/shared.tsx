import {
  useCallback,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ComponentProps,
  type ReactNode,
} from "react";
import { Popover } from "@base-ui/react/popover";
import { CircleAlert, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/button";
import { Table } from "@/components/table";
import { Tooltip } from "@/components/tooltip";
import { CellEditError } from "../cell-edit-error";
import type { CellEditFailure } from "../cell-session";
import type { CellEditorLabels, CellEditorNavigation, CellEditorProps, CellErrorUI } from "./props";

/**
 * Room for the icon a dropdown or date cell shows at its right edge (a chevron
 * or a calendar; 14px plus a gap), so a value ends — or truncates — before it
 * instead of running underneath. Read-only cells of the same column keep it
 * too, so the column's width doesn't change as rows become editable or not.
 *
 * @internal
 */
export const ICON_SPACE_CLASS_NAME = "astw:pr-5";

// Editors cover the whole cell, end to end, instead of taking part in layout,
// so a cell becoming editable — or being edited — never changes row height or
// column width. They inherit the cell's padding (they're its direct children),
// so their text lines up exactly with the cell's own display underneath.
export const OVERLAY_CLASS_NAME =
  "astw:absolute astw:inset-0 astw:h-full astw:w-full astw:p-[inherit] astw:rounded-none astw:border-0 astw:shadow-none astw:bg-transparent astw:dark:bg-transparent";

// Spreadsheet-style: the cell being edited outlines its edges (an inset ring,
// so it never spills onto neighbouring cells).
export const CELL_FOCUS_CLASS_NAME = cn(
  "astw:outline-none astw:focus:ring-2 astw:focus:ring-inset astw:focus:ring-primary",
  "astw:focus-visible:ring-2 astw:focus-visible:ring-inset astw:focus-visible:ring-primary",
);

// Parsing and callback errors share the cell's error outline.
export const CELL_ERROR_CLASS_NAME =
  "astw:ring-[1.5px] astw:ring-inset astw:ring-danger-solid astw:focus:ring-[1.5px] astw:focus:ring-danger-solid astw:focus-visible:ring-[1.5px] astw:focus-visible:ring-danger-solid";

// An editable cell says so at rest with a subtle tint instead of an icon. It's
// a background *image* layered over whatever colour the cell already has (the
// row's hover / selected fade, a pinned cell's opaque card), so it never
// replaces them and stays a step darker than its read-only neighbours. The
// cell being edited drops it: an untinted cell with a ring reads as "active".
// (Written out in full: Tailwind only generates classes it finds as literals.)
const EDITABLE_CELL_CLASS_NAME = cn(
  "astw:[background-image:linear-gradient(color-mix(in_srgb,var(--foreground)_4%,transparent),color-mix(in_srgb,var(--foreground)_4%,transparent))]",
  "astw:hover:[background-image:linear-gradient(color-mix(in_srgb,var(--foreground)_7%,transparent),color-mix(in_srgb,var(--foreground)_7%,transparent))]",
  "astw:focus-within:[background-image:none]",
);

// Text, number and dropdown cells are typed into: the whole cell shows a text
// cursor.
export const INPUT_CLASS_NAME = cn(
  OVERLAY_CLASS_NAME,
  CELL_FOCUS_CLASS_NAME,
  "astw:text-body-md astw:cursor-text",
);

// A dropdown's text stops before its chevron.
export const ICON_INPUT_CLASS_NAME = "astw:pr-7 astw:[td:last-child>&]:pr-11";

// The icon that says how a cell is edited: shown while the cell is hovered or
// being edited (the cell's tint says it's editable at rest).
// Decoration only: a click anywhere in the cell goes to the editor underneath.
const CELL_ICON_CLASS_NAME = cn(
  "astw:pointer-events-none astw:absolute astw:inset-y-0 astw:right-2 astw:flex astw:items-center astw:[td:last-child>&]:right-6",
  "astw:text-muted-foreground astw:opacity-0 astw:transition-opacity",
  "astw:group-hover/cell:opacity-30 astw:group-focus-within/cell:opacity-30",
  "astw:[&_svg]:size-3.5",
);

export const POPUP_CLASS_NAME = cn(
  "astw:bg-popover astw:text-popover-foreground astw:z-(--z-portal) astw:flex astw:flex-col astw:gap-3 astw:rounded-md astw:border astw:border-border astw:p-3 astw:shadow-md",
  "astw:animate-in astw:fade-in-0 astw:zoom-in-95 astw:data-ending-style:animate-out astw:data-ending-style:fade-out-0 astw:data-ending-style:zoom-out-95",
);

// The standard popover body: the alert icon makes it read as an error rather
// than a tooltip.
function DefaultCellErrorContent({ message }: { message: string }) {
  return (
    <div className="astw:flex astw:gap-1.5">
      {/* One line-height tall, so the icon centres on the first line of text. */}
      <span className="astw:flex astw:h-lh astw:shrink-0 astw:items-center">
        <CircleAlert
          aria-hidden="true"
          strokeWidth={2.5}
          className="astw:size-3.5 astw:opacity-70"
        />
      </span>
      <p>{message}</p>
    </div>
  );
}

export function useCellError(
  { labels, renderError }: Pick<CellEditorProps<unknown>, "labels" | "renderError">,
  failure: CellEditFailure | undefined,
) {
  const errorId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const containsErrorTarget = (target: EventTarget | null) =>
    target instanceof Node &&
    !!(triggerRef.current?.contains(target) || popupRef.current?.contains(target));
  const message =
    failure?.error instanceof CellEditError && failure.error.message
      ? failure.error.message
      : labels.callbackError;
  const callbackError: CellErrorUI | undefined =
    failure && failure.source !== "parse"
      ? {
          failure,
          id: errorId,
          message: renderError ? labels.callbackError : message,
          content: renderError ? (
            renderError(failure.error)
          ) : (
            <DefaultCellErrorContent message={message} />
          ),
          triggerRef,
          popupRef,
          containsTarget: containsErrorTarget,
        }
      : undefined;
  return { callbackError, containsErrorTarget };
}

/**
 * Registers the cell's focusable element with the table's Tab
 * navigation. Unregisters on every detach instead of returning a ref cleanup:
 * `Input` and `Combobox.Input` merge refs with a plain callback that calls ours
 * with `null` and drops any cleanup we return.
 */
export function useNavigationRef<T extends HTMLElement>(
  navigation: CellEditorNavigation | undefined,
  rowKey: string,
  colKey: string,
) {
  const unregisterRef = useRef<(() => void) | null>(null);
  return useCallback(
    (element: T | null) => {
      unregisterRef.current?.();
      unregisterRef.current = element
        ? (navigation?.register(rowKey, colKey, element) ?? null)
        : null;
    },
    [navigation, rowKey, colKey],
  );
}

export function EditableCellFrame({
  labels,
  slotPrefix,
  cellProps,
  display,
  truncate,
  hideDisplay,
  icon,
  tooltipLabel,
  editing,
  callbackError,
  onEditorLeave,
  onEditorCancel,
  getFailure,
  confirming,
  children,
}: {
  labels: CellEditorLabels;
  slotPrefix: string;
  cellProps: ComponentProps<typeof Table.Cell>;
  display: ReactNode;
  truncate?: boolean;
  tooltipLabel?: string;
  editing: boolean;
  callbackError?: CellErrorUI;
  onEditorLeave?: () => void;
  onEditorCancel: () => void;
  getFailure: () => CellEditFailure | undefined;
  confirming: boolean;
  /** Typed-into cells hide the display while the input shows the text. */
  hideDisplay?: "focused" | "forced-colors";
  /** Shown on hover or focus; the cell's tint marks editability at rest. */
  icon?: ReactNode;
  children: ReactNode;
}) {
  const [tooltipOpen, setTooltipOpen] = useState(false);
  const [dismissedFailure, setDismissedFailure] = useState<CellEditFailure | null>(null);
  const [manuallyOpenedFailure, setManuallyOpenedFailure] = useState<CellEditFailure | null>(null);
  const [navigationDismissedFailure, setNavigationDismissedFailure] =
    useState<CellEditFailure | null>(null);
  const errorActionsRef = useRef<Popover.Root.Actions | null>(null);
  const tabNavigationRef = useRef(false);
  const errorOpen = !!callbackError && dismissedFailure !== callbackError.failure;
  const showTooltip = tooltipLabel !== undefined && !editing && !callbackError;
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
      // The editor is positioned against the cell. A pinned cell is already
      // positioned (sticky), which its inline style keeps.
      className={cn(
        cellProps.className,
        "astw:relative astw:group/cell",
        EDITABLE_CELL_CLASS_NAME,
        callbackError && CELL_ERROR_CLASS_NAME,
      )}
      // The editor and its portaled error popup are one logical focus group.
      onBlur={(event) => {
        if (
          event.currentTarget.contains(event.relatedTarget) ||
          callbackError?.containsTarget(event.relatedTarget)
        )
          return;
        if (tabNavigationRef.current) dismissForNavigation();
        onEditorLeave?.();
      }}
      onKeyDown={(event) => {
        if (
          event.key === "Tab" &&
          !event.defaultPrevented &&
          event.currentTarget.contains(event.target as Node)
        )
          dismissForNavigation();
        tabNavigationRef.current = false;
      }}
      onKeyDownCapture={(event) => {
        tabNavigationRef.current =
          event.key === "Tab" && event.currentTarget.contains(event.target as Node);
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
      // Editing a cell must never fire `onClickRow`.
      onClick={(event) => event.stopPropagation()}
    >
      <span
        aria-hidden="true"
        className={cn(
          "astw:block",
          (icon !== undefined || callbackError) && ICON_SPACE_CLASS_NAME,
          truncate && "astw:truncate",
          // Transparent input text is forced visible in forced-colors mode;
          // hide the display instead so the two don't overlap.
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
            <Popover.Portal style={{ position: "relative", zIndex: "var(--z-portal)" }}>
              {/* Opens directly under the cell, not under the small icon trigger. */}
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
                  data-slot={`${slotPrefix}-cell-error`}
                  className={cn(
                    POPUP_CLASS_NAME,
                    // Same tint as Alert's error variant. --danger-surface is
                    // translucent, so it's layered as an image over the opaque
                    // popover colour; table lines don't show through.
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
