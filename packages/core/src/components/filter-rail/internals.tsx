import { useState, type ReactNode } from "react";
import { Collapsible } from "@base-ui/react/collapsible";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Checkbox } from "../checkbox";
import { Fieldset } from "../fieldset";
import { useFilterRailT } from "./i18n";

/** 32px rows by default — density over the 44px touch minimum in a mouse-driven ERP. */
export const rowHeightClass = (density: "compact" | "comfortable") =>
  density === "compact" ? "astw:h-8" : "astw:h-10";

export const inputClass =
  "astw:h-7 astw:w-full astw:min-w-0 astw:rounded-md astw:border astw:border-input astw:bg-transparent astw:px-2 astw:text-sm astw:outline-none astw:focus-visible:border-ring astw:focus-visible:ring-ring/50 astw:focus-visible:ring-[3px] astw:dark:bg-input/30";

// ─── Section shell ───────────────────────────────────────────────────────────

/**
 * A labelled group, rendered as a real `<fieldset>` / `<legend>`.
 *
 * Collapsible from its title, with a chevron (the same `Collapsible` pattern as
 * `SidebarGroup`). Collapsing hides options but never state: while collapsed,
 * the header still shows how many values are selected, and Clear stays reachable.
 */
export const RailSection = ({
  id,
  label,
  hint,
  action,
  open,
  onOpenChange,
  activeCount,
  children,
}: {
  id: string;
  label: ReactNode;
  hint?: ReactNode;
  /** Right-aligned in the header — the per-section Clear. */
  action?: ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Selected values in this section — shown in the header while collapsed. */
  activeCount: number;
  children: ReactNode;
}) => {
  const t = useFilterRailT();
  return (
    <Collapsible.Root
      open={open}
      onOpenChange={onOpenChange}
      data-slot="filter-rail-section"
      data-section={id}
      className="astw:border-b astw:border-border astw:px-3 astw:py-3 astw:last:border-b-0"
    >
      <Fieldset.Root className="astw:m-0 astw:min-w-0 astw:border-0 astw:p-0">
        <div className="astw:flex astw:items-center astw:justify-between astw:gap-2">
          <Fieldset.Legend className="astw:min-w-0 astw:text-xs astw:font-semibold astw:tracking-wide astw:text-foreground astw:uppercase">
            {/* The title is the toggle, so the whole label is a click target. */}
            <Collapsible.Trigger className="astw:group/section-toggle astw:flex astw:min-w-0 astw:cursor-pointer astw:items-center astw:gap-1 astw:rounded astw:uppercase astw:outline-none astw:focus-visible:ring-[3px] astw:focus-visible:ring-ring/50">
              <ChevronRight
                aria-hidden
                className="astw:size-3.5 astw:shrink-0 astw:text-muted-foreground astw:transition-transform astw:duration-200 astw:ease-out astw:group-data-panel-open/section-toggle:rotate-90 astw:motion-reduce:transition-none"
              />
              <span className="astw:truncate">{label}</span>
            </Collapsible.Trigger>
          </Fieldset.Legend>
          <div className="astw:flex astw:shrink-0 astw:items-center astw:gap-2">
            {/* Collapsing hides options, never state: an active filter still
                shows here, so a collapsed section can't hide what's applied. */}
            {!open && activeCount > 0 && (
              <span
                data-slot="filter-rail-section-badge"
                className="astw:animate-in astw:fade-in-0 astw:zoom-in-95 astw:duration-200 astw:motion-reduce:animate-none astw:rounded-full astw:bg-primary astw:px-1.5 astw:text-xs astw:font-medium astw:text-primary-foreground astw:tabular-nums"
              >
                <span aria-hidden>{activeCount}</span>
                <span className="astw:sr-only">{t("sectionActive", { count: activeCount })}</span>
              </span>
            )}
            {action}
          </div>
        </div>
        {/* keepMounted: drafts and the option search survive collapsing.
            Height animates between 0 and Base UI's measured
            `--collapsible-panel-height` in CSS only; reduced motion skips it. */}
        <Collapsible.Panel
          keepMounted
          className={cn(
            "astw:h-(--collapsible-panel-height) astw:overflow-hidden",
            "astw:transition-[height,opacity] astw:duration-200 astw:ease-out",
            "astw:data-starting-style:h-0 astw:data-starting-style:opacity-0",
            "astw:data-ending-style:h-0 astw:data-ending-style:opacity-0",
            "astw:motion-reduce:transition-none",
          )}
        >
          {/* The gap under the title lives inside the panel, so it animates
              with the height instead of snapping. */}
          <div className="astw:pt-1.5">
            {hint && <p className="astw:mb-1.5 astw:text-xs astw:text-muted-foreground">{hint}</p>}
            {children}
          </div>
        </Collapsible.Panel>
      </Fieldset.Root>
    </Collapsible.Root>
  );
};

/** Clear / Clear all. A text link, not a button — it is an undo. */
export const ClearLink = ({
  onClick,
  children,
  className,
}: {
  onClick: () => void;
  children: ReactNode;
  className?: string;
}) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      "astw:shrink-0 astw:cursor-pointer astw:rounded astw:text-xs astw:text-muted-foreground astw:underline-offset-2 astw:hover:text-foreground astw:hover:underline astw:focus-visible:outline-2 astw:focus-visible:outline-ring",
      className,
    )}
  >
    {children}
  </button>
);

// ─── Option rows ─────────────────────────────────────────────────────────────

/**
 * One checkbox option. Disabled options use `aria-disabled` rather than
 * `disabled`, so they stay in the tab order and a keyboard user can still
 * reach them and hear why (the `title`).
 */
export const OptionRow = ({
  label,
  icon,
  checked,
  disabled,
  title,
  rowHeight,
  onToggle,
}: {
  label: string;
  icon?: ReactNode;
  checked: boolean;
  disabled?: boolean;
  title?: string;
  rowHeight: string;
  onToggle: () => void;
}) => {
  return (
    <div
      data-slot="filter-rail-option"
      data-checked={checked || undefined}
      data-disabled={disabled || undefined}
      title={title}
      className={cn(
        "astw:flex astw:items-center astw:rounded-md astw:px-2",
        rowHeight,
        disabled ? "astw:opacity-45" : "astw:hover:bg-accent",
        checked && "astw:bg-accent",
      )}
    >
      <Checkbox
        checked={checked}
        aria-disabled={disabled || undefined}
        onCheckedChange={() => {
          if (!disabled) onToggle();
        }}
        // Stretch the label so the whole row is clickable.
        className="astw:min-w-0 astw:flex-1"
        label={
          <span className="astw:flex astw:min-w-0 astw:flex-1 astw:items-center astw:gap-2 astw:text-sm">
            {icon}
            <span className="astw:truncate">{label}</span>
          </span>
        }
      />
    </div>
  );
};

/**
 * One radio option. app-shell has no public radio yet; a native radio inside a
 * `<fieldset>` gives grouping and arrow-key behaviour for free.
 */
export const RadioRow = ({
  name,
  label,
  checked,
  rowHeight,
  onSelect,
}: {
  name: string;
  label: string;
  checked: boolean;
  rowHeight: string;
  onSelect: () => void;
}) => {
  return (
    <label
      data-slot="filter-rail-radio"
      data-checked={checked || undefined}
      className={cn(
        "astw:flex astw:cursor-pointer astw:items-center astw:gap-2 astw:rounded-md astw:px-2 astw:text-sm astw:hover:bg-accent",
        rowHeight,
        checked && "astw:bg-accent",
      )}
    >
      <input
        type="radio"
        name={name}
        checked={checked}
        onChange={onSelect}
        className="astw:size-3.5 astw:shrink-0 astw:accent-primary"
      />
      <span className="astw:truncate">{label}</span>
    </label>
  );
};

// ─── Show more / search ──────────────────────────────────────────────────────

export const ShowMore = ({
  hidden,
  expanded,
  onToggle,
}: {
  hidden: number;
  expanded: boolean;
  onToggle: () => void;
}) => {
  const t = useFilterRailT();
  if (hidden <= 0 && !expanded) return null;
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={expanded}
      className="astw:mt-0.5 astw:cursor-pointer astw:rounded-md astw:px-2 astw:py-1 astw:text-xs astw:text-muted-foreground astw:underline astw:underline-offset-2 astw:hover:text-foreground"
    >
      {expanded ? t("showLess") : t("showMore", { count: hidden })}
    </button>
  );
};

export const OptionSearch = ({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (next: string) => void;
  label: string;
}) => {
  const t = useFilterRailT();
  return (
    <input
      type="search"
      value={value}
      aria-label={label}
      placeholder={t("searchOptions")}
      onChange={(event) => onChange(event.target.value)}
      onKeyDown={(event) => {
        if (event.key === "Escape") onChange("");
      }}
      className={cn(inputClass, "astw:mb-1 astw:text-xs")}
    />
  );
};

export const useShowMore = () => {
  const [expanded, setExpanded] = useState(false);
  return { expanded, toggle: () => setExpanded((previous) => !previous) };
};
