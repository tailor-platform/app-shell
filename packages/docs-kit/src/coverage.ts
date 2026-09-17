import picomatch from "picomatch";

import type { Surface } from "./project";
import type { DocsConfig, Outline } from "./types";

export interface Finding {
  level: "block" | "warn";
  slug: string | null;
  message: string;
}

/** Public export names owned by a code-backed unit — those whose resolved
 * declaration file matches one of the unit's `sources` globs. */
export function ownedSymbols(surface: Surface, sources: string[]): string[] {
  const matchers = sources.map((g) => picomatch(g, { dot: true }));
  const owned: string[] = [];
  for (const sym of surface.symbols.values()) {
    if (sym.external) continue;
    if (matchers.some((m) => m(sym.file))) owned.push(sym.name);
  }
  return owned.sort();
}

/** Reconcile the public surface against all outlines, both directions. */
export function reconcile(
  surface: Surface,
  outlines: Outline[],
  config: DocsConfig,
): { findings: Finding[]; ownedBySlug: Map<string, string[]> } {
  const findings: Finding[] = [];
  const ownedBySlug = new Map<string, string[]>();
  const claimed = new Set<string>();

  for (const o of outlines) {
    if (o.kind === "code-backed") {
      const owned = ownedSymbols(surface, o.frontmatter.sources ?? []);
      ownedBySlug.set(o.slug, owned);
      owned.forEach((n) => claimed.add(n));
      // Reverse check (the "timeline" class of bug): a documented unit that
      // resolves to zero public exports is documenting something unshipped.
      if (owned.length === 0) {
        findings.push({
          level: "block",
          slug: o.slug,
          message: `"${o.slug}" is a code-backed unit but its \`sources\` own no export from index.ts — is it exported?`,
        });
      }
    } else if (o.kind === "reference") {
      const claims = o.frontmatter.claims ?? [];
      ownedBySlug.set(o.slug, claims);
      for (const name of claims) {
        claimed.add(name);
        if (!surface.symbols.has(name)) {
          findings.push({
            level: "block",
            slug: o.slug,
            message: `reference unit "${o.slug}" claims "${name}", which is not exported from index.ts`,
          });
        }
      }
    } else {
      ownedBySlug.set(o.slug, []);
    }
  }

  // Forward check: every public export must be claimed or excluded.
  const excluded = new Set(config.exclusions);
  const uncovered: string[] = [];
  for (const name of surface.symbols.keys()) {
    if (!claimed.has(name) && !excluded.has(name)) uncovered.push(name);
  }
  if (uncovered.length > 0) {
    findings.push({
      level: config.enforceCoverage ? "block" : "warn",
      slug: null,
      message:
        `${uncovered.length} public export(s) undocumented` +
        `${config.enforceCoverage ? "" : " (coverage not yet enforced)"}: ` +
        uncovered.sort().join(", "),
    });
  }

  return { findings, ownedBySlug };
}
