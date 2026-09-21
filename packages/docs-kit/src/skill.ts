import { existsSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";

import type { DocsConfig, Outline } from "./types";

function toPosix(p: string): string {
  return p.split("\\").join("/");
}

/** Generated-doc output dir → skill reference section. Concepts/references are
 * intentionally excluded — the skill covers building UI, not framework prose. */
const SECTION_BY_OUTDIR: Record<string, string> = {
  "docs/concepts": "concepts",
  "docs/components": "components",
  "docs/api": "api",
  "docs/patterns": "patterns",
  "docs/pages": "pages",
};

function mdTable(rows: string[][]): string {
  const widths = rows[0].map((_, c) => Math.max(...rows.map((r) => r[c].length)));
  const render = (r: string[]): string =>
    `| ${r.map((cell, i) => cell.padEnd(widths[i])).join(" | ")} |`;
  return [
    render(rows[0]),
    `| ${widths.map((w) => "-".repeat(w)).join(" | ")} |`,
    ...rows.slice(1).map(render),
  ].join("\n");
}

function stripFrontmatter(s: string): string {
  const m = s.match(/^---\n[\s\S]*?\n---\n/);
  return m ? s.slice(m[0].length) : s;
}

/** Flat Name | Description table (components, hooks/api). */
function simpleTable(list: Outline[], dir: string): string {
  if (list.length === 0) return "";
  const rows: string[][] = [["Name", "Description"]];
  for (const o of list.toSorted((a, b) => a.slug.localeCompare(b.slug))) {
    const { title, description } = o.frontmatter;
    rows.push([`[${title}](references/${dir}/${o.slug}.md)`, description]);
  }
  return mdTable(rows);
}

/** Slug | Name | Description table grouped by `subcategory` (patterns, pages). */
function entryTable(list: Outline[], dir: string): string {
  if (list.length === 0) return "";
  const groups = new Map<string | null, Outline[]>();
  for (const o of list.toSorted((a, b) => a.slug.localeCompare(b.slug))) {
    const key = o.frontmatter.subcategory ?? null;
    const arr = groups.get(key) ?? [];
    arr.push(o);
    groups.set(key, arr);
  }
  const blocks: string[] = [];
  for (const [group, items] of groups) {
    const rows: string[][] = [["Slug", "Name", "Description"]];
    for (const o of items) {
      const { slug, name, description } = o.frontmatter;
      const displaySlug = (slug ?? o.slug).replace(/^[^/]+\//, "");
      rows.push([
        `[\`${displaySlug}\`](references/${dir}/${o.slug}.md)`,
        name ?? o.slug,
        description,
      ]);
    }
    blocks.push(group === null ? mdTable(rows) : `### ${group}\n\n${mdTable(rows)}`);
  }
  return blocks.join("\n\n");
}

/** Compute the whole consumer skill as a map of repo-relative path → content.
 * Pure: reads only committed inputs (the generated docs incl. concepts, the SKILL template, and the migrations doc) and writes nothing — so `sync`
 * can emit it and `check` can recompute and validate it without the (gitignored)
 * output needing to exist. */
export function computeSkill(
  repoRoot: string,
  config: DocsConfig,
  outlines: Outline[],
): Map<string, string> {
  const files = new Map<string, string>();
  const skill = config.skill;
  if (!skill) return files;
  const rel = (abs: string): string => toPosix(relative(repoRoot, abs));

  const sections: Record<string, Outline[]> = {
    concepts: [],
    components: [],
    api: [],
    patterns: [],
    pages: [],
  };
  for (const o of outlines) {
    const section = SECTION_BY_OUTDIR[o.outDir];
    if (section) sections[section].push(o);
  }

  // Reference docs: copy the generated markdown (docs/ is not published, so the
  // shipped skill must carry the content). API keeps its guards/ router/ nesting.
  for (const [section, list] of Object.entries(sections)) {
    for (const o of list) {
      const srcAbs = join(repoRoot, o.mdPath);
      if (!existsSync(srcAbs)) continue;
      const destAbs = join(repoRoot, skill.outDir, "references", section, `${o.slug}.md`);
      files.set(rel(destAbs), readFileSync(srcAbs, "utf8"));
    }
  }

  // Migrations: copy with relative links rewritten to absolute repo URLs, since
  // the consuming app has no docs/ tree to resolve them against.
  const migAbs = join(repoRoot, skill.migrationsSource);
  if (existsSync(migAbs)) {
    const body = stripFrontmatter(readFileSync(migAbs, "utf8"))
      .trim()
      .replace(
        /\]\((\.{1,2}\/[^)\s]+)\)/g,
        (_m, target: string) => `](${skill.repoBlobUrl}/${toPosix(join("docs", target))})`,
      );
    files.set(rel(join(repoRoot, skill.outDir, "references", "migrations.md")), `${body}\n`);
  }

  // SKILL.md: fill the template's category tables.
  const template = readFileSync(join(repoRoot, skill.templatePath), "utf8");
  const skillMd = template
    .replace("{{CONCEPTS_TABLE}}", simpleTable(sections.concepts, "concepts"))
    .replace("{{COMPONENTS_TABLE}}", simpleTable(sections.components, "components"))
    .replace("{{API_TABLE}}", simpleTable(sections.api, "api"))
    .replace("{{PAGES_TABLE}}", entryTable(sections.pages, "pages"))
    .replace("{{PATTERNS_TABLE}}", entryTable(sections.patterns, "patterns"));
  files.set(rel(join(repoRoot, skill.outDir, "SKILL.md")), skillMd);

  return files;
}
