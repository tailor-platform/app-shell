import * as React from "react";
import { Maximize2, Minimize2, Search as SearchIcon } from "lucide-react";

import { Button } from "@/components/button";
import { cn } from "@/lib/utils";
import { useLineItemsContext, type LineItemsTotalsRenderer } from "./line-items-context";
import type { LineItemsChangeSet, LineItemsRowData } from "./types";

/* ------------------------------------------------------------------ Search */

export type LineItemsSearchProps = {
  placeholder?: string;
  /** Set `false` to drop the leading magnifier. */
  showIcon?: boolean;
  className?: string;
};

const searchInputClasses =
  "astw:border-input astw:h-9 astw:w-full astw:rounded-md astw:border astw:bg-transparent astw:text-sm astw:shadow-xs astw:outline-none astw:placeholder:text-muted-foreground astw:focus-visible:border-ring astw:focus-visible:ring-[3px] astw:focus-visible:ring-ring/50";

/** Always-visible search box bound to the filter. */
function LineItemsSearch({
  placeholder = "Search lines",
  showIcon = true,
  className,
}: LineItemsSearchProps) {
  const { lineItems } = useLineItemsContext("Search");
  return (
    <div
      data-slot="line-items-search"
      className={cn("astw:relative astw:w-full astw:max-w-64", className)}
    >
      {showIcon ? (
        <SearchIcon
          aria-hidden="true"
          className="astw:pointer-events-none astw:absolute astw:top-1/2 astw:left-2.5 astw:size-4 astw:-translate-y-1/2 astw:text-muted-foreground"
        />
      ) : null}
      <input
        type="search"
        aria-label={placeholder}
        placeholder={placeholder}
        value={lineItems.filter}
        onChange={(e) => lineItems.setFilter(e.target.value)}
        className={cn(searchInputClasses, showIcon ? "astw:pr-2 astw:pl-8" : "astw:px-2")}
      />
    </div>
  );
}
LineItemsSearch.displayName = "LineItems.Search";

export type LineItemsSearchToggleProps = {
  placeholder?: string;
  expandedWidth?: number;
  variant?: React.ComponentProps<typeof Button>["variant"];
  className?: string;
};

/**
 * Icon button that expands into a search input, then collapses again on blur
 * when empty. Fits a card header where the full-width `Search` box does not.
 */
function LineItemsSearchToggle({
  placeholder = "Search lines",
  expandedWidth = 240,
  variant = "outline",
  className,
}: LineItemsSearchToggleProps) {
  const { lineItems } = useLineItemsContext("SearchToggle");
  const [expanded, setExpanded] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement | null>(null);

  React.useEffect(() => {
    if (expanded) inputRef.current?.focus();
  }, [expanded]);

  if (!expanded) {
    return (
      <Button
        type="button"
        variant={variant}
        size="icon"
        aria-label={placeholder}
        data-slot="line-items-search-toggle"
        className={className}
        onClick={() => setExpanded(true)}
      >
        <SearchIcon className="astw:size-4" aria-hidden="true" />
      </Button>
    );
  }

  return (
    <div
      data-slot="line-items-search-toggle"
      className={cn("astw:relative astw:transition-[width] astw:duration-200", className)}
      style={{ width: expandedWidth }}
    >
      <SearchIcon
        aria-hidden="true"
        className="astw:pointer-events-none astw:absolute astw:top-1/2 astw:left-2.5 astw:size-4 astw:-translate-y-1/2 astw:text-muted-foreground"
      />
      <input
        ref={inputRef}
        type="search"
        aria-label={placeholder}
        placeholder={placeholder}
        value={lineItems.filter}
        onChange={(e) => lineItems.setFilter(e.target.value)}
        onBlur={() => {
          if (lineItems.filter.trim() === "") setExpanded(false);
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            lineItems.setFilter("");
            setExpanded(false);
          }
        }}
        className={cn(searchInputClasses, "astw:pr-2 astw:pl-8")}
      />
    </div>
  );
}
LineItemsSearchToggle.displayName = "LineItems.SearchToggle";

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
  const Icon = fullscreen ? Minimize2 : Maximize2;

  return (
    <Button
      type="button"
      variant={variant}
      size="icon"
      aria-pressed={fullscreen}
      aria-label={fullscreen ? "Exit fullscreen" : "Expand to fullscreen"}
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
  saveLabel = "Save changes",
  discardLabel = "Discard",
  saving = false,
  className,
}: LineItemsSaveActionsProps) {
  const { lineItems } = useLineItemsContext("SaveActions");
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
        {discardLabel}
      </Button>
      <Button
        type="button"
        size="sm"
        disabled={!lineItems.isDirty || saving}
        onClick={() => onSave(lineItems.getChangeSet())}
      >
        {saveLabel}
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

/**
 * Inline styles so consumer buttons dropped into the dark pills match their
 * chrome without needing the package's own utility classes.
 */
export const lineItemsFloatingBarStyles = {
  primaryButton: {
    background: "var(--background)",
    color: "var(--foreground)",
    borderRadius: "0.375rem",
    padding: "0.25rem 0.625rem",
    fontSize: "0.75rem",
    fontWeight: 500,
  },
  secondaryButton: {
    background: "transparent",
    color: "var(--background)",
    borderRadius: "0.375rem",
    padding: "0.25rem 0.625rem",
    fontSize: "0.75rem",
    fontWeight: 500,
  },
  divider: { width: 1, height: "1rem", background: "currentColor", opacity: 0.3 },
  label: { fontSize: "0.75rem", opacity: 0.8 },
} as const;

const JIGGLE_KEYFRAMES = `
@keyframes line-items-floating-jiggle{
0%{transform:translateX(0)}15%{transform:translateX(-8px)}30%{transform:translateX(8px)}
45%{transform:translateX(-6px)}60%{transform:translateX(6px)}75%{transform:translateX(-3px)}
100%{transform:translateX(0)}}
`;

export type LineItemsFloatingDockProps = {
  children?: React.ReactNode;
  className?: string;
};

/** Fixed bottom-center of the viewport, above page chrome. */
function LineItemsFloatingDock({ children, className }: LineItemsFloatingDockProps) {
  return (
    <>
      <style>{JIGGLE_KEYFRAMES}</style>
      <div
        data-slot="line-items-floating-dock"
        className={cn(
          "astw:pointer-events-none astw:fixed astw:bottom-6 astw:left-1/2 astw:z-[60] astw:flex astw:-translate-x-1/2 astw:flex-col astw:items-center astw:gap-2",
          className,
        )}
      >
        {children}
      </div>
    </>
  );
}
LineItemsFloatingDock.displayName = "LineItems.FloatingDock";

const pillClasses =
  "astw:pointer-events-auto astw:flex astw:items-center astw:gap-3 astw:rounded-lg astw:bg-foreground astw:px-3 astw:py-2 astw:text-xs astw:text-background astw:shadow-lg";

const jiggleStyle = {
  animation: "line-items-floating-jiggle 0.5s cubic-bezier(0.36,0.07,0.19,0.97)",
};

export type LineItemsDirtyBarProps = {
  onSave?: (changeSet: LineItemsChangeSet) => void;
  onDiscard?: () => void;
  label?: (pendingCount: number) => React.ReactNode;
  saveLabel?: React.ReactNode;
  discardLabel?: React.ReactNode;
  /**
   * Intercepts in-app link clicks and browser unload while the document is
   * dirty, shaking the bar instead of letting the edits be lost.
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
  saveLabel = "Save",
  discardLabel = "Discard",
  warnOnNav = false,
  children,
  className,
}: LineItemsDirtyBarProps) {
  const { lineItems } = useLineItemsContext("DirtyBar");
  const [jiggleNonce, setJiggleNonce] = React.useState(0);
  const isDirty = lineItems.isDirty;

  React.useEffect(() => {
    if (!warnOnNav || !isDirty) return;

    const jiggle = () => setJiggleNonce((n) => n + 1);

    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented) return;
      const target = event.target as HTMLElement | null;
      if (!target) return;
      // The dock's own controls, and anything inside the hosting card, are how
      // the user resolves the dirty state — never block those.
      if (target.closest("[data-slot=line-items-floating-dock]")) return;
      if (target.closest("[data-slot=card]")) return;
      const anchor = target.closest("a[href]") as HTMLAnchorElement | null;
      if (!anchor) return;
      const href = anchor.getAttribute("href");
      if (!href || href === "#") return;
      if (anchor.target && anchor.target !== "_self") return;
      event.preventDefault();
      event.stopPropagation();
      jiggle();
    };

    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
      jiggle();
    };

    document.addEventListener("click", onClick, true);
    globalThis.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      document.removeEventListener("click", onClick, true);
      globalThis.removeEventListener("beforeunload", onBeforeUnload);
    };
  }, [isDirty, warnOnNav]);

  if (!isDirty) return null;

  const pending = lineItems.getChangeSet().lineChanges.length;

  return (
    <div
      key={jiggleNonce}
      data-slot="line-items-dirty-bar"
      className={cn(pillClasses, className)}
      style={jiggleNonce > 0 ? jiggleStyle : undefined}
    >
      <span style={lineItemsFloatingBarStyles.label}>
        {label ? label(pending) : `${pending} unsaved ${pending === 1 ? "change" : "changes"}`}
      </span>
      {children ? (
        children(pending)
      ) : (
        <>
          <span aria-hidden="true" style={lineItemsFloatingBarStyles.divider} />
          <button
            type="button"
            style={lineItemsFloatingBarStyles.secondaryButton}
            onClick={() => (onDiscard ? onDiscard() : lineItems.revert())}
          >
            {discardLabel}
          </button>
          {onSave ? (
            <button
              type="button"
              style={lineItemsFloatingBarStyles.primaryButton}
              onClick={() => onSave(lineItems.getChangeSet())}
            >
              {saveLabel}
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
  LineItemsSearch,
  LineItemsSearchToggle,
  LineItemsTotalsRow,
};
