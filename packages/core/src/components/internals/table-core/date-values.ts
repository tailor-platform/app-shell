import { parseDate } from "@internationalized/date";

/** Date-only editor output: null clears, undefined is malformed or out of bounds. */
export function parseDateValue(
  value: unknown,
  bounds: { min?: string; max?: string } = {},
): string | null | undefined {
  const min = bounds.min ? parseDate(bounds.min) : undefined;
  const max = bounds.max ? parseDate(bounds.max) : undefined;
  if (min && max && min.compare(max) > 0) throw new Error("Date minimum must not exceed maximum");
  if (value === null) return null;
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  try {
    const date = parseDate(value);
    if ((min && date.compare(min) < 0) || (max && date.compare(max) > 0)) return undefined;
    return date.toString();
  } catch {
    return undefined;
  }
}
