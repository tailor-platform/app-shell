// ✅ Reusable Component: the proposed public API for `FilterRail`.
//
// Written as if it were already app-shell code — it imports nothing from this
// project, only from `@tailor-platform/app-shell`. That is deliberate: this file
// is the pitch. See `docs/filter-rail-proposal.md`.
//
// ─── What this is ────────────────────────────────────────────────────────────
//
// An always-visible faceted filter rail, of the kind every apparel ERP has and
// no component library ships. It implements the eight decisions the design spec set out in
// his Anatomy spec, each of which is an argument for why an "ugly" exposed rail
// beats a prettier dropdown:
//
//   1. Always visible, never a modal    — zero clicks to know what is filterable
//   2. One section per facet            — the headers are a free data dictionary
//   3. Control type matches data shape  — `control` on the section
//   4. Counts before the click          — optional `counts` prop
//   5. Truncate, do not hide            — `truncate` + "Show N more"
//   6. No hidden state                  — sections DO NOT collapse
//   7. Reversible at two levels         — clear a section, or clear everything
//   8. One filter per field, many values— checkbox group → the `in` operator
//
// ─── Why it is not `DataTable.FilterRail` ────────────────────────────────────
//
// The rail lives in a different `Layout.Column` from the table, so it can never
// be a descendant of `DataTable.Root`. A `DataTable.`-prefixed component that
// throws when nested is a worse API than an unprefixed one. app-shell's own
// `CollectionControlProvider` docstring already names this case: "a sibling
// filter panel".

import type { CollectionControl, Filter, SelectOption } from "@tailor-platform/app-shell";
import type { ReactNode } from "react";

// ─── Options ─────────────────────────────────────────────────────────────────

/**
 * One choice in a section.
 *
 * Widens app-shell's `SelectOption` (`{ value, label }`) and stays structurally
 * assignable **from** it, so an existing `column.filter.options` array passes
 * straight in with no mapping.
 *
 * `value` is a `string` by inheritance, and that is load-bearing rather than
 * incidental: `useURLCollectionVariables` stringifies every member of an array
 * when it writes the URL, so a numeric `in` filter comes back as `["1","2"]`
 * and matches nothing after a reload. Numeric axes belong in a range control,
 * or in a checkbox section over string bucket labels.
 */
export type FacetOption = SelectOption & {
  /** Leading adornment — a colour swatch, a status dot. */
  icon?: ReactNode;
  /** Trailing text. Replaces the facet count for this option when set. */
  meta?: ReactNode;
  /** Rendered but not selectable, with this as the reason. */
  disabledReason?: string;
  /**
   * A data-quality annotation. Exists because real vocabularies are dirty —
   * `Black` and `BLACK` genuinely are two different values in the dataset this
   * was built against, and the rail must show the vocabulary the data actually
   * has rather than quietly folding them together.
   */
  note?: string;
};

/**
 * How a section's options are ordered.
 *
 * `"given"` is the default, and the default matters more than it looks: a
 * hand-curated vocabulary (XS · S · M · L · XL) must not be reordered by
 * anything, ever.
 *
 * `"liveCount"` is offered and is a trap — it reorders rows under the cursor
 * every time an unrelated axis changes, which is the precise opposite of the
 * muscle memory an exposed rail exists to build. `"baselineCount"` gives
 * "most common first" *permanently*, which is almost always what was wanted.
 */
export type OptionSort =
  | "given"
  | "label"
  | "baselineCount"
  | "liveCount"
  /** Sizes must sort by (system, sortOrder) or `US 10` lands before `US 2`. */
  | ((a: FacetOption, b: FacetOption, counts: { a: number; b: number }) => number);

// ─── Sections ────────────────────────────────────────────────────────────────

type SectionBase = {
  /** Stable and unique within the rail. Keys counts and accessibility ids. */
  id: string;
  /**
   * The `<legend>`. A domain term, not a field name — decision 2 makes the rail
   * double as a data dictionary, so this is the word the business uses.
   */
  label: ReactNode;
  /** One muted line under the legend. */
  hint?: ReactNode;
};

/** A high-cardinality identifier. Free text, one forced operator. */
export type TextSection<TField extends string = string> = SectionBase & {
  control: "text";
  field: TField;
  /** Forced per axis — never user-selectable. That is what "exposed" means. */
  operator: "contains" | "hasPrefix" | "eq";
  placeholder?: string;
  /** Default 250. Every commit resets pagination, so an undebounced input
   *  would reset the page on every keystroke. */
  debounceMs?: number;
  /** Below this, the filter is removed rather than applied. Default 1. */
  minLength?: number;
};

/** Mutually exclusive states. One filter, or none. */
export type RadioSection<TField extends string = string> = SectionBase & {
  control: "radio";
  field: TField;
  operator?: "eq" | "ne";
  options: readonly FacetOption[];
  /** The "no constraint" row. Default "Any"; `null` removes it. */
  anyLabel?: ReactNode | null;
};

/** Multi-select. The common case — decision 8's `in` operator. */
export type CheckboxSection<TField extends string = string> = SectionBase & {
  control: "checkbox";
  field: TField;
  /** `in` = any of (default). `nin` = none of. */
  operator?: "in" | "nin";
  options: readonly FacetOption[];
  sort?: OptionSort;
  /**
   * Decision 5. Default 8, `false` to show everything.
   *
   * A **selected** option is never truncated away — that invariant is what lets
   * decision 5 (truncate) and decision 6 (no hidden state) coexist. Without it,
   * selecting an unpopular option and then narrowing another axis would hide an
   * active filter, which is exactly the failure decision 6 is about.
   */
  truncate?: number | false;
  /**
   * Option values held at the top, in this order, never truncated away.
   *
   * The real muscle-memory lever: stable across sessions and independent of
   * both counts and selection, unlike any count-based sort.
   */
  pinned?: readonly string[];
  /** Above this many options, show a filter box inside the section. Default 12. */
  searchThreshold?: number | false;
  /** Show the per-section Clear (decision 7). Default true. */
  clearable?: boolean;
};

/**
 * A single date. `DatePicker` from app-shell.
 *
 * `operator` is forced per axis like everywhere else in the rail: an axis is
 * either "on this day", "from this day" or "up to this day", decided by whoever
 * built the screen. Offering the choice is what a generic filter builder does,
 * and it is the thing an exposed rail exists to avoid.
 *
 * Values cross the wire as `YYYY-MM-DD` strings, never `Date` objects — they
 * compare correctly as strings and survive a URL round-trip unchanged.
 */
export type DateSection<TField extends string = string> = SectionBase & {
  control: "date";
  field: TField;
  operator: "eq" | "gte" | "lte";
  /** Clamps the picker. `YYYY-MM-DD`. */
  min?: string;
  max?: string;
};

/**
 * A from/to pair. `DateRangePicker` from app-shell.
 *
 * Always the `between` operator, and that is forced by the filter model rather
 * than chosen: `addFilter` upserts by field, so `gte` **and** `lte` on one field
 * is not expressible — the second would overwrite the first. `between` carries
 * both bounds in one filter, `{ min, max }`.
 */
export type DateRangeSection<TField extends string = string> = SectionBase & {
  control: "dateRange";
  field: TField;
  min?: string;
  max?: string;
  /** Named spans offered above the picker — "Last 30 days", "This season". */
  presets?: readonly { label: string; from: string; to: string }[];
};

/**
 * A numeric from/to pair. Same `between` reasoning as `dateRange`.
 *
 * Two inputs rather than a slider: app-shell has no `Slider`, and a slider is
 * the wrong control for an ERP anyway — "between 40 and 60" is typed in one
 * gesture and dragged in four.
 */
export type NumberRangeSection<TField extends string = string> = SectionBase & {
  control: "numberRange";
  field: TField;
  min?: number;
  max?: number;
  step?: number;
  /** Rendered after each input — "units", "$". */
  unit?: ReactNode;
};

/**
 * A true/false axis, with a third "no constraint" state.
 *
 * Three states and not a checkbox: a lone checkbox can only say "true" or
 * "unset", so "show me the ones that are NOT on Shopify" becomes unaskable.
 */
export type BooleanSection<TField extends string = string> = SectionBase & {
  control: "boolean";
  field: TField;
  operator?: "eq" | "ne";
  trueLabel?: ReactNode;
  falseLabel?: ReactNode;
  /** The "no constraint" row. Default "Any"; `null` removes it. */
  anyLabel?: ReactNode | null;
};

export type FilterRailSection<TField extends string = string> =
  | TextSection<TField>
  | RadioSection<TField>
  | CheckboxSection<TField>
  | DateSection<TField>
  | DateRangeSection<TField>
  | NumberRangeSection<TField>
  | BooleanSection<TField>;

/** Sections whose options can be counted and sorted — the rest have no list. */
export const hasOptions = <TField extends string>(
  section: FilterRailSection<TField>,
): section is RadioSection<TField> | CheckboxSection<TField> =>
  section.control === "radio" || section.control === "checkbox";

// ─── Counts ──────────────────────────────────────────────────────────────────

/**
 * Decision 4. Supplied by the consumer, never computed by the rail.
 *
 * The rail is given a `control` and a section list and never sees a row, so it
 * *cannot* count. Against a real backend these come from an aggregation query
 * anyway — async, cacheable, possibly partial. `useLocalFacetCounts` ships
 * alongside for the in-memory case.
 */
export type FacetCounts = {
  /**
   * `live[sectionId][optionValue]` — rows matching every **other** section's
   * filters plus this option, with this section's own filter excluded. That is
   * standard faceting: the number answers "what would I get if I added this",
   * which is why checking a box never zeroes out its own neighbours.
   *
   * `undefined` for a section means *unknown* — render no numbers and disable
   * nothing. `{}` means *known, and everything is zero*. The distinction lets a
   * backend return counts for some axes and not others.
   */
  live: Record<string, Record<string, number> | undefined>;
  /** The same with no rail filters applied. Stable; drives `"baselineCount"`. */
  baseline?: Record<string, Record<string, number> | undefined>;
  /** Rows matching the full current filter set. */
  total?: number;
  /** Rows if section `id` alone were cleared. Drives zero-result recovery. */
  withoutSection?: Record<string, number>;
};

// ─── Saved filters ───────────────────────────────────────────────────────────

/**
 * A named set of the rail's own filters.
 *
 * Only the rail's fields — never the whole collection state. A page can hold
 * filters the rail does not own (a level scope, a separate search box), and
 * capturing those into something the user named "Low stock AW26" would restore
 * state they never chose.
 *
 * Deliberately *not* a saved **view**: no column visibility, order, pinning or
 * page size. Those belong to the table, are already persisted per `tableId`,
 * and folding them in here would mean applying a filter silently rearranged
 * the columns.
 */
export type SavedFilter = {
  id: string;
  name: string;
  createdAt: string;
  filters: Filter[];
};

/**
 * Storage is the consumer's, like counts.
 *
 * localStorage is private to one browser; a backend table is shared with the
 * team and follows you across devices. That is an application decision, not a
 * component one — `useSavedFilters` ships alongside for the simple case.
 */
export type SavedFilterBinding = {
  items: readonly SavedFilter[];
  onSave: (name: string, filters: Filter[]) => void;
  onDelete: (item: SavedFilter) => void;
};

/** True when two filter sets mean the same thing, regardless of order. */
export const sameFilters = (a: readonly Filter[], b: readonly Filter[]): boolean => {
  const key = (list: readonly Filter[]) =>
    JSON.stringify(
      [...list]
        .map((f) => ({
          field: f.field,
          operator: f.operator,
          // An `in` array is a set — ["A","B"] and ["B","A"] are one filter.
          value: Array.isArray(f.value) ? [...f.value].map(String).sort() : f.value,
        }))
        .sort((x, y) => `${x.field}:${x.operator}`.localeCompare(`${y.field}:${y.operator}`)),
    );
  return key(a) === key(b);
};

// ─── Layout: the part of the rail the USER controls ──────────────────────────

/**
 * The option sorts offered in the settings menu.
 *
 * A deliberate subset of `OptionSort`. `liveCount` is left out because it
 * reorders rows under the cursor whenever an unrelated axis changes — the exact
 * opposite of the muscle memory an exposed rail exists to build — and a
 * comparator function cannot be expressed in a dropdown. Authors keep the full
 * `OptionSort` on the section; this is only what a *user* may choose.
 */
export type UserOptionSort = "given" | "label" | "baselineCount";

export const USER_SORT_LABELS: Record<UserOptionSort, string> = {
  given: "Default",
  label: "A–Z",
  baselineCount: "By count",
};

/**
 * Section order, visibility, and per-section option sort.
 *
 * These are the three things the design spec singled out as mattering to *users* rather than
 * to whoever built the screen: "the order of the filter section … and the sort
 * order of the option values, truncate limit (top Nth values) must be important
 * for users."
 *
 * Authors still declare the defaults on `sections`. This is the user's override
 * on top, and it is a separate object precisely so the two never get confused:
 * an author shipping a new section does not have to migrate anyone's saved
 * layout, and a user resetting does not lose the author's intent.
 */
export type RailLayout = {
  /**
   * Section ids, top to bottom.
   *
   * Ids the author has since added are not listed here, and they keep their
   * authored position relative to each other and follow the listed ones —
   * a new facet appears at the bottom rather than vanishing or jumping to top.
   */
  order: readonly string[];
  /** Section ids the user has switched off. */
  hidden: readonly string[];
  /** Per-section override of the author's `sort`. Checkbox sections only. */
  sort: Readonly<Record<string, UserOptionSort>>;
};

export const EMPTY_RAIL_LAYOUT: RailLayout = { order: [], hidden: [], sort: {} };

/**
 * Storage is the consumer's, exactly as for counts and saved filters.
 * `useRailLayout` ships alongside for the localStorage case.
 */
export type RailLayoutBinding = {
  value: RailLayout;
  onChange: (next: RailLayout) => void;
  /** Back to the authored defaults. Omit and no Reset is offered. */
  onReset?: () => void;
};

/**
 * The authored sections, reordered / filtered / re-sorted by the user's layout.
 *
 * **Never used to compute `railFields`.** A hidden section still owns its field,
 * so `Clear all` and saved filters have to keep seeing it — otherwise hiding a
 * facet would strand its filter somewhere nothing can reach.
 */
export const applyRailLayout = <TField extends string>(
  sections: readonly FilterRailSection<TField>[],
  layout: RailLayout | undefined,
): FilterRailSection<TField>[] => {
  if (!layout) return [...sections];
  const rank = new Map(layout.order.map((id, index) => [id, index]));
  const hidden = new Set(layout.hidden);
  return sections
    .filter((section) => !hidden.has(section.id))
    .map((section, index) => ({ section, index }))
    .sort((a, b) => {
      const ra = rank.get(a.section.id) ?? Number.POSITIVE_INFINITY;
      const rb = rank.get(b.section.id) ?? Number.POSITIVE_INFINITY;
      // `ra - rb` would be NaN for two unranked sections (Infinity - Infinity),
      // which sorts unpredictably. Compare for equality first.
      return ra === rb ? a.index - b.index : ra - rb;
    })
    .map(({ section }) => {
      const chosen = layout.sort[section.id];
      return chosen && section.control === "checkbox" ? { ...section, sort: chosen } : section;
    });
};

// ─── The component ───────────────────────────────────────────────────────────

export type FilterRailProps<TField extends string = string> = {
  /**
   * The same `control` passed to `useDataTable`.
   *
   * A required prop rather than context: the rail sits outside `DataTable.Root`,
   * so the provider the table installs for its own children never reaches it.
   * Reading context would force consumers to wrap the whole `Layout` in an outer
   * `CollectionControlProvider`, which then double-wraps the table — a footgun
   * app-shell's own docs warn about.
   */
  control: CollectionControl<TField>;
  /** Top to bottom. This array **is** the order (decision 2). */
  sections: readonly FilterRailSection<TField>[];
  /** Absent ⇒ no numbers, nothing disabled. */
  counts?: FacetCounts;
  /**
   * What to do with an option whose live count is zero. Default `"disable"`.
   *
   * There is no `"hide"`. Removing zero-count options reshuffles every row below
   * them on each click, which destroys the stable layout that makes an exposed
   * rail worth having — and it destroys information, because "this category has
   * nothing active" is an answer. A **selected** option is never disabled, since
   * that is the only way to unselect it.
   */
  zeroBehavior?: "disable" | "show";
  /** 32px rows (default) or 40px. the design spec calls for density over the 44px
   *  touch minimum: this is a mouse-driven ERP. */
  density?: "compact" | "comfortable";
  /** Heading. Default "Filters". */
  title?: ReactNode;
  /**
   * Named filter sets. Omit and the dropdown and save button never render.
   *
   * The button is deliberately only shown once something is selected: an empty
   * filter set is not worth naming, and a permanently-visible Save is a button
   * that is usually a no-op.
   */
  saved?: SavedFilterBinding;
  /**
   * User control over section order, visibility and option sort.
   *
   * Omit and the settings button never renders — the rail is exactly what the
   * author declared, which is the right default for a screen whose facets were
   * chosen deliberately.
   */
  layout?: RailLayoutBinding;
  /** Fires after the rail applies a change. */
  onFilterChange?: (next: Filter<TField>[], changed: readonly TField[]) => void;
  className?: string;
};

// ─── Helpers shared by the sections ──────────────────────────────────────────

/** Every field the rail owns — so "Clear all" never touches anyone else's. */
export const railFields = <TField extends string>(
  sections: readonly FilterRailSection<TField>[],
): Set<TField> => new Set(sections.map((section) => section.field));

/**
 * Dev-only. Two sections on one field silently clobber each other, because
 * `addFilter` upserts by field — a bug that presents as "the rail randomly
 * forgets my selection".
 */
export const assertRailCoherent = <TField extends string>(
  sections: readonly FilterRailSection<TField>[],
): void => {
  const seenField = new Map<string, string>();
  const seenId = new Set<string>();
  for (const section of sections) {
    if (seenId.has(section.id)) {
      console.error(`FilterRail: duplicate section id "${section.id}"`);
    }
    seenId.add(section.id);
    const owner = seenField.get(section.field);
    if (owner) {
      console.error(
        `FilterRail: sections "${owner}" and "${section.id}" both filter "${section.field}". ` +
          "addFilter upserts by field, so they will overwrite each other.",
      );
    }
    seenField.set(section.field, section.id);
  }
};
