import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

import matter from "gray-matter";
import picomatch from "picomatch";

import type { Finding } from "./coverage";
import type { DocsConfig, Outline, OutlineFrontmatter, UnitKind } from "./types";

const OUTLINE_SUFFIX = ".docs.outline.md";

const KINDS: UnitKind[] = ["code-backed", "prose"];

/** The closed schema's key set. A key outside it blocks, so a mistyped
 * `sourcs:` or `clams:` can never read as an absent one. */
export const OUTLINE_KEYS = new Set([
  "kind",
  "group",
  "title",
  "description",
  "sources",
  "claims",
  "upstream",
  // Presentation metadata for pattern/page units, consumed by skill.ts.
  "slug",
  "name",
  "category",
  "subcategory",
  "requiredImports",
  "tags",
  "do",
  "dont",
]);

const REQUIRED_STRINGS = ["group", "title", "description"] as const;

function toPosix(p: string): string {
  return p.split("\\").join("/");
}

function walk(dir: string, out: string[] = []): string[] {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === "dist" || name.startsWith(".")) continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (name.endsWith(OUTLINE_SUFFIX)) out.push(full);
  }
  return out;
}

/** Validate one outline's frontmatter against the closed schema. An empty
 * result means it is safe to treat as an `OutlineFrontmatter`. */
export function validateFrontmatter(data: unknown, outlineRel: string): Finding[] {
  const findings: Finding[] = [];
  const at = (message: string): Finding => ({ level: "block", slug: outlineRel, message });

  if (typeof data !== "object" || data === null) {
    return [at("frontmatter is missing or not a mapping.")];
  }
  const fm = data as Record<string, unknown>;

  for (const key of Object.keys(fm)) {
    if (!OUTLINE_KEYS.has(key)) {
      findings.push(at(`unknown frontmatter key \`${key}\` — not part of the outline schema.`));
    }
  }

  const kind = fm.kind;
  if (kind === undefined) {
    findings.push(at("`kind` is required — declare `code-backed` or `prose`."));
  } else if (typeof kind !== "string" || !KINDS.includes(kind as UnitKind)) {
    findings.push(at(`\`kind: ${String(kind)}\` is not valid — use \`code-backed\` or \`prose\`.`));
  }

  for (const key of REQUIRED_STRINGS) {
    const value = fm[key];
    if (typeof value !== "string" || value.trim() === "") {
      findings.push(at(`\`${key}\` is required and must be a non-empty string.`));
    }
  }

  const sources = fm.sources;
  const hasSources = Array.isArray(sources) && sources.length > 0;
  if (sources !== undefined && !Array.isArray(sources)) {
    findings.push(at("`sources` must be a list of globs."));
  } else if (kind === "code-backed" && !hasSources) {
    // Without this the unit silently loses its type-surface gate, and only the
    // coverage check would notice — which is advisory until enforceCoverage.
    findings.push(
      at(
        "`kind: code-backed` requires a non-empty `sources` list — otherwise the unit has no type-surface gate.",
      ),
    );
  } else if (kind === "prose" && hasSources) {
    findings.push(
      at("`sources` is set on a prose unit — declare `kind: code-backed` or remove the globs."),
    );
  }

  if (fm.claims !== undefined && !Array.isArray(fm.claims)) {
    findings.push(at("`claims` must be a list of exported symbol names."));
  }

  return findings;
}

function outDirFor(outlineRel: string, config: DocsConfig): string | null {
  for (const rule of config.categories) {
    if (picomatch(rule.match, { dot: true })(outlineRel)) return rule.outDir;
  }
  return null;
}

export interface DiscoveryResult {
  outlines: Outline[];
  /** Schema violations — always blocking. Callers report these and stop rather
   * than hashing or generating from a malformed outline. */
  findings: Finding[];
}

/** Discover and parse every `*.docs.outline.md` under the configured roots,
 * validating each against the closed frontmatter schema. Examples live in a
 * sibling `*.docs.examples.tsx` (both are authored SOURCE). */
export function discoverOutlines(repoRoot: string, config: DocsConfig): DiscoveryResult {
  const outlines: Outline[] = [];
  const findings: Finding[] = [];

  for (const root of config.roots) {
    for (const outlinePath of walk(join(repoRoot, root))) {
      const outlineRel = toPosix(relative(repoRoot, outlinePath));
      const parsed = matter(readFileSync(outlinePath, "utf8"));

      const schemaFindings = validateFrontmatter(parsed.data, outlineRel);
      if (schemaFindings.length > 0) {
        findings.push(...schemaFindings);
        continue;
      }

      const fm = parsed.data as OutlineFrontmatter;
      const outDir = outDirFor(outlineRel, config);
      if (!outDir) throw new Error(`docs-kit: no category rule matches outline "${outlineRel}"`);

      outlines.push({
        kind: fm.kind,
        slug: fm.group,
        outlinePath,
        outlineRel,
        frontmatter: fm,
        body: parsed.content,
        outDir,
        mdPath: `${outDir}/${fm.group}.md`,
        // Examples are authored SOURCE, a sibling of the outline, NOT in the
        // generated output dir. sync only ever writes to `${outDir}`.
        examplesPath: outlineRel.replace(/\.docs\.outline\.md$/, ".docs.examples.tsx"),
      });
    }
  }

  // `group` is now the declared slug, so two outlines can collide on it and
  // silently overwrite one output.
  const seen = new Map<string, string>();
  for (const o of outlines) {
    const previous = seen.get(o.slug);
    if (previous) {
      findings.push({
        level: "block",
        slug: o.slug,
        message: `duplicate \`group\` — both ${previous} and ${o.outlineRel} claim this slug.`,
      });
    }
    seen.set(o.slug, o.outlineRel);
  }

  outlines.sort((a, b) => a.slug.localeCompare(b.slug));
  return { outlines, findings };
}
