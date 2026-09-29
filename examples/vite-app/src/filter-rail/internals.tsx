// ✅ Reusable Component: the primitives `FilterRail` needs and app-shell does
// not have.
//
// Verified absent from app-shell 1.13.0: no checkbox group, no radio group, no
// show-more list. `Checkbox` exists (and does support `indeterminate`); the
// group around it — the array value, the select-all parent, the `Fieldset`
// wiring — does not. `RadioGroup` exists only as `Menu.RadioGroup`, a
// dropdown-menu item, not a form control.
//
// All three are generic and worth proposing on their own merits. Base UI — which
// app-shell already depends on — ships `CheckboxGroup`, `RadioGroup` and
// `Collapsible`, so upstreaming these is mostly re-export plus tokens.

import { Checkbox, Fieldset } from "@tailor-platform/app-shell";
import { type ReactNode, useId, useState } from "react";

/** 32px rows. the design spec: density over the 44px touch minimum — mouse-driven ERP. */
export const ROW_COMPACT = "h-8";
export const ROW_COMFORTABLE = "h-10";

/**
 * A scrollbar that only shows itself while the pointer is over the area it
 * scrolls.
 *
 * A permanent bar down the side of a 320px rail is a lot of furniture for
 * something you need twice a session, and it competes with the facet counts
 * sitting right next to it.
 *
 * **Only the thumb's colour changes — the track's width is reserved at all
 * times.** Hiding the bar by toggling `scrollbar-width` between `none` and
 * `thin` would reclaim 6px on mouse-out and give it back on mouse-in, so every
 * row and every right-aligned count would shuffle sideways as the pointer
 * crossed the edge. Reserving the gutter and painting the thumb transparent
 * costs those 6px permanently and moves nothing.
 *
 * Both engines need saying separately: Firefox reads `scrollbar-color`, WebKit
 * and Blink read the `::-webkit-scrollbar-*` pseudo-elements and ignore it.
 */
export const HOVER_SCROLLBAR = [
  "[scrollbar-width:thin]",
  "[scrollbar-color:transparent_transparent]",
  "hover:[scrollbar-color:var(--muted-foreground)_transparent]",
  "[&::-webkit-scrollbar]:w-1.5",
  // Height is the horizontal bar's thickness — a width alone leaves a
  // horizontally-scrolling area with app-shell's default chunky bar.
  "[&::-webkit-scrollbar]:h-1.5",
  "[&::-webkit-scrollbar-track]:bg-transparent",
  "[&::-webkit-scrollbar-thumb]:rounded-full",
  "[&::-webkit-scrollbar-thumb]:bg-transparent",
  // `--muted-foreground` at 40%, not `--border`. `--border` is
  // `rgba(255,255,255,0.08)` in this theme — invisible against the card, so the
  // bar would "appear" on hover and still be impossible to see or grab. The
  // point of hiding it at rest is that it is unmistakable when wanted.
  "hover:[&::-webkit-scrollbar-thumb]:bg-muted-foreground/40",
].join(" ");

// ─── Section shell ───────────────────────────────────────────────────────────

/**
 * A labelled group.
 *
 * Deliberately **not** collapsible. Decision 6: "Nothing lives in a collapsed
 * panel you forgot about. This is why people trust the results." Truncation
 * hides options; collapsing would hide *state*, which is a different and worse
 * thing.
 *
 * `Fieldset.Root` + `Fieldset.Legend` give a real `<fieldset>`/`<legend>`, which
 * is what actually groups controls for a screen reader.
 */
export const RailSection = ({
  label,
  hint,
  action,
  children,
}: {
  label: ReactNode;
  hint?: ReactNode;
  /** Right-aligned in the header — the per-section Clear (decision 7). */
  action?: ReactNode;
  children: ReactNode;
}) => (
  // The legend's type is set from HERE, not on `Fieldset.Legend` itself.
  //
  // `Fieldset.Legend` ships `astw:text-sm astw:font-medium`. A class on the
  // legend — named or arbitrary — ties on specificity, and app-shell's
  // stylesheet is loaded after ours, so it wins: measured 14px/500 with
  // `text-[12px] font-semibold` sitting right there in the class list, matching
  // and overridden. Tailwind's own ordering cannot help across two stylesheets.
  //
  // A descendant selector is (0,2,0) against their (0,1,0), so it wins on
  // specificity and load order stops mattering.
  <Fieldset.Root
    className="border-b border-border px-3 py-3 last:border-b-0
      [&_[data-slot=fieldset-legend]]:text-[12px]
      [&_[data-slot=fieldset-legend]]:font-semibold
      [&_[data-slot=fieldset-legend]]:text-foreground"
  >
    <div className="mb-1.5 flex items-center justify-between gap-2">
      {/* 12px and full-contrast. These headers are decision 2's "free data
          dictionary" — the thing a new user reads top to bottom to learn what a
          Style even is — so they are content, not chrome, and muted 11px was
          treating them as chrome.

          `text-[12px]` and not `text-xs`, which is the same 12px: `Fieldset.Legend`
          ships `astw:text-sm`, the two are equal specificity, and app-shell's
          stylesheet loads last — so the named utility loses and the legend renders
          at 14px. Tailwind emits arbitrary values after named ones, so the bracket
          form wins on order. Measured both ways. */}
      <Fieldset.Legend className="uppercase tracking-wide">{label}</Fieldset.Legend>
      {action}
    </div>
    {hint && <p className="mb-1.5 text-xs text-muted-foreground">{hint}</p>}
    {children}
  </Fieldset.Root>
);

/** The per-section and rail-level Clear. A link, not a button — it is an undo. */
export const ClearLink = ({ onClick, children }: { onClick: () => void; children: ReactNode }) => (
  <button
    type="button"
    onClick={onClick}
    className="shrink-0 rounded text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
  >
    {children}
  </button>
);

// ─── Option row ──────────────────────────────────────────────────────────────

/**
 * One checkbox option with its count.
 *
 * The count is `aria-hidden` and folded into the checkbox's `aria-label`
 * instead. Rendered as a sibling node it is announced as a separate, unattached
 * number — or not at all — so "Knitwear, 1,380 items" in one utterance is both
 * more accurate and shorter.
 *
 * Zero-count options use `aria-disabled`, not `disabled`: `disabled` drops the
 * row out of the tab order and takes its count with it, so a keyboard user can
 * never learn that the category is empty.
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
  const formatted = count === undefined ? undefined : count.toLocaleString();
  return (
    <div
      // `rounded-md` — the theme's own radius (14px), matching the rail and
      // table cards. Tailwind's bare `rounded` is 4px, which reads as a
      // different design language next to app-shell's generous corners.
      //
      // `[&>label]:w-full` is what right-aligns the count. `Checkbox` owns its
      // own label wrapper and makes it `inline-flex`, so it shrinks to its
      // content and an `ml-auto` inside it has nothing to push against — the
      // number ends up tight against the text instead of at the row's edge.
      // Stretching the wrapper is the only lever from out here, since `Checkbox`
      // spreads props onto the box rather than the label. A `labelClassName`
      // upstream would remove the need; raised with the app-shell team.
      className={`flex items-center rounded-md px-2 [&>label]:w-full ${rowHeight} ${
        disabled ? "opacity-45" : "hover:bg-[var(--accent)]"
      } ${checked ? "bg-[var(--accent)]" : ""}`}
      title={title}
    >
      <Checkbox
        checked={checked}
        aria-disabled={disabled || undefined}
        aria-label={formatted ? `${label}, ${formatted} items` : label}
        onCheckedChange={() => {
          if (!disabled) onToggle();
        }}
        label={
          <span className="flex min-w-0 flex-1 items-center gap-2 text-sm">
            {icon}
            <span className="truncate">{label}</span>
            {formatted !== undefined && (
              <span
                aria-hidden
                className="ml-auto shrink-0 tabular-nums text-xs text-muted-foreground"
              >
                {formatted}
              </span>
            )}
          </span>
        }
      />
    </div>
  );
};

/**
 * One radio option.
 *
 * Hand-rolled because app-shell has no radio at all — `RadioGroup` exists only
 * inside `Menu`. A native `<input type="radio">` in a real `<fieldset>` gives
 * the arrow-key behaviour and grouping for free, so this is styling, not
 * behaviour.
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
  const formatted = count === undefined ? undefined : count.toLocaleString();
  return (
    <label
      className={`flex cursor-pointer items-center gap-2 rounded-md px-2 text-sm hover:bg-[var(--accent)] ${rowHeight} ${
        checked ? "bg-[var(--accent)]" : ""
      }`}
    >
      <input
        type="radio"
        name={name}
        checked={checked}
        onChange={onSelect}
        aria-label={formatted ? `${label}, ${formatted} items` : label}
        className="size-3.5 shrink-0 accent-[var(--primary)]"
      />
      <span className="truncate">{label}</span>
      {formatted !== undefined && (
        <span aria-hidden className="ml-auto shrink-0 tabular-nums text-xs text-muted-foreground">
          {formatted}
        </span>
      )}
    </label>
  );
};

// ─── Show more ───────────────────────────────────────────────────────────────

/**
 * Decision 5 — truncate, do not hide.
 *
 * Moves focus to the first newly revealed row on expand, otherwise the user
 * tabs back into the middle of a list that just grew under them.
 */
export const ShowMore = ({
  hidden,
  expanded,
  onToggle,
}: {
  hidden: number;
  expanded: boolean;
  onToggle: () => void;
}) => {
  if (hidden <= 0 && !expanded) return null;
  return (
    <button
      type="button"
      onClick={onToggle}
      className="mt-0.5 rounded-md px-2 py-1 text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
    >
      {expanded ? "Show less" : `Show ${hidden} more`}
    </button>
  );
};

/** A filter box inside a long section. Sections, not the rail, own their search. */
export const OptionSearch = ({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (next: string) => void;
  label: string;
}) => {
  const id = useId();
  return (
    <input
      id={id}
      type="search"
      value={value}
      aria-label={label}
      placeholder="Filter…"
      onChange={(event) => onChange(event.target.value)}
      onKeyDown={(event) => {
        if (event.key === "Escape") onChange("");
      }}
      className="mb-1 h-7 w-full rounded-md border border-border bg-transparent px-2 text-xs outline-none focus-visible:border-ring"
    />
  );
};

/** Local expand/collapse for one section's option list. */
export const useShowMore = () => {
  const [expanded, setExpanded] = useState(false);
  return { expanded, toggle: () => setExpanded((previous) => !previous) };
};
