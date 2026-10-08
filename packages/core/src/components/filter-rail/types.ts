import type { ReactNode } from "react";
import type { CollectionControl, Filter, SelectOption, SortState } from "@/types/collection";

// ─── Options ─────────────────────────────────────────────────────────────────

/**
 * One choice in a checkbox or radio section.
 *
 * Widens `SelectOption` (`{ value, label }`) and stays assignable **from** it,
 * so an existing `column.filter.options` array passes straight in.
 *
 * `value` is a string on purpose: `useURLCollectionVariables` stringifies array
 * members when it writes the URL, so a numeric `in` filter would come back as
 * `["1","2"]` and match nothing after a reload.
 */
export type FacetOption = SelectOption & {
  /** Leading adornment — a colour swatch, a status dot. */
  icon?: ReactNode;
  /** Rendered but not selectable, with this as the reason (shown as a tooltip). */
  disabledReason?: string;
  /** A data-quality note shown as a tooltip, e.g. "Legacy spelling". */
  note?: string;
};

/**
 * How a checkbox section's options are ordered.
 *
 * `"given"` (default) keeps the authored order — a curated vocabulary
 * (XS · S · M · L) must never be reordered. `"baselineCount"` is "most common
 * first", stable across clicks. `"liveCount"` reorders rows whenever another
 * section changes; offered, but rarely what you want.
 */
export type OptionSort =
  | "given"
  | "label"
  | "baselineCount"
  | "liveCount"
  | ((a: FacetOption, b: FacetOption, counts: { a: number; b: number }) => number);

// ─── Sections ────────────────────────────────────────────────────────────────

type SectionBase = {
  /** Stable and unique within the rail. Keys counts, layout and a11y ids. */
  id: string;
  /** The section heading — the word the business uses, not the field name. */
  label: ReactNode;
  /** One muted line under the heading. */
  hint?: ReactNode;
};

type FieldSectionBase<TField extends string> = SectionBase & {
  field: TField;
  /** Show the per-section Clear. Default `true`. */
  clearable?: boolean;
};

/** Free text with one fixed operator. */
export type TextSection<TField extends string = string> = FieldSectionBase<TField> & {
  control: "text";
  operator: "contains" | "hasPrefix" | "eq";
  placeholder?: string;
  /** Default 250 ms. Every commit resets pagination. */
  debounceMs?: number;
  /** Below this length the filter is removed instead of applied. Default 1. */
  minLength?: number;
};

/** Mutually exclusive choices — one filter, or none. */
export type RadioSection<TField extends string = string> = FieldSectionBase<TField> & {
  control: "radio";
  operator?: "eq" | "ne";
  options: readonly FacetOption[];
  /** The "no constraint" row. Default "Any"; `null` removes it. */
  anyLabel?: ReactNode | null;
};

/** Multi-select — the `in` (any of) or `nin` (none of) operator. */
export type CheckboxSection<TField extends string = string> = FieldSectionBase<TField> & {
  control: "checkbox";
  operator?: "in" | "nin";
  options: readonly FacetOption[];
  sort?: OptionSort;
  /**
   * Options shown before "Show N more". Default 8, `false` shows everything.
   * A selected option is never truncated away.
   */
  truncate?: number | false;
  /** Option values held at the top, in this order. */
  pinned?: readonly string[];
  /** Above this many options, show a search box. Default 12, `false` never. */
  searchThreshold?: number | false;
};

/** A single `YYYY-MM-DD` date with one fixed operator. */
export type DateSection<TField extends string = string> = FieldSectionBase<TField> & {
  control: "date";
  operator: "eq" | "gte" | "lte";
  /** `YYYY-MM-DD` */
  min?: string;
  /** `YYYY-MM-DD` */
  max?: string;
};

/** A from/to date pair, committed as `between` `{ min, max }`. */
export type DateRangeSection<TField extends string = string> = FieldSectionBase<TField> & {
  control: "dateRange";
  min?: string;
  max?: string;
  /** Named spans offered above the picker ("Last 30 days"). Click again to clear. */
  presets?: readonly { label: string; from: string; to: string }[];
};

/** A numeric from/to pair: `between` `{ min, max }`, or `gte` / `lte` when half-open. */
export type NumberRangeSection<TField extends string = string> = FieldSectionBase<TField> & {
  control: "numberRange";
  /** Input bounds and placeholders. One end typed alone commits `gte` / `lte`. */
  min?: number;
  max?: number;
  step?: number;
  /** Rendered after the inputs — "units", "$". */
  unit?: ReactNode;
};

/** True / false with a third "no constraint" state. */
export type BooleanSection<TField extends string = string> = FieldSectionBase<TField> & {
  control: "boolean";
  operator?: "eq" | "ne";
  /** Default "Yes". */
  trueLabel?: ReactNode;
  /** Default "No". */
  falseLabel?: ReactNode;
  /** Default "Any"; `null` removes it. */
  anyLabel?: ReactNode | null;
};

/** What a custom section's `render` receives. */
export type CustomSectionContext<TField extends string = string> = {
  control: CollectionControl<TField>;
  /** The current filter on `field`, if any. */
  getFilter: (field: TField) => Filter<TField> | undefined;
  /** Replace (or with `null`, remove) the filter on `field`. */
  setFilter: (field: TField, next: Omit<Filter<TField>, "field"> | null) => void;
};

/**
 * Anything the built-in controls do not cover. Declares the `fields` it writes
 * so Clear all, Clear and the settings panel still treat it as rail-owned.
 */
export type CustomSection<TField extends string = string> = SectionBase & {
  control: "custom";
  fields: readonly TField[];
  clearable?: boolean;
  render: (context: CustomSectionContext<TField>) => ReactNode;
};

export type FilterRailSection<TField extends string = string> =
  | TextSection<TField>
  | RadioSection<TField>
  | CheckboxSection<TField>
  | DateSection<TField>
  | DateRangeSection<TField>
  | NumberRangeSection<TField>
  | BooleanSection<TField>
  | CustomSection<TField>;

// ─── Counts ──────────────────────────────────────────────────────────────────

/**
 * Supplied by the consumer — the rail never sees rows. Compute in memory with
 * `useFilterRailCounts`, or return the same shape from a backend aggregation.
 */
export type FacetCounts = {
  /**
   * `live[sectionId][optionValue]`: rows matching every **other** section's
   * filter plus this option. `undefined` for a section means unknown — no
   * numbers, nothing disabled.
   */
  live: Record<string, Record<string, number> | undefined>;
  /** The same with no rail filters applied. Drives `sort: "baselineCount"`. */
  baseline?: Record<string, Record<string, number> | undefined>;
  /** Rows matching the full current filter set. */
  total?: number;
  /** Rows if section `id` alone were cleared. Drives the empty-result hint. */
  withoutSection?: Record<string, number>;
};

// ─── Layout (user preferences) ───────────────────────────────────────────────

/** The option sorts a user may pick in `FilterRail.Settings`. */
export type UserOptionSort = "given" | "label" | "baselineCount";

/**
 * The user's override of the authored section order, visibility and option
 * sort. Kept separate from `sections` so a new authored section needs no
 * migration of anyone's saved layout.
 */
export type RailLayout = {
  /** Section ids, top to bottom. Unlisted ids follow in authored order. */
  order: readonly string[];
  /** Section ids the user has switched off. */
  hidden: readonly string[];
  /** Per-section override of the authored `sort`. Checkbox sections only. */
  sort: Readonly<Record<string, UserOptionSort>>;
};

export type RailLayoutBinding = {
  value: RailLayout;
  onChange: (next: RailLayout) => void;
  /** Back to the authored defaults. Omit and no Reset is offered. */
  onReset?: () => void;
};

// ─── Saved views ─────────────────────────────────────────────────────────────

/** Filters plus the table's presentation — everything that makes a view. */
export type ViewState = {
  filters: Filter[];
  sort: SortState[];
  pageSize: number;
  /** Column ids, in display order. */
  columnOrder: string[];
  /** Column ids the user has hidden. */
  hidden: string[];
  /** Column id → the edge it is frozen to. */
  pinned: Record<string, "left" | "right" | "none">;
};

export type SavedView = {
  id: string;
  name: string;
  createdAt: string;
  state: ViewState;
};

/** What `FilterRail.SavedViews` renders. `useSavedViews` returns one. */
export type SavedViewBinding = {
  items: readonly SavedView[];
  /** The view the current state matches, or `null`. */
  activeId: string | null;
  /** Whether saving now would achieve something — drives the Save button. */
  dirty: boolean;
  onSave: (name: string) => void;
  onApply: (view: SavedView) => void;
  onDelete: (view: SavedView) => void;
  /** One-line summary under each name — "3 filters · 2 hidden · 25/page". */
  describe?: (view: SavedView) => string;
};

/** Where saved views live. Default: localStorage. Swap for a backend store. */
export type SavedViewStorage = {
  load: () => SavedView[];
  save: (views: SavedView[]) => void;
};

// ─── Parts ───────────────────────────────────────────────────────────────────

export type FilterRailRootProps<TField extends string = string> = {
  /**
   * The same `control` passed to `useDataTable`. A prop rather than context:
   * the rail sits in a different `Layout.Column`, outside `DataTable.Root`.
   */
  control: CollectionControl<TField>;
  /** Top to bottom. Any mix of section types. */
  sections: readonly FilterRailSection<TField>[];
  /** Absent ⇒ no numbers, nothing disabled. */
  counts?: FacetCounts;
  /** User layout (order / hidden / sort). Required for `FilterRail.Settings`. */
  layout?: RailLayoutBinding;
  /**
   * What to do with an option whose live count is zero. Default `"disable"`.
   * A selected option is never disabled.
   */
  zeroBehavior?: "disable" | "show";
  /** 32px rows (default) or 40px. */
  density?: "compact" | "comfortable";
  /** Accessible name of the rail landmark. Default "Filters". */
  "aria-label"?: string;
  /** Fires after the rail applies a change. */
  onFilterChange?: (next: Filter<TField>[], changed: readonly TField[]) => void;
  className?: string;
  children: ReactNode;
};
