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
  return owned.toSorted();
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
    const owned =
      o.kind === "code-backed" ? ownedSymbols(surface, o.frontmatter.sources ?? []) : [];

    // Reverse check (the timeline-class bug): a code-backed unit that resolves
    // to zero public exports is documenting something unshipped.
    if (o.kind === "code-backed" && owned.length === 0) {
      findings.push({
        level: "block",
        slug: o.slug,
        message: `"${o.slug}" is a code-backed unit but its \`sources\` own no export from index.ts — is it exported?`,
      });
    }

    // `claims` is orthogonal to kind: a code-backed unit may hash what its
    // sources own AND claim the re-exports its prose covers.
    const claims = o.frontmatter.claims ?? [];
    for (const name of claims) {
      const symbol = surface.symbols.get(name);
      if (!symbol) {
        findings.push({
          level: "block",
          slug: o.slug,
          message: `claims "${name}", which is not exported from index.ts`,
        });
        continue;
      }
      if (!symbol.external) {
        findings.push({
          level: "warn",
          slug: o.slug,
          message: `claims "${name}" by name, but it is first-party — a \`sources\` glob would keep it type-surface gated.`,
        });
      }
    }

    // `ownedBySlug` stays first-party only: it feeds the type-surface hash and
    // the generated prop tables, and hashing a node_modules signature would
    // make every dependency bump look like documentation drift.
    ownedBySlug.set(o.slug, owned);
    owned.forEach((n) => claimed.add(n));
    claims.forEach((n) => claimed.add(n));
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
        uncovered.toSorted().join(", "),
    });
  }

  return { findings, ownedBySlug };
}
