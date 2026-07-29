import { createHash } from "node:crypto";

/** Short, stable content hash. 16 hex chars keeps the manifest readable while
 * remaining collision-safe for our scale. */
export function hash(input: string): string {
  return createHash("sha256").update(input).digest("hex").slice(0, 16);
}

/** Normalize text so that formatting churn (line wrapping, indentation, blank
 * lines — e.g. from oxfmt) never moves a hash; only content changes do. All
 * whitespace runs collapse to a single space. */
export function normalizeText(input: string): string {
  return input.replace(/\s+/g, " ").trim();
}
