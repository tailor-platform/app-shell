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
