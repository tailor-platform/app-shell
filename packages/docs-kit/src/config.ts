import { readFileSync } from "node:fs";
import { join } from "node:path";

import { SKILL_SECTIONS } from "./skill";
import type {
  AgentsConfig,
  CategoryRule,
  DocsConfig,
  SkillConfig,
  UnclaimedSkillDir,
} from "./types";

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
    skills?: SkillConfig[];
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
  const skills = c.outputs?.skills ?? [];
  for (const skill of skills) {
    for (const section of skill.sections ?? []) {
      if (!(SKILL_SECTIONS as readonly string[]).includes(section)) {
        throw new Error(
          `docs-kit.config.json: skill ${skill.outDir} has unknown section "${section}" — expected one of ${SKILL_SECTIONS.join(", ")}`,
        );
      }
    }
  }
  const agents = c.outputs?.agents;
  if (agents) {
    for (const key of ["templatePath", "packageDir", "docsDir", "blockFile"] as const) {
      if (!agents[key]?.trim()) {
        throw new Error(`docs-kit.config.json: outputs.agents.${key} is required`);
      }
    }
    // sync clears docsDir before writing, so it must stay inside the package.
    for (const key of ["docsDir", "blockFile"] as const) {
      if (agents[key].split("/").includes("..") || agents[key].startsWith("/")) {
        throw new Error(
          `docs-kit.config.json: outputs.agents.${key} must be a path inside packageDir`,
        );
      }
    }
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
