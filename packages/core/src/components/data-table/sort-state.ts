import type { SortState } from "@/types/collection";

export function updateSortStates(
  states: SortState[],
  field: string,
  direction: "Asc" | "Desc" | undefined,
  multiple = false,
): SortState[] {
  if (direction === undefined) {
    return states.filter((sort) => sort.field !== field);
  }
  if (states.some((sort) => sort.field === field)) {
    return states.map((sort) => (sort.field === field ? { ...sort, direction } : sort));
  }
  const next: SortState = { field, direction };
  return multiple ? [...states, next] : [next];
}
