export type ColumnPin = "left" | "right";
export type ColumnPinOverride = ColumnPin | "none";
export type ColumnMeta = { id: string; label?: string; pin?: ColumnPin };

export interface PersistedColumnState {
  order: string[];
  hidden: string[];
  pinned: Record<string, ColumnPinOverride>;
}

/** Preserve known saved IDs, then append new definitions without duplicates. */
export function reconcileColumnOrder(
  order: readonly string[],
  columnIds: readonly string[],
): string[] {
  const present = new Set(columnIds);
  const seen = new Set<string>();
  const result: string[] = [];
  for (const id of [...order, ...columnIds]) {
    if (present.has(id) && !seen.has(id)) {
      seen.add(id);
      result.push(id);
    }
  }
  return result;
}

/** Storage is an external input; validate members, not just the containers. */
export function isColumnState(value: unknown): value is PersistedColumnState {
  if (!value || typeof value !== "object") return false;
  const state = value as Record<string, unknown>;
  return (
    Array.isArray(state.order) &&
    state.order.every((id) => typeof id === "string") &&
    Array.isArray(state.hidden) &&
    state.hidden.every((id) => typeof id === "string") &&
    !!state.pinned &&
    typeof state.pinned === "object" &&
    !Array.isArray(state.pinned) &&
    Object.values(state.pinned).every((pin) => pin === "left" || pin === "right" || pin === "none")
  );
}
