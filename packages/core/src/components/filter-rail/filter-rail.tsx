import { useCallback, useEffect, useMemo, useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { CollectionControl, Filter } from "@/types/collection";
import { applyRailLayout, findRailProblems, railFields, sectionFields } from "./apply-layout";
import { DateControl, DateRangeControl, NumberRangeControl } from "./controls";
import {
  FilterRailContext,
  sectionName,
  useFilterRailContext,
  type FilterRailContextValue,
} from "./filter-rail-context";
import { useFilterRailT } from "./i18n";
import { ClearLink, RailSection } from "./internals";
import {
  BooleanControl,
  CheckboxControl,
  CustomControl,
  filterFor,
  RadioControl,
  TextControl,
} from "./sections";
import type { FilterRailRootProps, FilterRailSection } from "./types";

// ─── Root ────────────────────────────────────────────────────────────────────

function Root<TField extends string = string>({
  control,
  sections,
  counts,
  layout,
  zeroBehavior = "disable",
  density = "compact",
  "aria-label": ariaLabel,
  onFilterChange,
  className,
  children,
}: FilterRailRootProps<TField>) {
  const t = useFilterRailT();

  // Widen once at the boundary — every internal is string-keyed by nature.
  const anyControl = control as unknown as CollectionControl;
  const anySections = sections as readonly FilterRailSection[];
  const onChangeRef = useRef(onFilterChange);
  onChangeRef.current = onFilterChange;

  // Dev guard: two sections on one field silently overwrite each other.
  const warned = useRef(new Set<string>());
  useEffect(() => {
    for (const problem of findRailProblems(anySections)) {
      if (warned.current.has(problem)) continue;
      warned.current.add(problem);
      console.warn(problem);
    }
  }, [anySections]);

  const owned = useMemo(() => railFields(anySections), [anySections]);
  const filters = anyControl.filters;
  // The list as of the last write, so two commits in one handler (a custom
  // section setting two fields) compose instead of the second overwriting the
  // first. Re-synced from the control on every render.
  const latest = useRef(filters);
  latest.current = filters;

  // One `setFilters` computed from the live list — a loop of `addFilter` calls
  // would all resolve against the same snapshot, and only the last would land.
  const setFiltersWith = useCallback(
    (fields: readonly string[], next: Filter[]) => {
      latest.current = next;
      anyControl.setFilters(next);
      onChangeRef.current?.(next as Filter<TField>[], fields as readonly TField[]);
    },
    [anyControl],
  );

  const commit = useCallback(
    (field: string, next: Filter | null) => {
      const without = latest.current.filter((filter) => filter.field !== field);
      setFiltersWith([field], next ? [...without, next] : without);
    },
    [setFiltersWith],
  );

  const clearFields = useCallback(
    (fields: readonly string[]) => {
      const drop = new Set(fields);
      const current = latest.current;
      if (!current.some((filter) => drop.has(filter.field))) return;
      setFiltersWith(
        fields,
        current.filter((filter) => !drop.has(filter.field)),
      );
    },
    [setFiltersWith],
  );

  // Must NOT call `clearFilters()` — that would also wipe filters the rail
  // does not own.
  const clearAll = useCallback(() => clearFields([...owned]), [clearFields, owned]);

  const value = useMemo<FilterRailContextValue>(
    () => ({
      control: anyControl,
      sections: anySections,
      counts,
      layout,
      zeroBehavior,
      density,
      owned,
      activeCount: filters.filter((filter) => owned.has(filter.field)).length,
      filteredSections: new Set(
        anySections
          .filter((section) =>
            sectionFields(section).some((field) => filterFor(filters, field) !== undefined),
          )
          .map((section) => section.id),
      ),
      commit,
      clearFields,
      clearAll,
    }),
    [
      anyControl,
      anySections,
      counts,
      layout,
      zeroBehavior,
      density,
      owned,
      filters,
      commit,
      clearFields,
      clearAll,
    ],
  );

  return (
    <FilterRailContext.Provider value={value}>
      <aside
        data-slot="filter-rail"
        aria-label={ariaLabel ?? t("title")}
        className={cn(
          // `overflow-hidden` on the shell and the scroll on Sections, so the
          // header (and Clear all) never scrolls away.
          "astw:flex astw:min-h-0 astw:flex-col astw:overflow-hidden astw:rounded-md astw:border astw:border-border astw:bg-card astw:text-card-foreground",
          className,
        )}
      >
        {children}
      </aside>
    </FilterRailContext.Provider>
  );
}
Root.displayName = "FilterRail.Root";

// ─── Header ──────────────────────────────────────────────────────────────────

type HeaderProps = {
  /** Default "Filters". */
  title?: ReactNode;
  /** Actions on the right — `FilterRail.ClearAll`, `FilterRail.Settings`, or your own. */
  children?: ReactNode;
  className?: string;
};

function Header({ title, children, className }: HeaderProps) {
  const t = useFilterRailT();
  useFilterRailContext("Header");
  return (
    <div
      data-slot="filter-rail-header"
      className={cn(
        "astw:flex astw:shrink-0 astw:items-center astw:justify-between astw:gap-2 astw:border-b astw:border-border astw:px-3 astw:py-2.5",
        className,
      )}
    >
      <h2 className="astw:truncate astw:text-sm astw:font-semibold">{title ?? t("title")}</h2>
      {children && (
        <div className="astw:flex astw:shrink-0 astw:items-center astw:gap-2">{children}</div>
      )}
    </div>
  );
}
Header.displayName = "FilterRail.Header";

// ─── ClearAll ────────────────────────────────────────────────────────────────

type ClearAllProps = {
  /** Default "Clear all". */
  children?: ReactNode;
  className?: string;
};

/** Clears only the rail's own fields. Renders nothing while none are active. */
function ClearAll({ children, className }: ClearAllProps) {
  const t = useFilterRailT();
  const { activeCount, clearAll } = useFilterRailContext("ClearAll");
  if (activeCount === 0) return null;
  return (
    <ClearLink onClick={clearAll} className={className}>
      {children ?? t("clearAll")}
    </ClearLink>
  );
}
ClearAll.displayName = "FilterRail.ClearAll";

// ─── Sections ────────────────────────────────────────────────────────────────

const SectionBody = ({ section }: { section: FilterRailSection }) => {
  switch (section.control) {
    case "text":
      return <TextControl section={section} />;
    case "radio":
      return <RadioControl section={section} />;
    case "checkbox":
      return <CheckboxControl section={section} />;
    case "boolean":
      return <BooleanControl section={section} />;
    case "date":
      return <DateControl section={section} />;
    case "dateRange":
      return <DateRangeControl section={section} />;
    case "numberRange":
      return <NumberRangeControl section={section} />;
    case "custom":
      return <CustomControl section={section} />;
  }
};

/**
 * The way out of an empty result: name the one or two sections whose clearing
 * would bring rows back. Needs `counts.total` and `counts.withoutSection`.
 */
const Recovery = () => {
  const t = useFilterRailT();
  const { counts, activeCount, sections, filteredSections, clearFields } =
    useFilterRailContext("Sections");
  const suggestions = useMemo(() => {
    const without = counts?.withoutSection;
    if (!without || counts?.total !== 0 || activeCount === 0) return [];
    return sections
      .filter((section) => filteredSections.has(section.id) && (without[section.id] ?? 0) > 0)
      .map((section) => ({ section, rows: without[section.id]! }))
      .toSorted((a, b) => b.rows - a.rows)
      .slice(0, 2);
  }, [counts, activeCount, sections, filteredSections]);

  if (suggestions.length === 0) return null;
  return (
    <output
      data-slot="filter-rail-recovery"
      className="astw:block astw:border-b astw:border-border astw:bg-muted astw:px-3 astw:py-2.5"
    >
      <p className="astw:text-xs astw:font-medium">{t("nothingMatches")}</p>
      <div className="astw:mt-1.5 astw:flex astw:flex-col astw:items-start astw:gap-1">
        {suggestions.map(({ section, rows }) => (
          <ClearLink
            key={section.id}
            onClick={() => clearFields(sectionFields(section))}
            className="astw:font-medium astw:text-foreground astw:underline"
          >
            {t("clearToSee", {
              section: sectionName(section),
              count: rows.toLocaleString(),
            })}
          </ClearLink>
        ))}
      </div>
    </output>
  );
};

type SectionsProps = { className?: string };

/** Every section, in the user's layout. Scrolls; the header stays put. */
function Sections({ className }: SectionsProps) {
  const t = useFilterRailT();
  const { sections, layout, filteredSections, clearFields } = useFilterRailContext("Sections");
  const visible = useMemo(() => applyRailLayout(sections, layout?.value), [sections, layout]);

  return (
    // A form so Enter inside a text input does not submit an enclosing form.
    <form
      data-slot="filter-rail-sections"
      className={cn("astw:min-h-0 astw:flex-1 astw:overflow-y-auto", className)}
      onSubmit={(event) => event.preventDefault()}
    >
      <Recovery />
      {visible.map((section) => (
        <RailSection
          key={section.id}
          id={section.id}
          label={section.label}
          hint={section.hint}
          action={
            filteredSections.has(section.id) && section.clearable !== false ? (
              <ClearLink onClick={() => clearFields(sectionFields(section))}>
                {t("clear")}
              </ClearLink>
            ) : undefined
          }
        >
          <SectionBody section={section} />
        </RailSection>
      ))}
    </form>
  );
}
Sections.displayName = "FilterRail.Sections";

export { Root, Header, ClearAll, Sections };
export type { HeaderProps, ClearAllProps, SectionsProps };
