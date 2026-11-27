import { existsSync, readFileSync } from "node:fs";
import { join, posix } from "node:path";

import { SECTION_BY_OUTDIR, SKILL_SECTIONS } from "./skill";
import type { AgentsConfig, Outline, SkillSection } from "./types";

const VERSION_TOKEN = "{{APP_SHELL_VERSION}}";

/** Named for its audience, as Next.js names its in-package agent file, which
 * leaves `README.md` / `index.md` free for a human-facing docs home. Kept in
 * the docs root rather than the package root, where tools would load it as a
 * nested instruction file for this repo's own contributors. Consumers' tooling
 * (erp-kit) imports this exact path, so moving it is a breaking change. */
export const GUIDE_FILE = "AGENTS.md";

export interface AgentsOutput {
  /** Repo-relative path → content of every doc copied into the package. */
  docs: Map<string, string>;
  /** Repo-relative path → content of the files generated from templates (the
   * guide, unstamped). The manifest hashes these. */
  generated: Map<string, string>;
}

const bySlug = (a: Outline, b: Outline): number => a.slug.localeCompare(b.slug);

function slugList(list: Outline[]): string {
  return list
    .toSorted(bySlug)
    .map((o) => o.slug)
    .join(", ");
}

function teaserList(list: Outline[]): string {
  return list
    .toSorted(bySlug)
    .map((o) => `- \`${o.slug}\`: ${o.frontmatter.description}`)
    .join("\n");
}

function checkSize(path: string, content: string, max: number | undefined, why: string): void {
  const bytes = Buffer.byteLength(content, "utf8");
  if (max !== undefined && bytes > max) {
    throw new Error(`${path}: ${bytes} bytes, over the ${max} byte budget. ${why}`);
  }
}

function strayToken(content: string, allowed: string[]): string | null {
  const stripped = allowed.reduce((s, token) => s.replaceAll(token, ""), content);
  return stripped.match(/\{\{[^}]*\}\}/)?.[0] ?? null;
}

/** Compute the docs shipped in the package and the guide that indexes them.
 * Pure, like `computeSkill`: `sync`
 * writes the result and `check` recomputes it, so the (gitignored) output never
 * has to exist. */
export function computeAgents(
  repoRoot: string,
  agents: AgentsConfig,
  outlines: Outline[],
): AgentsOutput {
  const sections = Object.fromEntries(SKILL_SECTIONS.map((s) => [s, [] as Outline[]])) as Record<
    SkillSection,
    Outline[]
  >;
  for (const o of outlines) {
    const section = SECTION_BY_OUTDIR[o.outDir];
    if (section) sections[section].push(o);
  }

  const docsDir = posix.join(agents.packageDir, agents.docsDir);
  const docs = new Map<string, string>();
  for (const section of SKILL_SECTIONS) {
    for (const o of sections[section]) {
      const srcAbs = join(repoRoot, o.mdPath);
      if (!existsSync(srcAbs)) continue;
      docs.set(posix.join(docsDir, section, `${o.slug}.md`), readFileSync(srcAbs, "utf8"));
    }
  }

  // The guide carries everything that changes between versions, so it lives in
  // the package and the consumer's AGENTS.md doesn't churn on upgrades.
  const guideFail = (message: string): never => {
    throw new Error(`${agents.guideTemplatePath}: ${message}`);
  };
  let guide = readFileSync(join(repoRoot, agents.guideTemplatePath), "utf8");
  for (const section of SKILL_SECTIONS) {
    const name = section.toUpperCase();
    const slugs = `{{${name}_SLUGS}}`;
    const teasers = `{{${name}_TEASERS}}`;
    if (sections[section].length > 0 && !guide.includes(slugs) && !guide.includes(teasers)) {
      guideFail(`indexes no ${section} docs. Add ${slugs} or ${teasers}.`);
    }
    guide = guide
      .replace(slugs, slugList(sections[section]))
      .replace(teasers, teaserList(sections[section]));
  }
  const guideStray = strayToken(guide, [VERSION_TOKEN]);
  if (guideStray) guideFail(`unknown placeholder ${guideStray}.`);
  checkSize(
    agents.guideTemplatePath,
    guide,
    agents.maxBytes,
    "Agents load it every session: trim the prose or switch a _TEASERS list to _SLUGS.",
  );

  return {
    docs,
    generated: new Map([[posix.join(docsDir, GUIDE_FILE), guide]]),
  };
}
