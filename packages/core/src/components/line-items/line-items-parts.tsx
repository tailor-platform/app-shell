import * as React from "react";
import { Maximize2Icon, MinimizeIcon, SearchIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/button";
import { Input } from "@/components/input";

import { useLineItemsRoot } from "./line-items-root";
import type { LineItemsRowData } from "./types";

/* ======================================================================== */
/* Search                                                                    */
/* ======================================================================== */

export type LineItemsSearchProps = {
  placeholder?: string;
  className?: string;
  /** Controls visibility of the leading search icon. Default `true`. */
  showIcon?: boolean;
};

export function LineItemsSearch({
  placeholder = "Search lines…",
  className,
  showIcon = true,
}: LineItemsSearchProps) {
  const { hook } = useLineItemsRoot();
  return (
    <div className={cn("astw:relative astw:w-full astw:max-w-sm", className)}>
      {showIcon ? (
        <SearchIcon
          aria-hidden
          className="astw:text-muted-foreground astw:absolute astw:top-1/2 astw:left-2 astw:size-4 astw:-translate-y-1/2"
        />
      ) : null}
      <Input
        type="search"
        value={hook.filter}
        onChange={(e) => hook.setFilter(e.target.value)}
        placeholder={placeholder}
        className={cn("astw:h-9", showIcon && "astw:pl-8")}
        data-slot="line-items-search"
        aria-label="Search lines"
      />
    </div>
  );
}
LineItemsSearch.displayName = "LineItems.Search";

/* ======================================================================== */
/* SearchToggle (icon button → inline-expand input)                          */
/* ======================================================================== */

export type LineItemsSearchToggleProps = {
  placeholder?: string;
  className?: string;
  /** Width in pixels of the expanded search input. Default `240`. */
  expandedWidth?: number;
  /**
   * Pixel width of the wrapper while collapsed. Should match the trigger
   * button's outer size to avoid clipping its border. Default `28` (matches
   * `astw:size-7`); pass `32` if using `triggerSizeClassName="astw:size-8"`.
   */
  collapsedWidth?: number;
  /** Button variant for the resting (collapsed) icon trigger. Default `"ghost"`. */
  variant?: "ghost" | "outline" | "secondary" | "default";
  /** Tailwind size class for the icon button (e.g. `"astw:size-8"`). Default `"astw:size-7"`. */
  triggerSizeClassName?: string;
};

/**
 * Compact alternative to `LineItems.Search`. Renders an icon button at rest,
 * and expands inline into a search input with a 200ms width transition when
 * clicked. The input collapses again on blur if the filter is empty, or on
 * Escape. Reads/writes the same `filter` state as `LineItems.Search`, so the
 * two are interchangeable.
 */
export function LineItemsSearchToggle({
  placeholder = "Search lines…",
  className,
  expandedWidth = 240,
  collapsedWidth = 28,
  variant = "ghost",
  triggerSizeClassName = "astw:size-7",
}: LineItemsSearchToggleProps = {}) {
  const { hook } = useLineItemsRoot();
  const filter = hook.filter;
  const setFilter = hook.setFilter;
  const [expanded, setExpanded] = React.useState(filter !== "");
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (filter !== "") setExpanded(true);
  }, [filter]);

  // Focus the input when it expands. Avoids `autoFocus` (a11y lint rule), but
  // gives the same UX since expansion is always user-triggered.
  React.useEffect(() => {
    if (expanded) inputRef.current?.focus();
  }, [expanded]);

  return (
    <div
      data-slot="line-items-search-toggle"
      data-expanded={expanded}
      className={cn(
        // No `overflow-hidden` here: the input's focus ring extends slightly
        // beyond its rounded box, and clipping to a square wrapper produced a
        // visible rectangular halo at the corners. Letting the ring render
        // freely is fine because we conditionally render either the icon
        // button OR the input — there's never overflow to clip.
        "astw:relative astw:flex astw:items-center",
        "astw:transition-[width] astw:duration-200 astw:ease-out",
        className,
      )}
      style={{ width: expanded ? expandedWidth : collapsedWidth }}
    >
      {expanded ? (
        <Input
          ref={inputRef}
          type="search"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          onBlur={() => {
            if (filter === "") setExpanded(false);
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setFilter("");
              setExpanded(false);
            }
          }}
          placeholder={placeholder}
          aria-label="Search lines"
          className="astw:h-8 astw:w-full"
        />
      ) : (
        <Button
          type="button"
          variant={variant}
          size="icon"
          className={cn(triggerSizeClassName)}
          onClick={() => setExpanded(true)}
          aria-label="Search lines"
        >
          <SearchIcon className="astw:size-4" aria-hidden />
        </Button>
      )}
    </div>
  );
}
LineItemsSearchToggle.displayName = "LineItems.SearchToggle";

/* ======================================================================== */
/* BulkActions                                                               */
/* ======================================================================== */

export type LineItemsBulkActionsRenderArgs<T extends LineItemsRowData> = {
  selectedIds: string[];
  bulkUpdate: (patch: Partial<T>) => void;
  bulkRemove: () => void;
  clear: () => void;
};

export type LineItemsBulkActionsProps<T extends LineItemsRowData> = {
  /** Render-prop child receiving the selection + bulk action callbacks. */
  children: (args: LineItemsBulkActionsRenderArgs<T>) => React.ReactNode;
  /** Optional wrapper class. */
  className?: string;
};

export function LineItemsBulkActions<T extends LineItemsRowData>({
  children,
  className,
}: LineItemsBulkActionsProps<T>) {
  const { hook } = useLineItemsRoot<T>();
  if (hook.selectedIds.length === 0) return null;
  return (
    <div
      data-slot="line-items-bulk-actions"
      className={cn(
        "astw:flex astw:flex-wrap astw:items-center astw:gap-2 astw:rounded-md astw:border astw:bg-muted/30 astw:px-2 astw:py-1.5",
        className,
      )}
    >
      <span className="astw:text-muted-foreground astw:text-sm">
        {hook.selectedIds.length} selected
      </span>
      {children({
        selectedIds: hook.selectedIds,
        bulkUpdate: hook.bulkUpdate,
        bulkRemove: hook.bulkRemove,
        clear: hook.clearSelection,
      })}
    </div>
  );
}
// Cast preserves the generic call signature through the displayName property.
(LineItemsBulkActions as unknown as { displayName: string }).displayName = "LineItems.BulkActions";

/* ======================================================================== */
/* AddRow                                                                    */
/* ======================================================================== */

export type LineItemsAddRowProps = {
  className?: string;
  children: React.ReactNode;
};

/**
 * Sticky inline row pinned beneath the table body. Hosts pass arbitrary JSX
 * (typically a `<Combobox>` or row of inputs) and call `lineItems.addLine()`
 * directly to materialize a new line.
 */
export function LineItemsAddRow({ className, children }: LineItemsAddRowProps) {
  return (
    <div
      data-slot="line-items-add-row"
      className={cn(
        "astw:bg-muted/10 astw:hover:bg-muted/20 astw:rounded-md astw:border astw:transition-colors",
        className,
      )}
    >
      {children}
    </div>
  );
}
LineItemsAddRow.displayName = "LineItems.AddRow";

/* ======================================================================== */
/* FullscreenToggle                                                          */
/* ======================================================================== */

export type LineItemsFullscreenToggleProps = {
  className?: string;
  /** Button variant. Default `"ghost"`. */
  variant?: "ghost" | "outline" | "secondary" | "default";
};

export function LineItemsFullscreenToggle({
  className,
  variant = "ghost",
}: LineItemsFullscreenToggleProps = {}) {
  const { fullscreen, setFullscreen } = useLineItemsRoot();
  return (
    <Button
      type="button"
      variant={variant}
      size="icon"
      className={cn("astw:size-7", className)}
      onClick={() => setFullscreen((v) => !v)}
      aria-label={fullscreen ? "Exit fullscreen" : "Expand to fullscreen"}
      aria-pressed={fullscreen}
      data-slot="line-items-fullscreen-toggle"
    >
      {fullscreen ? (
        <MinimizeIcon className="astw:size-4" aria-hidden />
      ) : (
        <Maximize2Icon className="astw:size-4" aria-hidden />
      )}
    </Button>
  );
}
LineItemsFullscreenToggle.displayName = "LineItems.FullscreenToggle";

/* ======================================================================== */
/* SaveActions                                                               */
/* ======================================================================== */

export type LineItemsSaveActionsProps = {
  /** Called when the user clicks Save. Typically reads `hook.getChangeSet()` and submits. */
  onSave: () => void | Promise<void>;
  /**
   * Called when the user clicks Discard. Defaults to `hook.reset()` (snaps the
   * baseline back to the current row state, clearing dirty). Override when you
   * need to revert to original server state instead.
   */
  onDiscard?: () => void;
  saveLabel?: React.ReactNode;
  discardLabel?: React.ReactNode;
  className?: string;
};

export function LineItemsSaveActions({
  onSave,
  onDiscard,
  saveLabel = "Save",
  discardLabel = "Discard",
  className,
}: LineItemsSaveActionsProps) {
  const { hook } = useLineItemsRoot();
  const handleDiscard = onDiscard ?? (() => hook.reset());
  return (
    <div
      data-slot="line-items-save-actions"
      className={cn("astw:flex astw:items-center astw:justify-end astw:gap-2", className)}
    >
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={handleDiscard}
        disabled={!hook.isDirty}
      >
        {discardLabel}
      </Button>
      <Button
        type="button"
        size="sm"
        onClick={() => {
          void onSave();
        }}
        disabled={!hook.isDirty}
      >
        {saveLabel}
      </Button>
    </div>
  );
}
LineItemsSaveActions.displayName = "LineItems.SaveActions";

/* ======================================================================== */
/* TotalsRow                                                                 */
/* ======================================================================== */

export type LineItemsTotalsRowProps<T extends LineItemsRowData = LineItemsRowData> = {
  /**
   * Render-prop receiving the live `allLines` array. Return one value per
   * column key — keys not present in the result render blank in the totals row.
   */
  children: (lines: T[]) => Record<string, React.ReactNode>;
};

/**
 * Renders a sticky totals row at the bottom of `<LineItems.Table>`. Place it
 * as a sibling of the table inside `<LineItems.Root>`; the table picks up the
 * render-fn via root context and renders the values aligned to the columns.
 *
 * @example
 * ```tsx
 * <LineItems.Root value={lineItems}>
 *   <LineItems.Table />
 *   <LineItems.TotalsRow>
 *     {(lines) => ({
 *       quantity: lines.reduce((s, l) => s + l.quantity, 0),
 *       amount: `$${lines.reduce((s, l) => s + l.amount, 0).toFixed(2)}`,
 *     })}
 *   </LineItems.TotalsRow>
 * </LineItems.Root>
 * ```
 */
export function LineItemsTotalsRow<T extends LineItemsRowData>({
  children,
}: LineItemsTotalsRowProps<T>) {
  const root = useLineItemsRoot<T>();
  React.useEffect(() => {
    root.setTotalsRowFn(() => children);
    return () => root.setTotalsRowFn(null);
  }, [children, root]);
  return null;
}
LineItemsTotalsRow.displayName = "LineItems.TotalsRow";

/* ======================================================================== */
/* Floating dock (dirty + selection bars)                                   */
/* ======================================================================== */

/* Shared visual primitives for the floating bars. Inline styles reference
   theme CSS variables directly so they don't depend on Tailwind utility
   generation (some `astw:bg-foreground`-style classes aren't always emitted
   when not used elsewhere in scanned source). */

const FLOATING_DOCK_KEYFRAMES = `
@keyframes line-items-floating-jiggle {
  0%, 100% { transform: translateX(0); }
  15% { transform: translateX(-8px); }
  30% { transform: translateX(8px); }
  45% { transform: translateX(-6px); }
  60% { transform: translateX(6px); }
  75% { transform: translateX(-3px); }
  90% { transform: translateX(3px); }
}
`;

const dockStyle: React.CSSProperties = {
  position: "fixed",
  bottom: "20px",
  left: "50%",
  transform: "translateX(-50%)",
  zIndex: 60,
  pointerEvents: "none",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: "8px",
};

const pillStyle: React.CSSProperties = {
  pointerEvents: "auto",
  display: "flex",
  alignItems: "center",
  gap: "12px",
  padding: "12px 20px",
  borderRadius: "16px",
  backgroundColor: "var(--foreground)",
  boxShadow:
    "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
};

const labelStyle: React.CSSProperties = {
  color: "var(--background)",
  fontSize: "14px",
  fontWeight: 500,
  whiteSpace: "nowrap",
};

const dividerStyle: React.CSSProperties = {
  width: "1px",
  height: "24px",
  backgroundColor: "var(--muted-foreground)",
  opacity: 0.4,
};

const primaryButtonStyle: React.CSSProperties = {
  backgroundColor: "var(--background)",
  color: "var(--foreground)",
  padding: "6px 12px",
  borderRadius: "6px",
  fontSize: "14px",
  fontWeight: 500,
  border: "none",
  cursor: "pointer",
};

const secondaryButtonStyle: React.CSSProperties = {
  background: "transparent",
  color: "var(--muted-foreground)",
  padding: "6px 12px",
  borderRadius: "6px",
  fontSize: "14px",
  fontWeight: 500,
  border: "none",
  cursor: "pointer",
};

/**
 * Fixed bottom-center container that hosts auto-mounting floating bars
 * (`<LineItems.DirtyBar>`, `<LineItems.SelectionBar>`). Stacks children
 * vertically. The dock itself is `pointer-events: none` so the surrounding
 * area stays click-through; each bar inside flips back to `auto`.
 *
 * Place inside `<LineItems.Root>` after the table:
 *
 * ```tsx
 * <LineItems.Root value={lineItems}>
 *   <LineItems.Table />
 *   <LineItems.FloatingDock>
 *     <LineItems.DirtyBar onSave={handleSave} warnOnNav />
 *     <LineItems.SelectionBar>{({bulkRemove}) => <button onClick={bulkRemove}>×</button>}</LineItems.SelectionBar>
 *   </LineItems.FloatingDock>
 * </LineItems.Root>
 * ```
 */
export type LineItemsFloatingDockProps = {
  children: React.ReactNode;
  className?: string;
};

export function LineItemsFloatingDock({ children }: LineItemsFloatingDockProps) {
  return (
    <div data-slot="line-items-floating-dock" style={dockStyle}>
      <style>{FLOATING_DOCK_KEYFRAMES}</style>
      {children}
    </div>
  );
}
LineItemsFloatingDock.displayName = "LineItems.FloatingDock";

/**
 * Dirty-state bar that auto-shows when the hook has unsaved changes and
 * auto-hides when clean. Discard defaults to `hook.revert()` so the previous
 * state is restored. Place inside `<LineItems.FloatingDock>`.
 *
 * `warnOnNav`: when true, captures anchor clicks anywhere on the page and
 * cancels them while dirty (and re-fires the jiggle animation), and adds a
 * native `beforeunload` prompt for browser-level navigation. Off by default.
 */
export type LineItemsDirtyBarProps = {
  /** Called when the user clicks Save. Typically reads `hook.getChangeSet()` and submits. */
  onSave: () => void | Promise<void>;
  /** Override the Discard handler. Defaults to `hook.revert()`. */
  onDiscard?: () => void;
  /** Status copy on the left of the pill. Default `"Unsaved changes"`. */
  label?: React.ReactNode;
  saveLabel?: React.ReactNode;
  discardLabel?: React.ReactNode;
  /**
   * When true, intercepts in-app anchor clicks and the browser's `beforeunload`
   * event so the user can't leave the page without saving / discarding —
   * and re-fires a jiggle animation on the bar to draw attention.
   */
  warnOnNav?: boolean;
};

export function LineItemsDirtyBar({
  onSave,
  onDiscard,
  label = "Unsaved changes",
  saveLabel = "Save",
  discardLabel = "Discard",
  warnOnNav = false,
}: LineItemsDirtyBarProps) {
  const { hook } = useLineItemsRoot();
  const isDirty = hook.isDirty;
  const handleDiscard = onDiscard ?? (() => hook.revert());

  // Re-key the pill on each nav-block to restart the jiggle animation.
  const [jiggleNonce, setJiggleNonce] = React.useState(0);
  const isDirtyRef = React.useRef(isDirty);
  React.useEffect(() => {
    isDirtyRef.current = isDirty;
  }, [isDirty]);

  React.useEffect(() => {
    if (!warnOnNav) return undefined;
    const triggerJiggle = () => setJiggleNonce((n) => n + 1);

    const onDocumentClick = (e: MouseEvent) => {
      if (!isDirtyRef.current) return;
      if (e.defaultPrevented) return;
      const target = e.target as Element | null;
      if (!target) return;
      // Don't block clicks inside our own card or the floating bar itself.
      if (
        target.closest('[data-slot="line-items-floating-dock"]') ||
        target.closest('[data-slot="card"]')
      ) {
        return;
      }
      const anchor = target.closest("a[href]") as HTMLAnchorElement | null;
      if (!anchor) return;
      const href = anchor.getAttribute("href") ?? "";
      if (!href || href.startsWith("#")) return;
      if (anchor.target && anchor.target !== "" && anchor.target !== "_self") return;
      e.preventDefault();
      e.stopPropagation();
      triggerJiggle();
    };
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!isDirtyRef.current) return;
      e.preventDefault();
      e.returnValue = "";
      triggerJiggle();
    };

    document.addEventListener("click", onDocumentClick, { capture: true });
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      document.removeEventListener("click", onDocumentClick, { capture: true });
      window.removeEventListener("beforeunload", onBeforeUnload);
    };
  }, [warnOnNav]);

  if (!isDirty) return null;

  const animatedPill: React.CSSProperties = {
    ...pillStyle,
    animation:
      jiggleNonce > 0
        ? "line-items-floating-jiggle 0.5s cubic-bezier(0.36, 0.07, 0.19, 0.97)"
        : undefined,
  };

  return (
    <div key={jiggleNonce} data-slot="line-items-dirty-bar" style={animatedPill}>
      <span style={labelStyle}>{label}</span>
      <span aria-hidden style={dividerStyle} />
      <button type="button" style={secondaryButtonStyle} onClick={handleDiscard}>
        {discardLabel}
      </button>
      <button
        type="button"
        style={primaryButtonStyle}
        onClick={() => {
          void onSave();
        }}
      >
        {saveLabel}
      </button>
    </div>
  );
}
LineItemsDirtyBar.displayName = "LineItems.DirtyBar";

/**
 * Selection bar — render-prop that auto-shows when the hook has rows selected
 * and auto-hides when empty. Renders the dark pill chrome (count label +
 * divider) and lets the host plug in domain-specific actions (Delete, Export
 * PDF, Update price, etc.). Place inside `<LineItems.FloatingDock>`.
 *
 * @example
 * ```tsx
 * <LineItems.SelectionBar<POLine>>
 *   {({ selectedIds, bulkRemove, clear }) => (
 *     <>
 *       <button onClick={bulkRemove}>Delete</button>
 *       <button onClick={clear}>Clear</button>
 *     </>
 *   )}
 * </LineItems.SelectionBar>
 * ```
 */
export type LineItemsSelectionBarRenderArgs<T extends LineItemsRowData> = {
  selectedIds: string[];
  bulkUpdate: (patch: Partial<T>) => void;
  bulkRemove: () => void;
  clear: () => void;
};

export type LineItemsSelectionBarProps<T extends LineItemsRowData> = {
  /** Render-prop receiving the hook's bulk-action callbacks. */
  children: (args: LineItemsSelectionBarRenderArgs<T>) => React.ReactNode;
  /** Status copy on the left of the pill. Defaults to `"{N} selected"`. */
  label?: (selectedIds: string[]) => React.ReactNode;
};

export function LineItemsSelectionBar<T extends LineItemsRowData>({
  children,
  label,
}: LineItemsSelectionBarProps<T>) {
  const { hook } = useLineItemsRoot<T>();
  if (hook.selectedIds.length === 0) return null;

  const labelText = label
    ? label(hook.selectedIds)
    : `${hook.selectedIds.length} selected`;

  return (
    <div data-slot="line-items-selection-bar" style={pillStyle}>
      <span style={labelStyle}>{labelText}</span>
      <span aria-hidden style={dividerStyle} />
      {children({
        selectedIds: hook.selectedIds,
        bulkUpdate: hook.bulkUpdate,
        bulkRemove: hook.bulkRemove,
        clear: hook.clearSelection,
      })}
    </div>
  );
}
(LineItemsSelectionBar as unknown as { displayName: string }).displayName =
  "LineItems.SelectionBar";

/**
 * Re-exported style helpers so consumers can build buttons that visually
 * match the dirty-bar's primary / secondary buttons inside their own
 * `<LineItems.SelectionBar>` render-prop without re-discovering the styles.
 */
export const lineItemsFloatingBarStyles = {
  primaryButton: primaryButtonStyle,
  secondaryButton: secondaryButtonStyle,
  divider: dividerStyle,
  label: labelStyle,
} as const;
