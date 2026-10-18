import type { CheckboxSection, FilterRailSection, RadioSection, RailLayout } from "./types";

export const EMPTY_RAIL_LAYOUT: RailLayout = { order: [], hidden: [], sort: {} };

/** The fields a section writes. A custom section may own several. */
export const sectionFields = <TField extends string>(
  section: FilterRailSection<TField>,
): readonly TField[] => (section.control === "custom" ? section.fields : [section.field]);

/**
 * Every field the rail owns, so Clear all never touches filters it does not
 * own (a page search box, a scope set elsewhere).
 *
 * Always computed from the **authored** sections: a hidden section still owns
 * its field.
 */
export const railFields = <TField extends string>(
  sections: readonly FilterRailSection<TField>[],
): Set<TField> => new Set(sections.flatMap((section) => sectionFields(section)));

/**
 * Above this many options, a checkbox or radio section is the wrong control:
 * the field's values are open-ended, not a small fixed set.
 */
export const MAX_LISTED_OPTIONS = 50;

/** Sections that list their options — checkbox and radio. */
export const hasOptions = <TField extends string>(
  section: FilterRailSection<TField>,
): section is CheckboxSection<TField> | RadioSection<TField> =>
  section.control === "checkbox" || section.control === "radio";

/** Sections in the user's order. Unranked ids keep authored order at the end. */
export const orderSections = <TSection extends { id: string }>(
  sections: readonly TSection[],
  order: readonly string[],
): TSection[] => {
  const rank = new Map(order.map((id, index) => [id, index]));
  return sections
    .map((section, index) => ({ section, index }))
    .toSorted((a, b) => {
      const ra = rank.get(a.section.id) ?? Number.POSITIVE_INFINITY;
      const rb = rank.get(b.section.id) ?? Number.POSITIVE_INFINITY;
      // `Infinity - Infinity` is NaN, so compare for equality first.
      return ra === rb ? a.index - b.index : ra - rb;
    })
    .map(({ section }) => section);
};

/** The authored sections, reordered / filtered / re-sorted by the user's layout. */
export const applyRailLayout = <TField extends string>(
  sections: readonly FilterRailSection<TField>[],
  layout: RailLayout | undefined,
): FilterRailSection<TField>[] => {
  if (!layout) return [...sections];
  const hidden = new Set(layout.hidden);
  return orderSections(
    sections.filter((section) => !hidden.has(section.id)),
    layout.order,
  ).map((section) => {
    const chosen = layout.sort[section.id];
    return chosen && section.control === "checkbox" ? { ...section, sort: chosen } : section;
  });
};

/**
 * Two sections on one field overwrite each other, because a field holds one
 * filter. Returns the problems so the caller can warn once.
 */
export const findRailProblems = (sections: readonly FilterRailSection[]): string[] => {
  const problems: string[] = [];
  const seenId = new Set<string>();
  const fieldOwner = new Map<string, string>();
  for (const section of sections) {
    if (seenId.has(section.id)) problems.push(`FilterRail: duplicate section id "${section.id}".`);
    seenId.add(section.id);
    for (const field of sectionFields(section)) {
      const owner = fieldOwner.get(field);
      if (owner && owner !== section.id) {
        problems.push(
          `FilterRail: sections "${owner}" and "${section.id}" both filter "${field}". ` +
            "A field holds one filter, so they will overwrite each other.",
        );
      }
      fieldOwner.set(field, section.id);
    }
    // Checkbox and radio lists are for small, fixed sets (status, category).
    // A field whose values keep growing (product names, customers) belongs in
    // a search, not an ever-longer list.
    if (hasOptions(section) && section.options.length > MAX_LISTED_OPTIONS) {
      problems.push(
        `FilterRail: section "${section.id}" lists ${section.options.length} options. ` +
          "Checkbox and radio sections are for small, fixed sets of values. For a field whose " +
          'values keep growing (names, customers, suppliers), use a `control: "text"` section ' +
          "or a searchable custom section instead.",
      );
    }
  }
  return problems;
};
