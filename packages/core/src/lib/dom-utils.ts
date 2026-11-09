import type { Ref } from "react";

/** Joins element ids for `aria-labelledby` / `aria-describedby`, or `undefined` when there are none. */
export function joinIds(...ids: Array<string | null | undefined | false>): string | undefined {
  return ids.filter(Boolean).join(" ") || undefined;
}

/** Writes `value` to a callback or object ref. */
export function assignRef<T>(ref: Ref<T | null> | undefined, value: T | null): void {
  if (!ref) return;
  if (typeof ref === "function") ref(value);
  else ref.current = value;
}
