import * as React from "react";
import { Maximize2, Minimize2 } from "lucide-react";

import { useBeforeUnload, useBlocker } from "react-router";

import { Button } from "@/components/button";
import { cn } from "@/lib/utils";
import { useLineItemsT } from "./i18n";
import { useLineItemsContext, type LineItemsTotalsRenderer } from "./line-items-context";
import type { LineItemsChangeSet, LineItemsRowData } from "./types";

/* ----------------------------------------------------------------- Add row */

export type LineItemsAddRowProps = {
  /** Host content — typically a catalogue combobox plus a bulk-add button. */
  children?: React.ReactNode;
  className?: string;
};

/**
 * Slot pinned below the table for adding lines. Give it whatever the document
 * needs — a searchable product combobox, a bulk-add button — and drive
 * `addLine`/`addLines` from it. Renders nothing in view mode.
 */
function LineItemsAddRow({ children, className }: LineItemsAddRowProps) {
  const { lineItems } = useLineItemsContext("AddRow");
  if (lineItems.mode === "view") return null;

  return (
    <div
      data-slot="line-items-add-row"
      className={cn("astw:flex astw:items-center astw:gap-2", className)}
    >
      {children}
    </div>
  );
}
LineItemsAddRow.displayName = "LineItems.AddRow";

/* ------------------------------------------------------- Fullscreen toggle */

export type LineItemsFullscreenToggleProps = {
  variant?: React.ComponentProps<typeof Button>["variant"];
  className?: string;
};

/** Expands the hosting card to a fullscreen overlay, and back. */
function LineItemsFullscreenToggle({
  variant = "outline",
  className,
}: LineItemsFullscreenToggleProps) {
  const { fullscreen, setFullscreen } = useLineItemsContext("FullscreenToggle");
  const t = useLineItemsT();
  const Icon = fullscreen ? Minimize2 : Maximize2;

  return (
    <Button
      type="button"
      variant={variant}
      size="icon"
      aria-pressed={fullscreen}
      aria-label={fullscreen ? t("exitFullscreen") : t("enterFullscreen")}
      data-slot="line-items-fullscreen-toggle"
      className={className}
      onClick={() => setFullscreen(!fullscreen)}
    >
      <Icon className="astw:size-4" aria-hidden="true" />
    </Button>
  );
}
LineItemsFullscreenToggle.displayName = "LineItems.FullscreenToggle";

/* ------------------------------------------------------------ Save actions */

export type LineItemsSaveActionsProps = {
  onSave: (changeSet: LineItemsChangeSet) => void;
  /** Defaults to reverting to the baseline. */
  onDiscard?: () => void;
  saveLabel?: React.ReactNode;
  discardLabel?: React.ReactNode;
  saving?: boolean;
  className?: string;
};

function LineItemsSaveActions({
  onSave,
  onDiscard,
  saveLabel,
  discardLabel,
  saving = false,
  className,
}: LineItemsSaveActionsProps) {
  const { lineItems } = useLineItemsContext("SaveActions");
  const t = useLineItemsT();
  if (lineItems.mode === "view") return null;

  return (
    <div
      data-slot="line-items-save-actions"
      className={cn("astw:flex astw:items-center astw:gap-2", className)}
    >
      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled={!lineItems.isDirty || saving}
        onClick={() => (onDiscard ? onDiscard() : lineItems.revert())}
      >
        {discardLabel ?? t("discard")}
      </Button>
      <Button
        type="button"
        size="sm"
        disabled={!lineItems.isDirty || saving}
        onClick={() => onSave(lineItems.getChangeSet())}
      >
        {saveLabel ?? t("saveChanges")}
      </Button>
    </div>
  );
}
LineItemsSaveActions.displayName = "LineItems.SaveActions";

/* -------------------------------------------------------------- Totals row */

export type LineItemsTotalsRowProps<T extends LineItemsRowData = LineItemsRowData> = {
  /** Cell contents keyed by column id. Unlisted columns render empty. */
  children: (lines: T[]) => Record<string, React.ReactNode>;
};

/**
 * Registers a totals row with the table, which renders it in its own `<tfoot>`
 * so the cells inherit each column's width, alignment and pinning. Renders no
 * DOM of its own — place it anywhere inside `<LineItems.Root>`.
 */
function LineItemsTotalsRow<T extends LineItemsRowData = LineItemsRowData>({
  children,
}: LineItemsTotalsRowProps<T>) {
  const { setTotalsRenderer } = useLineItemsContext("TotalsRow");

  // Held in a ref so an inline arrow does not re-register every render.
  const rendererRef = React.useRef(children);
  rendererRef.current = children;

  React.useEffect(() => {
    const renderer: LineItemsTotalsRenderer = (lines) =>
      rendererRef.current(lines as unknown as T[]);
    setTotalsRenderer(renderer);
    return () => setTotalsRenderer(undefined);
  }, [setTotalsRenderer]);

  return null;
}
LineItemsTotalsRow.displayName = "LineItems.TotalsRow";

/* ------------------------------------------------------------ Floating dock */

export type LineItemsFloatingDockProps = {
  children?: React.ReactNode;
  className?: string;
};

/**
 * Fixed bottom-center of the viewport: above page content, but one step below
 * the overlay and popup layer, so a confirm dialog or dropdown opened from the
 * page is never covered by the bar.
 */
function LineItemsFloatingDock({ children, className }: LineItemsFloatingDockProps) {
  return (
    <div
      data-slot="line-items-floating-dock"
      className={cn(
        "astw:pointer-events-none astw:fixed astw:bottom-6 astw:left-1/2 astw:z-[calc(var(--z-overlay)-1)] astw:flex astw:-translate-x-1/2 astw:flex-col astw:items-center astw:gap-2",
        className,
      )}
    >
      {children}
    </div>
  );
}
LineItemsFloatingDock.displayName = "LineItems.FloatingDock";

const pillClasses =
  "astw:pointer-events-auto astw:flex astw:items-center astw:gap-3 astw:rounded-lg astw:bg-foreground astw:px-3 astw:py-2 astw:text-xs astw:text-background astw:shadow-lg";

const pillButtonClasses =
  "astw:rounded-md astw:px-2.5 astw:py-1 astw:text-xs astw:font-medium astw:outline-none astw:focus-visible:ring-[3px] astw:focus-visible:ring-ring/50";

/** A short side-to-side shake, played with the Web Animations API. */
const SHAKE_KEYFRAMES: Keyframe[] = [
  { transform: "translateX(0)" },
  { transform: "translateX(-8px)", offset: 0.15 },
  { transform: "translateX(8px)", offset: 0.3 },
  { transform: "translateX(-6px)", offset: 0.45 },
  { transform: "translateX(6px)", offset: 0.6 },
  { transform: "translateX(-3px)", offset: 0.75 },
  { transform: "translateX(0)" },
];

/**
 * Holds the user on the page while the document has unsaved edits. Mounted by
 * DirtyBar only while dirty and `warnOnNav` is set, so a table without the
 * guard never needs a router. React Router's blocker covers every in-app
 * navigation — links, `navigate()`, back/forward — and needs the data router
 * AppShell provides; the browser's own prompt covers closing or reloading.
 */
function LineItemsNavGuard({
  onBlocked,
  hasUnsavedChanges,
}: {
  onBlocked: () => void;
  hasUnsavedChanges: () => boolean;
}) {
  // Only leaving the page counts: a search-param update on the same route is
  // not navigation away from the document. Dirtiness is read live, so
  // `await save(); reset(); navigate(…)` in one handler goes through even
  // though this guard is still mounted until the next render.
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      currentLocation.pathname !== nextLocation.pathname && hasUnsavedChanges(),
  );
  const onBlockedRef = React.useRef(onBlocked);
  onBlockedRef.current = onBlocked;

  React.useEffect(() => {
    if (blocker.state !== "blocked") return;
    // Stay put: the user resolves it with Save or Discard, then leaves.
    blocker.reset();
    onBlockedRef.current();
  }, [blocker]);

  useBeforeUnload(
    React.useCallback(
      (event: BeforeUnloadEvent) => {
        if (!hasUnsavedChanges()) return;
        event.preventDefault();
        event.returnValue = "";
      },
      [hasUnsavedChanges],
    ),
  );

  return null;
}

export type LineItemsDirtyBarProps = {
  onSave?: (changeSet: LineItemsChangeSet) => void;
  onDiscard?: () => void;
  label?: (pendingCount: number) => React.ReactNode;
  saveLabel?: React.ReactNode;
  discardLabel?: React.ReactNode;
  /**
   * While the document is dirty, keeps the user on the page: any in-app
   * navigation to another route (links, `navigate()`, back/forward) is held and
   * the bar shakes and takes focus instead; closing or reloading the tab shows
   * the browser's prompt. Uses React Router's `useBlocker`, so it needs
   * AppShell's router.
   */
  warnOnNav?: boolean;
  children?: (pendingCount: number) => React.ReactNode;
  className?: string;
};

/** Appears while there are uncommitted changes. Renders nothing when clean. */
function LineItemsDirtyBar({
  onSave,
  onDiscard,
  label,
  saveLabel,
  discardLabel,
  warnOnNav = false,
  children,
  className,
}: LineItemsDirtyBarProps) {
  const { lineItems } = useLineItemsContext("DirtyBar");
  const t = useLineItemsT();
  const barRef = React.useRef<HTMLDivElement | null>(null);
  const [blockedNotice, setBlockedNotice] = React.useState("");
  const isDirty = lineItems.isDirty;

  const blockedText = t("unsavedNavBlocked");
  const blockedTextRef = React.useRef(blockedText);
  blockedTextRef.current = blockedText;

  /** Shakes the bar, announces why, and hands it focus so it can be resolved. */
  const signalBlocked = React.useCallback(() => {
    const bar = barRef.current;
    if (!bar) return;
    if (!globalThis.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      bar.animate(SHAKE_KEYFRAMES, {
        duration: 500,
        easing: "cubic-bezier(0.36, 0.07, 0.19, 0.97)",
      });
    }
    // Toggle through "" so repeating the same notice is announced again.
    setBlockedNotice("");
    requestAnimationFrame(() => setBlockedNotice(blockedTextRef.current));
    // Save, never Discard: a reflexive second Enter must not throw the edits
    // away. Without a Save button, the bar itself takes focus.
    (bar.querySelector<HTMLElement>("[data-action=save]") ?? bar).focus();
  }, []);

  if (!isDirty) return null;

  const pending = lineItems.getChangeSet().lineChanges.length;

  return (
    <div
      ref={barRef}
      data-slot="line-items-dirty-bar"
      tabIndex={-1}
      className={cn(pillClasses, "astw:outline-none", className)}
    >
      {/* <output> is a status region: the count is announced as it appears and changes. */}
      <output className="astw:opacity-80">
        {label ? label(pending) : t("unsavedChanges", { count: pending })}
      </output>
      <span className="astw:sr-only" aria-live="assertive">
        {blockedNotice}
      </span>
      {warnOnNav ? (
        <LineItemsNavGuard
          onBlocked={signalBlocked}
          hasUnsavedChanges={lineItems.hasUnsavedChanges}
        />
      ) : null}
      {children ? (
        children(pending)
      ) : (
        <>
          <span aria-hidden="true" className="astw:h-4 astw:w-px astw:bg-current astw:opacity-30" />
          <button
            type="button"
            className={cn(pillButtonClasses, "astw:bg-transparent astw:text-background")}
            onClick={() => (onDiscard ? onDiscard() : lineItems.revert())}
          >
            {discardLabel ?? t("discard")}
          </button>
          {onSave ? (
            <button
              type="button"
              data-action="save"
              className={cn(pillButtonClasses, "astw:bg-background astw:text-foreground")}
              onClick={() => onSave(lineItems.getChangeSet())}
            >
              {saveLabel ?? t("save")}
            </button>
          ) : null}
        </>
      )}
    </div>
  );
}
LineItemsDirtyBar.displayName = "LineItems.DirtyBar";

export {
  LineItemsAddRow,
  LineItemsDirtyBar,
  LineItemsFloatingDock,
  LineItemsFullscreenToggle,
  LineItemsSaveActions,
  LineItemsTotalsRow,
};
