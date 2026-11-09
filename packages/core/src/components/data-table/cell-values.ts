import type { SelectOption } from "@/types/collection";
import type { BadgeCellOptions, DataTableFilterConfig } from "./types";

/** The label a choice shows, or the raw value when it isn't one of the choices. */
export function optionLabel(options: readonly SelectOption[] | undefined, value: unknown): unknown {
  if (!options || value == null || value === "") return value;
  return options.find((option) => option.value === String(value))?.label ?? value;
}

/** Choices retain DataTable's edit options, badge labels, then enum-filter fallback. */
export function resolveBadgeOptions(
  options: readonly SelectOption[] | undefined,
  typeOptions: BadgeCellOptions | undefined,
  filter: DataTableFilterConfig | undefined,
): readonly SelectOption[] {
  if (options) return options;
  const labels = typeOptions?.badgeLabelMap;
  if (labels) return Object.entries(labels).map(([value, label]) => ({ value, label }));
  if (filter?.type === "enum") return filter.options;
  return [];
}
