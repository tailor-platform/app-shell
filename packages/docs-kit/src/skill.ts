import { existsSync, readFileSync } from "node:fs";
import { join, posix } from "node:path";

import type { Finding } from "./coverage";
import { hash, normalizeText } from "./hash";
import type { DocsConfig, Outline, SkillConfig, SkillSection } from "./types";

function toPosix(p: string): string {
  return p.split("\\").join("/");
}

/** Generated-doc output dir → skill reference section. `docs/references` is
 * intentionally excluded. */
export const SECTION_BY_OUTDIR: Record<string, SkillSection> = {
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

type DocLink = (text: string, dir: string, slug: string) => string;

/** Names the path under the package's docs root (`outputs.agents`), since the
 * skill can't know where the package is installed. */
const docLink: DocLink = (text, dir, slug) => `${text} (\`${dir}/${slug}.md\`)`;

/** Flat Name | Description table (components, hooks/api). */
function simpleTable(list: Outline[], dir: string, link: DocLink): string {
  if (list.length === 0) return "";
  const rows: string[][] = [["Name", "Description"]];
  for (const o of list.toSorted((a, b) => a.slug.localeCompare(b.slug))) {
    const { title, description } = o.frontmatter;
    rows.push([link(title, dir, o.slug), description]);
  }
  return mdTable(rows);
}

/** Slug | Name | Description table grouped by `subcategory` (patterns, pages). */
function entryTable(list: Outline[], dir: string, link: DocLink): string {
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
      rows.push([link(`\`${displaySlug}\``, dir, o.slug), name ?? o.slug, description]);
    }
    blocks.push(group === null ? mdTable(rows) : `### ${group}\n\n${mdTable(rows)}`);
  }
  return blocks.join("\n\n");
}

/** Says up front that it is not the doc, so an agent can't build from it. */
function redirectStub(o: Outline, section: string, skillDir: string): string {
  return [
    `# MOVED: ${o.frontmatter.title}. This file is a pointer, not documentation.`,
    "",
    `This doc now ships in the installed \`@tailor-platform/app-shell\` package as \`${section}/${o.slug}.md\` under its docs root. Find the docs root using "Where the docs are" in \`${skillDir}/SKILL.md\`, then read it there. Do not implement anything from this file.`,
    "",
  ].join("\n");
}

const VERSION_PLACEHOLDER = /\{\{APP_SHELL_VERSION\}\}/g;

export const SKILL_SECTIONS: readonly SkillSection[] = [
  "concepts",
  "components",
  "api",
  "patterns",
  "pages",
];

/** Every docs output dir must reach a skill or be listed under
 * `policy.skills.unclaimed` with a reason, so a new docs category can't
 * silently ship to no consumer. Stale exceptions block too. */
export function unclaimedSkillDirFindings(config: DocsConfig): Finding[] {
  const skills = Object.values(config.skills);
  if (skills.length === 0) return [];
  const findings: Finding[] = [];
  const block = (message: string): void => {
    findings.push({ level: "block", slug: "skill", message });
  };
  const claimed = new Set(skills.flatMap((s) => s.sections ?? SKILL_SECTIONS));
  const unclaimed = new Map(config.unclaimedSkillDirs.map((u) => [u.dir, u]));
  const outDirs = new Set(config.categories.map((c) => c.outDir));

  for (const dir of outDirs) {
    const section = SECTION_BY_OUTDIR[dir];
    const isClaimed = section !== undefined && claimed.has(section);
    const exception = unclaimed.get(dir);
    if (isClaimed && exception) {
      block(
        `${dir} is listed under policy.skills.unclaimed but a skill carries it — remove the exception.`,
      );
    } else if (!isClaimed && !exception) {
      block(
        section === undefined
          ? `${dir} has no skill section, so no skill carries it. Add it to SECTION_BY_OUTDIR in packages/docs-kit/src/skill.ts and to a skill's sections, or list it under policy.skills.unclaimed with a reason.`
          : `${dir} (section "${section}") is in no skill's sections. Add it to a skill in outputs.skills, or list it under policy.skills.unclaimed with a reason.`,
      );
    }
  }
  for (const u of config.unclaimedSkillDirs) {
    if (!outDirs.has(u.dir)) {
      block(
        `policy.skills.unclaimed lists ${u.dir}, which is not a documents.mappings dir — remove it.`,
      );
    } else if (!u.reason?.trim()) {
      block(`policy.skills.unclaimed entry ${u.dir} needs a reason.`);
    }
  }
  return findings;
}

/** Read the version stamped into the skill, or null when no source is configured. */
export function readSkillVersion(
  repoRoot: string,
  skill: Pick<SkillConfig, "versionSource">,
): string | null {
  const source = skill.versionSource;
  if (!source) return null;
  const { version } = JSON.parse(readFileSync(join(repoRoot, source), "utf8")) as {
    version?: string;
  };
  if (!version) throw new Error(`${source} has no "version" field`);
  return version;
}

/** Substitute the package version into a computed skill file. Applied only when
 * writing — the manifest doesn't hash version-stamped content, so a changesets
 * version bump never registers as skill drift. Throws rather than ship a literal
 * placeholder, which would tell every consumer their copy is stale. */
export function stampSkill(content: string, version: string | null): string {
  if (version !== null) return content.replace(VERSION_PLACEHOLDER, version);
  if (content.includes("{{APP_SHELL_VERSION}}")) {
    throw new Error("skill template uses {{APP_SHELL_VERSION}} but skill.versionSource is not set");
  }
  return content;
}

type SkillFile = { content: string; unitSlug?: string };

/** Compute the skill and stamp it, so a bad version source fails before any write. */
export function computeStampedSkill(repoRoot: string, skill: SkillConfig, outlines: Outline[]) {
  const version = readSkillVersion(repoRoot, skill);
  const computed = computeSkill(repoRoot, skill, outlines);
  const files = new Map<string, SkillFile & { stamped: string }>();
  for (const [p, file] of computed.files) {
    files.set(p, { ...file, stamped: stampSkill(file.content, version) });
  }
  return { files, template: computed.template };
}

/** Compute skill files (keyed by path relative to the output dir) and fingerprint
 * the authored template. Reads only committed inputs; writes nothing. */
export function computeSkill(repoRoot: string, skill: SkillConfig, outlines: Outline[]) {
  const files = new Map<string, SkillFile>();
  const included = new Set(skill.sections ?? SKILL_SECTIONS);

  const sections: Record<SkillSection, Outline[]> = {
    concepts: [],
    components: [],
    api: [],
    patterns: [],
    pages: [],
  };
  for (const o of outlines) {
    const section = SECTION_BY_OUTDIR[o.outDir];
    if (section && included.has(section)) sections[section].push(o);
  }

  // Reference docs ship in the package, not the skill. Leave a stub where each
  // copy used to be: stubs catch stale links and overwrite the real docs an
  // older copy of the skill left behind. API keeps its guards/ router/ nesting.
  for (const [section, list] of Object.entries(sections)) {
    for (const o of list) {
      const srcAbs = join(repoRoot, o.mdPath);
      if (!existsSync(srcAbs)) continue;
      const path = `references/${section}/${o.slug}.md`;
      files.set(path, {
        unitSlug: o.slug,
        content: redirectStub(o, section, posix.relative(posix.dirname(path), ".")),
      });
    }
  }

  // Migrations: copy with relative links rewritten to absolute repo URLs, since
  // the consuming app has no docs/ tree to resolve them against.
  // A configured source that's missing throws: for a migrations-only skill it
  // would otherwise ship with nothing in it and still pass check.
  const migAbs = skill.migrationsSource ? join(repoRoot, skill.migrationsSource) : null;
  if (migAbs) {
    if (!existsSync(migAbs)) {
      throw new Error(
        `skill ${skill.outDir}: migrationsSource ${skill.migrationsSource} does not exist`,
      );
    }
    const source = outlines.find((o) => join(repoRoot, o.mdPath) === migAbs);
    if (!source) {
      throw new Error(
        `skill ${skill.outDir}: migrationsSource ${skill.migrationsSource} has no unit`,
      );
    }
    if (!skill.repoBlobUrl) {
      throw new Error(`skill ${skill.outDir}: migrationsSource needs repoBlobUrl`);
    }
    const blobUrl = skill.repoBlobUrl;
    const body = stripFrontmatter(readFileSync(migAbs, "utf8"))
      .trim()
      .replace(
        /\]\((\.{1,2}\/[^)\s]+)\)/g,
        (_m, target: string) => `](${blobUrl}/${toPosix(join("docs", target))})`,
      );
    files.set("references/migrations.md", {
      unitSlug: source.slug,
      content: `${body}\n`,
    });
  }

  // Hash the authored template, not its expansion, so unrelated docs don't share a hash.
  const template = readFileSync(join(repoRoot, skill.templatePath), "utf8");
  const content = template
    .replace("{{CONCEPTS_TABLE}}", simpleTable(sections.concepts, "concepts", docLink))
    .replace("{{COMPONENTS_TABLE}}", simpleTable(sections.components, "components", docLink))
    .replace("{{API_TABLE}}", simpleTable(sections.api, "api", docLink))
    .replace("{{PAGES_TABLE}}", entryTable(sections.pages, "pages", docLink))
    .replace("{{PATTERNS_TABLE}}", entryTable(sections.patterns, "patterns", docLink));
  const output = "SKILL.md";
  files.set(output, { content });

  return {
    files,
    template: { path: skill.templatePath, hash: hash(normalizeText(template)), output },
  };
}
