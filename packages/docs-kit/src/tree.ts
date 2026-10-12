import { existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

/** Every `.md` under `dir`, recursively. A missing dir yields nothing. */
export function walkMarkdown(dir: string, out: string[] = []): string[] {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walkMarkdown(full, out);
    else if (name.endsWith(".md")) out.push(full);
  }
  return out;
}

/** Generated-tree files that no outline produces. Every `.md` under an output
 * root must trace back to a unit; whatever is left was hand-authored in the
 * wrong place and would never be regenerated — the failure mode that let a
 * component doc get written straight into `docs/`. */
export function unmanagedOutputs(found: string[], managed: Iterable<string>): string[] {
  const known = new Set(managed);
  return found.filter((f) => !known.has(f)).toSorted();
}
