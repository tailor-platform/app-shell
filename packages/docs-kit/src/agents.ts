import { existsSync, readFileSync } from "node:fs";
import { join, posix } from "node:path";

import { SECTION_BY_OUTDIR, SKILL_SECTIONS } from "./skill";
import type { AgentsConfig, Outline, SkillSection } from "./types";

/** Left in the emitted block for the package's CLI to resolve when it injects
 * the block, because only the consumer's repo layout knows the path. */
export const PACKAGE_ROOT_TOKEN = "{{PACKAGE_ROOT}}";
const DOCS_ROOT_TOKEN = "{{DOCS_ROOT}}";

export interface AgentsOutput {
  /** Repo-relative path → content of every doc shipped in the package. */
  docs: Map<string, string>;
  /** Repo-relative path of the emitted block. */
  blockPath: string;
  block: string;
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

/** Compute the docs shipped in the package and the AGENTS.md block that indexes
 * them. Pure, like `computeSkill`: `sync` writes the result and `check`
 * recomputes it, so the (gitignored) output never has to exist. */
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

  const template = readFileSync(join(repoRoot, agents.templatePath), "utf8");
  const fail = (message: string): never => {
    throw new Error(`${agents.templatePath}: ${message}`);
  };

  if (template.split(DOCS_ROOT_TOKEN).length !== 2) {
    fail(`must use ${DOCS_ROOT_TOKEN} exactly once, so a docs move is a one-line diff.`);
  }
  let block = template.replace(
    DOCS_ROOT_TOKEN,
    posix.join(PACKAGE_ROOT_TOKEN, agents.docsDir.replace(/\/+$/, "")),
  );
  for (const section of SKILL_SECTIONS) {
    const name = section.toUpperCase();
    const slugs = `{{${name}_SLUGS}}`;
    const teasers = `{{${name}_TEASERS}}`;
    if (sections[section].length > 0 && !block.includes(slugs) && !block.includes(teasers)) {
      fail(`indexes no ${section} docs. Add ${slugs} or ${teasers}.`);
    }
    block = block
      .replace(slugs, slugList(sections[section]))
      .replace(teasers, teaserList(sections[section]));
  }

  const stray = block.replaceAll(PACKAGE_ROOT_TOKEN, "").match(/\{\{[^}]*\}\}/);
  if (stray) fail(`unknown placeholder ${stray[0]}.`);

  const bytes = Buffer.byteLength(block, "utf8");
  if (agents.maxBytes !== undefined && bytes > agents.maxBytes) {
    fail(
      `block is ${bytes} bytes, over the ${agents.maxBytes} byte budget. It loads in every agent session: trim the prose or switch a _TEASERS list to _SLUGS.`,
    );
  }

  return { docs, blockPath: posix.join(agents.packageDir, agents.blockFile), block };
}
