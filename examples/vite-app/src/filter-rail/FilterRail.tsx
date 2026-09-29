// ✅ Reusable Component: `FilterRail` — an always-visible faceted filter rail.
//
// The proposed component. See `types.ts` for the API and
// `docs/filter-rail-proposal.md` for the pitch.

import { useEffect, useMemo, useState } from "react";
import { Bookmark, Check, ChevronDown, Trash2 } from "lucide-react";
import { Button, Dialog, Input, Menu, type Filter } from "@tailor-platform/app-shell";
import {
  ClearLink,
  HOVER_SCROLLBAR,
  OptionRow,
  OptionSearch,
  RadioRow,
  RailSection,
  ROW_COMFORTABLE,
  ROW_COMPACT,
  ShowMore,
  useShowMore,
} from "./internals";
import { BooleanControl, DateControl, DateRangeControl, NumberRangeControl } from "./controls";
import { RailSettings } from "./RailSettings";
import {
  applyRailLayout,
  assertRailCoherent,
  railFields,
  type SavedView,
  type CheckboxSection,
  type FacetOption,
  type FilterRailProps,
  type FilterRailSection,
  type RadioSection,
  type TextSection,
} from "./types";

// ─── Shared helpers ──────────────────────────────────────────────────────────

const filterFor = (filters: readonly Filter[], field: string) =>
  filters.find((filter) => filter.field === field);

/**
 * Every mutation goes through ONE `setFilters` computed from the live list.
 *
 * Never a loop of `addFilter`: those calls do not compose within a tick — they
 * all resolve against the same snapshot, so only the last one lands. The same
 * trap `pages/sku-lookup/page.tsx` documents at length for `toggleColumn`.
 */
const commit = (
  control: FilterRailProps["control"],
  field: string,
  next: Filter | null,
  onFilterChange?: FilterRailProps["onFilterChange"],
) => {
  const without = control.filters.filter((filter) => filter.field !== field);
  const result = next ? [...without, next] : without;
  control.setFilters(result);
  onFilterChange?.(result, [field]);
};

const sortOptions = (
  options: readonly FacetOption[],
  section: CheckboxSection,
  live: Record<string, number> | undefined,
  baseline: Record<string, number> | undefined,
): FacetOption[] => {
  const sort = section.sort ?? "given";
  const list = [...options];
  if (typeof sort === "function") {
    return list.sort((a, b) => sort(a, b, { a: live?.[a.value] ?? 0, b: live?.[b.value] ?? 0 }));
  }
  if (sort === "label") return list.sort((a, b) => a.label.localeCompare(b.label));
  if (sort === "baselineCount" || sort === "liveCount") {
    const source = sort === "baselineCount" ? baseline : live;
    return list.sort(
      (a, b) =>
        (source?.[b.value] ?? 0) - (source?.[a.value] ?? 0) || a.label.localeCompare(b.label),
    );
  }
  return list; // "given" — a curated vocabulary must not be reordered.
};

// ─── Sections ────────────────────────────────────────────────────────────────

const TextControl = ({
  section,
  control,
  rowHeight,
  onFilterChange,
}: {
  section: TextSection;
  control: FilterRailProps["control"];
  rowHeight: string;
  onFilterChange?: FilterRailProps["onFilterChange"];
}) => {
  const applied = filterFor(control.filters, section.field);
  const appliedValue = typeof applied?.value === "string" ? applied.value : "";
  const [draft, setDraft] = useState(appliedValue);

  // Keep in step when the filter changes from elsewhere — Clear all, a shared
  // URL, the back button.
  useEffect(() => setDraft(appliedValue), [appliedValue]);

  // Debounced: every commit resets pagination, so an undebounced input would
  // reset the page on each keystroke.
  useEffect(() => {
    const trimmed = draft.trim();
    if (trimmed === appliedValue) return;
    const timer = window.setTimeout(() => {
      const min = section.minLength ?? 1;
      commit(
        control,
        section.field,
        trimmed.length >= min
          ? { field: section.field, operator: section.operator, value: trimmed }
          : null,
        onFilterChange,
      );
    }, section.debounceMs ?? 250);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft, appliedValue]);

  return (
    <input
      type="search"
      value={draft}
      placeholder={section.placeholder}
      onChange={(event) => setDraft(event.target.value)}
      className={`w-full rounded-md border border-border bg-transparent px-2 text-sm outline-none focus-visible:border-ring ${rowHeight}`}
    />
  );
};

const RadioControl = ({
  section,
  control,
  counts,
  rowHeight,
  onFilterChange,
}: {
  section: RadioSection;
  control: FilterRailProps["control"];
  counts: Record<string, number> | undefined;
  rowHeight: string;
  onFilterChange?: FilterRailProps["onFilterChange"];
}) => {
  const applied = filterFor(control.filters, section.field);
  const current = typeof applied?.value === "string" ? applied.value : null;
  const operator = section.operator ?? "eq";

  return (
    <div role="radiogroup" aria-label={String(section.id)}>
      {section.anyLabel !== null && (
        <RadioRow
          name={section.id}
          label={typeof section.anyLabel === "string" ? section.anyLabel : "Any"}
          checked={current === null}
          rowHeight={rowHeight}
          onSelect={() => commit(control, section.field, null, onFilterChange)}
        />
      )}
      {section.options.map((option) => (
        <RadioRow
          key={option.value}
          name={section.id}
          label={option.label}
          count={counts ? (counts[option.value] ?? 0) : undefined}
          checked={current === option.value}
          rowHeight={rowHeight}
          onSelect={() =>
            commit(
              control,
              section.field,
              { field: section.field, operator, value: option.value },
              onFilterChange,
            )
          }
        />
      ))}
    </div>
  );
};

const CheckboxControl = ({
  section,
  control,
  live,
  baseline,
  zeroBehavior,
  rowHeight,
  onFilterChange,
}: {
  section: CheckboxSection;
  control: FilterRailProps["control"];
  live: Record<string, number> | undefined;
  baseline: Record<string, number> | undefined;
  zeroBehavior: "disable" | "show";
  rowHeight: string;
  onFilterChange?: FilterRailProps["onFilterChange"];
}) => {
  const applied = filterFor(control.filters, section.field);
  const selected = useMemo(
    () => new Set(Array.isArray(applied?.value) ? (applied.value as string[]) : []),
    [applied],
  );
  const { expanded, toggle } = useShowMore();
  const [query, setQuery] = useState("");

  const operator = section.operator ?? "in";
  const limit = section.truncate === false ? Number.POSITIVE_INFINITY : (section.truncate ?? 8);
  const threshold = section.searchThreshold === false ? Infinity : (section.searchThreshold ?? 12);

  const ordered = useMemo(() => {
    const sorted = sortOptions(section.options, section, live, baseline);
    if (!section.pinned?.length) return sorted;
    const rank = new Map(section.pinned.map((value, index) => [value, index]));
    // Pinned options hold the top in their declared order — the stable
    // muscle-memory lever, independent of counts and of selection.
    return [
      ...sorted
        .filter((o) => rank.has(o.value))
        .sort((a, b) => rank.get(a.value)! - rank.get(b.value)!),
      ...sorted.filter((o) => !rank.has(o.value)),
    ];
  }, [section, live, baseline]);

  /**
   * Decision 6, by the other door.
   *
   * The section's own search box hides options too, and a selected option hidden
   * by a query is exactly the hidden state decision 6 forbids: the table stays
   * filtered by a value that is nowhere on screen, with no way to untick it.
   *
   * Reproduced before this existed: tick ARMY GREEN, type "blue", and the rail
   * showed only DUSTY BLUE and LIGHT BLUE while the URL still carried
   * `f.color:in=["ARMY GREEN"]`.
   *
   * Stranded selections go **first**, not last — they are active state, and the
   * head of the list is the one place truncation can never drop them.
   */
  const matching = useMemo(() => {
    if (!query) return ordered;
    const needle = query.toLowerCase();
    const hits = ordered.filter((o) => o.label.toLowerCase().includes(needle));
    const shown = new Set(hits.map((o) => o.value));
    const stranded = ordered.filter((o) => selected.has(o.value) && !shown.has(o.value));
    return [...stranded, ...hits];
  }, [ordered, query, selected]);

  /**
   * Decisions 5 and 6 together.
   *
   * Truncation hides options, never *state*: a selected option is always
   * rendered even when it falls outside the top N. Without this, selecting an
   * unpopular value and then narrowing another axis would push an active filter
   * off screen — precisely the hidden state decision 6 forbids.
   */
  const visible = useMemo(() => {
    if (expanded || matching.length <= limit) return matching;
    const head = matching.slice(0, limit);
    const shown = new Set(head.map((o) => o.value));
    const strandedSelections = matching.filter((o) => selected.has(o.value) && !shown.has(o.value));
    return [...head, ...strandedSelections];
  }, [matching, limit, expanded, selected]);

  const hiddenCount = matching.length - visible.length;

  const toggleOption = (value: string) => {
    const next = new Set(selected);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    // An empty `in` array would serialise as `{ in: [] }` and match nothing —
    // remove the filter instead.
    commit(
      control,
      section.field,
      next.size ? { field: section.field, operator, value: [...next] } : null,
      onFilterChange,
    );
  };

  return (
    <>
      {ordered.length > threshold && (
        <OptionSearch value={query} onChange={setQuery} label={`Filter ${section.id} options`} />
      )}
      {visible.map((option) => {
        // `undefined` means "this axis is unknown", which is a property of the
        // whole section — so once the section's map exists, an option missing
        // from it has zero matches, not unknown ones. Without this an option
        // that matches nothing renders blank and stays clickable, which is
        // exactly the empty result decision 4 exists to prevent.
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
            disabled={zero || Boolean(option.disabledReason)}
            title={option.disabledReason ?? option.note}
            rowHeight={rowHeight}
            onToggle={() => toggleOption(option.value)}
          />
        );
      })}
      {visible.length === 0 && (
        <p className="px-2 py-1 text-xs text-muted-foreground">No matching values</p>
      )}
      <ShowMore hidden={hiddenCount} expanded={expanded} onToggle={toggle} />
    </>
  );
};

// ─── Saved views ─────────────────────────────────────────────────────────────

/** The dropdown at the top of the rail. Always visible, like everything else. */
const SavedViewPicker = ({
  items,
  appliedId,
  onApply,
  onDelete,
  describe,
}: {
  items: readonly SavedView[];
  appliedId: string | null;
  onApply: (item: SavedView) => void;
  onDelete: (item: SavedView) => void;
  describe?: (item: SavedView) => string;
}) => {
  const applied = items.find((item) => item.id === appliedId) ?? null;
  return (
    <Menu.Root>
      <Menu.Trigger
        render={
          // `data-slot="button"` is load-bearing: the theme restyles outline
          // buttons through that selector, and Base UI's Menu.Trigger otherwise
          // relabels the element `menu-trigger`. Raised with the app-shell team.
          <Button variant="outline" size="xs" className="w-full justify-start" data-slot="button">
            <Bookmark className="size-3.5 shrink-0" aria-hidden />
            <span className="truncate">{applied ? applied.name : "Saved views"}</span>
            {!applied && items.length > 0 && (
              <span className="shrink-0 text-muted-foreground">({items.length})</span>
            )}
            <ChevronDown className="ml-auto size-3.5 shrink-0 opacity-60" aria-hidden />
          </Button>
        }
      />
      {/* Match the trigger rather than the content. Base UI publishes the
          anchor's width as `--anchor-width` on the popup, so this tracks the
          rail if its column width ever changes — a hardcoded 294px would not.
          Left to itself the menu sizes to its longest name, which under a
          full-width trigger reads as a misalignment rather than a menu.

          An inline style, and it has to be. `min-w-[var(--anchor-width)]` as a
          class loses: `Menu.Content` already carries `astw:min-w-[8rem]`, both
          are single-class selectors of equal specificity, and app-shell's
          stylesheet is loaded after ours — so source order decides and 128px
          wins. Measured: the popup sat at 171px under a 294px trigger with the
          class applied and ignored. Inline beats every class regardless of
          order. `minWidth` rather than `width` so a long saved-filter name can
          still push it wider. */}
      <Menu.Content style={{ minWidth: "var(--anchor-width)" }}>
        {items.length === 0 ? (
          <Menu.Item disabled>No saved views yet</Menu.Item>
        ) : (
          <Menu.Group>
            {items.map((item) => (
              <Menu.Item key={item.id} onClick={() => onApply(item)}>
                <span className="flex w-full items-center gap-2">
                  <span className="w-3.5 shrink-0">
                    {item.id === appliedId && <Check className="size-3.5" aria-hidden />}
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate">{item.name}</span>
                    {/* What the view actually restores. Without it a list of
                        names says nothing about why you would pick one. */}
                    {describe && (
                      <span className="truncate text-[11px] text-muted-foreground">
                        {describe(item)}
                      </span>
                    )}
                  </span>
                  <span
                    role="button"
                    tabIndex={0}
                    aria-label={`Delete ${item.name}`}
                    className="shrink-0 rounded p-0.5 text-muted-foreground hover:text-destructive"
                    onClick={(event) => {
                      event.stopPropagation();
                      onDelete(item);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.stopPropagation();
                        onDelete(item);
                      }
                    }}
                  >
                    <Trash2 className="size-3.5" aria-hidden />
                  </span>
                </span>
              </Menu.Item>
            ))}
          </Menu.Group>
        )}
      </Menu.Content>
    </Menu.Root>
  );
};

// ─── Root ────────────────────────────────────────────────────────────────────

export const FilterRail = <TField extends string = string>({
  control,
  sections,
  counts,
  zeroBehavior = "disable",
  density = "compact",
  title = "Filters",
  saved,
  layout,
  onFilterChange,
  className,
}: FilterRailProps<TField>) => {
  const [naming, setNaming] = useState(false);
  const [draftName, setDraftName] = useState("");
  useEffect(() => {
    if (import.meta.env?.DEV) assertRailCoherent(sections);
  }, [sections]);

  const rowHeight = density === "compact" ? ROW_COMPACT : ROW_COMFORTABLE;

  // `TField` is narrowed by the caller, but every internal here is string-keyed
  // by nature — a section's `field` IS a string. Widening once at the boundary
  // is clearer than threading the type parameter through five components to
  // describe something none of them vary on.
  const anyControl = control as unknown as FilterRailProps["control"];
  const anyOnChange = onFilterChange as FilterRailProps["onFilterChange"];
  // `owned` is computed from the AUTHOR's sections, never the laid-out ones: a
  // hidden section still owns its field, so `Clear all` and saved filters have
  // to keep seeing it.
  const owned = useMemo(() => railFields(sections), [sections]);
  const activeCount = control.filters.filter((filter) => owned.has(filter.field as TField)).length;

  /** What the user actually sees — the author's list under their layout. */
  const visibleSections = useMemo(
    () => applyRailLayout(sections, layout?.value),
    [sections, layout?.value],
  );

  /** Section ids carrying a filter. Drives the "cannot hide this" lock. */
  const filteredSections = useMemo(
    () =>
      new Set(
        sections
          .filter((section) => control.filters.some((filter) => filter.field === section.field))
          .map((section) => section.id),
      ),
    [sections, control.filters],
  );

  /**
   * The way out of an empty result.
   *
   * Decision 4 is "nobody filters into an empty result" — disabling zero-count
   * options stops you *walking* into one, but says nothing once you are already
   * there (a text filter, a shared URL, or a saved set against changed data can
   * all land you on zero). `withoutSection[id]` is what the collection would
   * hold if section `id` alone were cleared, and it already falls out of the
   * counts pass for free, so naming the single most productive thing to undo
   * costs nothing.
   *
   * Only sections that actually carry a filter are offered — clearing anything
   * else is a no-op that would read as a broken suggestion.
   */
  const recovery = useMemo(() => {
    if (!counts || counts.total !== 0 || activeCount === 0) return [];
    const without = counts.withoutSection;
    if (!without) return [];
    return sections
      .filter((section) => filteredSections.has(section.id) && (without[section.id] ?? 0) > 0)
      .map((section) => ({ section, rows: without[section.id]! }))
      .sort((a, b) => b.rows - a.rows)
      .slice(0, 2);
  }, [counts, activeCount, sections, filteredSections]);

  /**
   * Decision 7, and a correctness point: this must NOT call `clearFilters()`.
   * That would also wipe filters the rail does not own — a level scope, a
   * separate search box on the same page.
   */
  const clearAll = () => {
    const next = control.filters.filter((filter) => !owned.has(filter.field as TField));
    control.setFilters(next);
    onFilterChange?.(next, [...owned]);
  };

  // ── Saved views
  //
  // A view is filters PLUS the table's presentation — column visibility, order,
  // pinning, sort, page size. The rail cannot capture that itself: it sits
  // outside `DataTable.Root` and never sees the table. So the consumer owns
  // capture, restore and the "is the current state saved / has it drifted"
  // comparison, and hands back `activeId` and `dirty`. `useSavedViews` does all
  // three.
  const commitName = () => {
    const name = draftName.trim();
    if (!name || !saved) return;
    saved.onSave(name);
    setNaming(false);
    setDraftName("");
  };

  return (
    /**
     * `overflow-hidden` on the shell, and the scroll on the section list
     * instead of the root.
     *
     * Two reasons, both visible when it is wrong. A rounded container whose
     * child paints a background does not clip that child unless the parent
     * hides its overflow — so the first section's header squares off the top
     * corners. And putting the scroll on the root scrolls the title and
     * "Clear all" away with the sections, which breaks decision 7: undoing must
     * never be harder to reach than doing.
     */
    <aside
      aria-label={typeof title === "string" ? title : "Filters"}
      className={`flex flex-col overflow-hidden rounded-md border border-border bg-card ${className ?? ""}`}
    >
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border px-3 py-2.5">
        <h2 className="text-sm font-semibold">{title}</h2>
        <div className="flex shrink-0 items-center gap-2">
          {activeCount > 0 && <ClearLink onClick={clearAll}>Clear all</ClearLink>}
          {layout && (
            <RailSettings
              sections={sections as readonly FilterRailSection[]}
              layout={layout}
              filtered={filteredSections}
              onHideFiltered={(sectionId) => {
                const section = sections.find((candidate) => candidate.id === sectionId);
                if (section) commit(anyControl, section.field, null, anyOnChange);
              }}
            />
          )}
        </div>
      </div>

      {saved && (
        <div className="shrink-0 border-b border-border px-3 py-2">
          <SavedViewPicker
            items={saved.items}
            appliedId={saved.activeId}
            describe={saved.describe}
            onApply={saved.onApply}
            onDelete={saved.onDelete}
          />
        </div>
      )}

      {recovery.length > 0 && (
        <div
          role="status"
          // Amber, not the accent. This is the one place the rail reports that
          // something is wrong, and in the accent it read as just another
          // selected row — the same colour the selected options use two
          // centimetres below. The theme has no `--warning` token, so this uses
          // Tailwind's amber scale directly, tinted at 10% so the text keeps the
          // foreground colour and stays legible in both themes.
          className="shrink-0 border-b border-amber-500/30 bg-amber-500/10 px-3 py-2.5"
        >
          <p className="text-xs font-medium">Nothing matches these filters.</p>
          <div className="mt-1.5 flex flex-col items-start gap-1">
            {recovery.map(({ section, rows }) => (
              <button
                key={section.id}
                type="button"
                onClick={() => commit(anyControl, section.field, null, anyOnChange)}
                className="rounded text-xs font-medium text-amber-700 underline-offset-2 hover:underline dark:text-amber-400"
              >
                Clear {String(section.label).toLowerCase()} to see {rows.toLocaleString()}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* A form so Enter inside the text inputs is caught rather than reloading
          the page. Not a semantic claim — the rail has no submit. */}
      <form
        className={`min-h-0 flex-1 overflow-y-auto ${HOVER_SCROLLBAR}`}
        onSubmit={(event) => event.preventDefault()}
      >
        {visibleSections.map((section: FilterRailSection<TField>) => {
          const live = counts?.live[section.id];
          const applied = filterFor(control.filters, section.field);
          return (
            <RailSection
              key={section.id}
              label={section.label}
              hint={section.hint}
              action={
                // Every section kind can hold a filter, so every one gets the
                // per-section Clear (decision 7). It used to be checkbox-only,
                // which left a date or a range with no way back except
                // emptying the control by hand.
                applied && (section.control !== "checkbox" || section.clearable !== false) ? (
                  <ClearLink onClick={() => commit(anyControl, section.field, null, anyOnChange)}>
                    Clear
                  </ClearLink>
                ) : undefined
              }
            >
              {section.control === "text" && (
                <TextControl
                  section={section}
                  control={anyControl}
                  rowHeight={rowHeight}
                  onFilterChange={anyOnChange}
                />
              )}
              {section.control === "radio" && (
                <RadioControl
                  section={section}
                  control={anyControl}
                  counts={live}
                  rowHeight={rowHeight}
                  onFilterChange={anyOnChange}
                />
              )}
              {section.control === "checkbox" && (
                <CheckboxControl
                  section={section}
                  control={anyControl}
                  live={live}
                  baseline={counts?.baseline?.[section.id]}
                  zeroBehavior={zeroBehavior}
                  rowHeight={rowHeight}
                  onFilterChange={anyOnChange}
                />
              )}
              {section.control === "date" && (
                <DateControl
                  section={section}
                  control={anyControl}
                  onFilterChange={anyOnChange}
                  commit={commit}
                />
              )}
              {section.control === "dateRange" && (
                <DateRangeControl
                  section={section}
                  control={anyControl}
                  onFilterChange={anyOnChange}
                  commit={commit}
                />
              )}
              {section.control === "numberRange" && (
                <NumberRangeControl
                  section={section}
                  control={anyControl}
                  onFilterChange={anyOnChange}
                  commit={commit}
                />
              )}
              {section.control === "boolean" && (
                <BooleanControl
                  section={section}
                  control={anyControl}
                  rowHeight={rowHeight}
                  onFilterChange={anyOnChange}
                  commit={commit}
                />
              )}
            </RailSection>
          );
        })}
      </form>

      {/*
        Pinned by layout, not `position: sticky` — the rail is already a flex
        column whose middle scrolls, so a `shrink-0` sibling sits at the bottom
        for free and cannot overlap the last section.

        Only rendered once something is selected: an empty filter set is not
        worth naming, and a permanently-visible Save is a button that is usually
        a no-op. When the current set already *is* a saved filter it is hidden
        too, since there is nothing to save.
      */}
      {saved?.dirty && (
        <div className="shrink-0 border-t border-border p-2">
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            data-slot="button"
            onClick={() => {
              setDraftName("");
              setNaming(true);
            }}
          >
            <Bookmark className="size-3.5" aria-hidden />
            Save this view
          </Button>
        </div>
      )}

      <Dialog.Root open={naming} onOpenChange={setNaming}>
        <Dialog.Content className="sm:max-w-md">
          <Dialog.Header>
            <Dialog.Title>Save this view</Dialog.Title>
            {/* Say what a view actually carries. "3 filters will be saved"
                was true of saved filters and is now a lie by omission — the
                column layout goes with it, and someone who does not expect
                that will be surprised when applying a view rearranges their
                table. */}
            <Dialog.Description>
              Filters, sort, and the column layout will be saved under this name.
            </Dialog.Description>
          </Dialog.Header>
          <div className="py-2">
            <Input
              autoFocus
              placeholder="e.g. Low stock, wide view"
              value={draftName}
              onChange={(event) => setDraftName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") commitName();
              }}
            />
          </div>
          <Dialog.Footer>
            <Button variant="outline" onClick={() => setNaming(false)}>
              Cancel
            </Button>
            <Button onClick={commitName} disabled={draftName.trim().length === 0}>
              Save
            </Button>
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog.Root>
    </aside>
  );
};
