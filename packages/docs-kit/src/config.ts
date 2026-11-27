import { readFileSync } from "node:fs";
import { join } from "node:path";

import { SKILL_SECTIONS } from "./skill";
import type { AgentsConfig, CategoryRule, DocsConfig, UnclaimedSkillDir } from "./types";

/** On-disk shape of `docs-kit.config.json` — grouped by data flow (inputs →
 * outputs → policy). It is parsed into the flat internal {@link DocsConfig}. */
interface RawConfig {
  inputs?: {
    outlines?: { roots?: string[] };
    api?: { tsconfig?: string; entrypoint?: string };
    snapshots?: { dir?: string };
  };
  outputs?: {
    documents?: { mappings?: Array<{ match: string; dir: string }> };
    manifest?: string;
    skills?: DocsConfig["skills"];
    agents?: AgentsConfig;
  };
  policy?: {
    coverage?: { enforce?: boolean; exclusions?: string[] };
    skills?: { unclaimed?: UnclaimedSkillDir[] };
  };
}

/** Load `docs-kit.config.json` from the repo root, applying defaults. */
export function loadConfig(repoRoot: string): DocsConfig {
  const raw = readFileSync(join(repoRoot, "docs-kit.config.json"), "utf8");
  const c = JSON.parse(raw) as RawConfig;
  const categories: CategoryRule[] = (c.outputs?.documents?.mappings ?? []).map((m) => ({
    match: m.match,
    outDir: m.dir,
  }));
  const skills = c.outputs?.skills ?? {};
  if (typeof skills !== "object" || Array.isArray(skills)) {
    throw new Error("docs-kit.config.json: outputs.skills must be an object keyed by skill ID");
  }
  for (const [id, skill] of Object.entries(skills)) {
    for (const section of skill.sections ?? []) {
      if (!(SKILL_SECTIONS as readonly string[]).includes(section)) {
        throw new Error(
          `docs-kit.config.json: skill ${id} has unknown section "${section}" — expected one of ${SKILL_SECTIONS.join(", ")}`,
        );
      }
    }
  }
  const agents = c.outputs?.agents;
  // Skills list paths under the package docs, so they're always emitted.
  if (!agents) throw new Error("docs-kit.config.json: outputs.agents is required");
  for (const key of ["guideTemplatePath", "packageDir", "docsDir"] as const) {
    if (!agents[key]?.trim()) {
      throw new Error(`docs-kit.config.json: outputs.agents.${key} is required`);
    }
  }
  // sync clears docsDir before writing, so it must stay inside the package.
  if (agents.docsDir.split("/").includes("..") || agents.docsDir.startsWith("/")) {
    throw new Error(
      "docs-kit.config.json: outputs.agents.docsDir must be a path inside packageDir",
    );
  }
  return {
    roots: c.inputs?.outlines?.roots ?? ["docs-src"],
    tsconfig: c.inputs?.api?.tsconfig ?? "packages/core/tsconfig.json",
    indexFile: c.inputs?.api?.entrypoint ?? "packages/core/src/index.ts",
    manifestFile: c.outputs?.manifest ?? "docs-manifest.json",
    categories,
    enforceCoverage: c.policy?.coverage?.enforce ?? false,
    exclusions: c.policy?.coverage?.exclusions ?? [],
    snapshotDir: c.inputs?.snapshots?.dir,
    skills,
    agents,
    unclaimedSkillDirs: c.policy?.skills?.unclaimed ?? [],
  };
}
