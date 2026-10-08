import { useId, useState, type ReactNode } from "react";
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
 * Deliberately not collapsible: truncation hides options, but collapsing would
 * hide *state* — an active filter in a panel you forgot you closed.
 */
export const RailSection = ({
  id,
  label,
  hint,
  action,
  children,
}: {
  id: string;
  label: ReactNode;
  hint?: ReactNode;
  /** Right-aligned in the header — the per-section Clear. */
  action?: ReactNode;
  children: ReactNode;
}) => (
  <div
    data-slot="filter-rail-section"
    data-section={id}
    className="astw:border-b astw:border-border astw:px-3 astw:py-3 astw:last:border-b-0"
  >
    <Fieldset.Root className="astw:m-0 astw:min-w-0 astw:border-0 astw:p-0">
      <div className="astw:mb-1.5 astw:flex astw:items-center astw:justify-between astw:gap-2">
        <Fieldset.Legend className="astw:text-xs astw:font-semibold astw:tracking-wide astw:text-foreground astw:uppercase">
          {label}
        </Fieldset.Legend>
        {action}
      </div>
      {hint && <p className="astw:mb-1.5 astw:text-xs astw:text-muted-foreground">{hint}</p>}
      {children}
    </Fieldset.Root>
  </div>
);

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

const Count = ({ value }: { value: string }) => (
  <span
    aria-hidden
    className="astw:ml-auto astw:shrink-0 astw:text-xs astw:text-muted-foreground astw:tabular-nums"
  >
    {value}
  </span>
);

// ─── Option rows ─────────────────────────────────────────────────────────────

/**
 * One checkbox option with its count.
 *
 * The label is the accessible name and the count its description ("Knitwear",
 * "1,380 items"). An `aria-label` would lose to the `aria-labelledby` the
 * label wrapper sets, and would repeat the name. Zero-count options use `aria-disabled`
 * rather than `disabled`, so they stay in the tab order and a keyboard user can
 * still learn the category is empty.
 */
export const OptionRow = ({
  label,
  icon,
  count,
  checked,
  disabled,
  title,
  rowHeight,
  onToggle,
}: {
  label: string;
  icon?: ReactNode;
  count?: number;
  checked: boolean;
  disabled?: boolean;
  title?: string;
  rowHeight: string;
  onToggle: () => void;
}) => {
  const t = useFilterRailT();
  const countId = useId();
  const formatted = count === undefined ? undefined : count.toLocaleString();
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
        aria-describedby={formatted !== undefined ? countId : undefined}
        onCheckedChange={() => {
          if (!disabled) onToggle();
        }}
        // Stretch the label so the count can push to the row's right edge.
        className="astw:min-w-0 astw:flex-1"
        label={
          <span className="astw:flex astw:min-w-0 astw:flex-1 astw:items-center astw:gap-2 astw:text-sm">
            {icon}
            <span className="astw:truncate">{label}</span>
            {formatted !== undefined && <Count value={formatted} />}
          </span>
        }
      />
      {/* Outside the <label>, so it describes the checkbox without joining its name. */}
      {formatted !== undefined && (
        <span id={countId} className="astw:sr-only">
          {t("itemCount", { count: formatted })}
        </span>
      )}
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
  count,
  checked,
  rowHeight,
  onSelect,
}: {
  name: string;
  label: string;
  count?: number;
  checked: boolean;
  rowHeight: string;
  onSelect: () => void;
}) => {
  const t = useFilterRailT();
  const formatted = count === undefined ? undefined : count.toLocaleString();
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
        aria-label={formatted ? t("optionWithCount", { label, count: formatted }) : label}
        className="astw:size-3.5 astw:shrink-0 astw:accent-primary"
      />
      <span className="astw:truncate">{label}</span>
      {formatted !== undefined && <Count value={formatted} />}
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
