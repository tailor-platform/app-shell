import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import type { Filter } from "@/types/collection";
import { useFilterRailContext, sectionName } from "./filter-rail-context";
import { useFilterRailT } from "./i18n";
import {
  inputClass,
  OptionRow,
  OptionSearch,
  RadioRow,
  rowHeightClass,
  ShowMore,
  useShowMore,
} from "./internals";
import type {
  BooleanSection,
  CheckboxSection,
  CustomSection,
  FacetOption,
  RadioSection,
  TextSection,
} from "./types";

export const filterFor = (filters: readonly Filter[], field: string) =>
  filters.find((filter) => filter.field === field);

/** Row labels are strings for the a11y name; a ReactNode label falls back to `fallback`. */
const text = (value: unknown, fallback: string) =>
  typeof value === "string" || typeof value === "number" ? String(value) : fallback;

export const sortOptions = (
  options: readonly FacetOption[],
  sort: CheckboxSection["sort"],
  live: Record<string, number> | undefined,
  baseline: Record<string, number> | undefined,
): FacetOption[] => {
  const list = [...options];
  const mode = sort ?? "given";
  if (typeof mode === "function") {
    return list.toSorted((a, b) =>
      mode(a, b, { a: live?.[a.value] ?? 0, b: live?.[b.value] ?? 0 }),
    );
  }
  if (mode === "label") return list.toSorted((a, b) => a.label.localeCompare(b.label));
  if (mode === "baselineCount" || mode === "liveCount") {
    const source = mode === "baselineCount" ? baseline : live;
    return list.toSorted(
      (a, b) =>
        (source?.[b.value] ?? 0) - (source?.[a.value] ?? 0) || a.label.localeCompare(b.label),
    );
  }
  return list;
};

// ─── Text ────────────────────────────────────────────────────────────────────

export const TextControl = ({ section }: { section: TextSection }) => {
  const { control, commit, density } = useFilterRailContext("Sections");
  const applied = filterFor(control.filters, section.field);
  const appliedValue = typeof applied?.value === "string" ? applied.value : "";
  const [draft, setDraft] = useState(appliedValue);

  // Follow changes made elsewhere — Clear all, a shared URL, the back button.
  useEffect(() => setDraft(appliedValue), [appliedValue]);

  // Debounced: every commit resets pagination.
  useEffect(() => {
    const trimmed = draft.trim();
    if (trimmed === appliedValue) return;
    const timer = window.setTimeout(() => {
      const min = section.minLength ?? 1;
      commit(
        section.field,
        trimmed.length >= min
          ? { field: section.field, operator: section.operator, value: trimmed }
          : null,
      );
    }, section.debounceMs ?? 250);
    return () => window.clearTimeout(timer);
  }, [draft, appliedValue, section, commit]);

  return (
    <input
      type="search"
      value={draft}
      placeholder={section.placeholder}
      aria-label={sectionName(section)}
      onChange={(event) => setDraft(event.target.value)}
      className={cn(inputClass, rowHeightClass(density))}
    />
  );
};

// ─── Radio ───────────────────────────────────────────────────────────────────

export const RadioControl = ({ section }: { section: RadioSection }) => {
  const t = useFilterRailT();
  const { control, commit, counts, density } = useFilterRailContext("Sections");
  const live = counts?.live[section.id];
  const applied = filterFor(control.filters, section.field);
  const current = typeof applied?.value === "string" ? applied.value : null;
  const operator = section.operator ?? "eq";
  const rowHeight = rowHeightClass(density);

  return (
    <div role="radiogroup" aria-label={sectionName(section)}>
      {section.anyLabel !== null && (
        <RadioRow
          name={section.id}
          label={text(section.anyLabel, t("any"))}
          checked={current === null}
          rowHeight={rowHeight}
          onSelect={() => commit(section.field, null)}
        />
      )}
      {section.options.map((option) => (
        <RadioRow
          key={option.value}
          name={section.id}
          label={option.label}
          count={live ? (live[option.value] ?? 0) : undefined}
          checked={current === option.value}
          rowHeight={rowHeight}
          onSelect={() =>
            commit(section.field, { field: section.field, operator, value: option.value })
          }
        />
      ))}
    </div>
  );
};

// ─── Checkbox ────────────────────────────────────────────────────────────────

export const CheckboxControl = ({ section }: { section: CheckboxSection }) => {
  const t = useFilterRailT();
  const { control, commit, counts, zeroBehavior, density } = useFilterRailContext("Sections");
  const live = counts?.live[section.id];
  const baseline = counts?.baseline?.[section.id];
  const applied = filterFor(control.filters, section.field);
  const selected = useMemo(
    () => new Set(Array.isArray(applied?.value) ? (applied.value as unknown[]).map(String) : []),
    [applied],
  );
  const { expanded, toggle } = useShowMore();
  const [query, setQuery] = useState("");

  const operator = section.operator ?? "in";
  const limit = section.truncate === false ? Number.POSITIVE_INFINITY : (section.truncate ?? 8);
  const threshold =
    section.searchThreshold === false ? Number.POSITIVE_INFINITY : (section.searchThreshold ?? 12);

  const ordered = useMemo(() => {
    const sorted = sortOptions(section.options, section.sort, live, baseline);
    if (!section.pinned?.length) return sorted;
    const rank = new Map(section.pinned.map((value, index) => [value, index]));
    return [
      ...sorted
        .filter((option) => rank.has(option.value))
        .toSorted((a, b) => rank.get(a.value)! - rank.get(b.value)!),
      ...sorted.filter((option) => !rank.has(option.value)),
    ];
  }, [section.options, section.sort, section.pinned, live, baseline]);

  // A selected option hidden by the search query would be an active filter
  // nowhere on screen — keep it, first.
  const matching = useMemo(() => {
    if (!query) return ordered;
    const needle = query.toLowerCase();
    const hits = ordered.filter((option) => option.label.toLowerCase().includes(needle));
    const shown = new Set(hits.map((option) => option.value));
    const stranded = ordered.filter(
      (option) => selected.has(option.value) && !shown.has(option.value),
    );
    return [...stranded, ...hits];
  }, [ordered, query, selected]);

  // Truncation hides options, never state: a selected option outside the top N
  // is still rendered.
  const visible = useMemo(() => {
    if (expanded || matching.length <= limit) return matching;
    const head = matching.slice(0, limit);
    const shown = new Set(head.map((option) => option.value));
    const stranded = matching.filter(
      (option) => selected.has(option.value) && !shown.has(option.value),
    );
    return [...head, ...stranded];
  }, [matching, limit, expanded, selected]);

  const toggleOption = (value: string) => {
    const next = new Set(selected);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    // An empty `in` would match nothing — remove the filter instead.
    commit(section.field, next.size ? { field: section.field, operator, value: [...next] } : null);
  };

  const rowHeight = rowHeightClass(density);

  return (
    <>
      {ordered.length > threshold && (
        <OptionSearch
          value={query}
          onChange={setQuery}
          label={t("searchOptionsLabel", { section: sectionName(section) })}
        />
      )}
      {visible.map((option) => {
        // Once a section's map exists, a missing option has zero matches, not
        // an unknown count.
        const count = live ? (live[option.value] ?? 0) : undefined;
        const isSelected = selected.has(option.value);
        // A selected option is never disabled — it is the only way to unselect it.
        const zero = count === 0 && !isSelected && zeroBehavior === "disable";
        return (
          <OptionRow
            key={option.value}
            label={option.label}
            icon={option.icon}
            count={count}
            checked={isSelected}
            disabled={zero || (Boolean(option.disabledReason) && !isSelected)}
            title={option.disabledReason ?? option.note}
            rowHeight={rowHeight}
            onToggle={() => toggleOption(option.value)}
          />
        );
      })}
      {visible.length === 0 && (
        <p className="astw:px-2 astw:py-1 astw:text-xs astw:text-muted-foreground">
          {t("noMatchingValues")}
        </p>
      )}
      <ShowMore hidden={matching.length - visible.length} expanded={expanded} onToggle={toggle} />
    </>
  );
};

// ─── Boolean ─────────────────────────────────────────────────────────────────

/** Accepts `"true"` / `"false"` too — the URL serializer stringifies booleans. */
const asBoolean = (value: unknown): boolean | null => {
  if (value === true || value === "true") return true;
  if (value === false || value === "false") return false;
  return null;
};

export const BooleanControl = ({ section }: { section: BooleanSection }) => {
  const t = useFilterRailT();
  const { control, commit, density } = useFilterRailContext("Sections");
  const current = asBoolean(filterFor(control.filters, section.field)?.value);
  const operator = section.operator ?? "eq";
  const rowHeight = rowHeightClass(density);

  const set = (next: boolean | null) =>
    commit(section.field, next === null ? null : { field: section.field, operator, value: next });

  return (
    <div role="radiogroup" aria-label={sectionName(section)}>
      {section.anyLabel !== null && (
        <RadioRow
          name={section.id}
          label={text(section.anyLabel, t("any"))}
          checked={current === null}
          rowHeight={rowHeight}
          onSelect={() => set(null)}
        />
      )}
      <RadioRow
        name={section.id}
        label={text(section.trueLabel, t("yes"))}
        checked={current === true}
        rowHeight={rowHeight}
        onSelect={() => set(true)}
      />
      <RadioRow
        name={section.id}
        label={text(section.falseLabel, t("no"))}
        checked={current === false}
        rowHeight={rowHeight}
        onSelect={() => set(false)}
      />
    </div>
  );
};

// ─── Custom ──────────────────────────────────────────────────────────────────

export const CustomControl = ({ section }: { section: CustomSection }) => {
  const { control, commit } = useFilterRailContext("Sections");
  return (
    <>
      {section.render({
        control,
        getFilter: (field) => filterFor(control.filters, field),
        setFilter: (field, next) => commit(field, next ? { ...next, field } : null),
      })}
    </>
  );
};
