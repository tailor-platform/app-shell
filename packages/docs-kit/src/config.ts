import { readFileSync } from "node:fs";
import { join } from "node:path";

import type { DocsConfig } from "./types";

/** Load `docs.config.json` from the repo root, applying defaults. */
export function loadConfig(repoRoot: string): DocsConfig {
  const raw = readFileSync(join(repoRoot, "docs.config.json"), "utf8");
  const parsed = JSON.parse(raw) as Partial<DocsConfig>;
  return {
    roots: parsed.roots ?? ["packages/core/src", "docs-src"],
    tsconfig: parsed.tsconfig ?? "packages/core/tsconfig.json",
    indexFile: parsed.indexFile ?? "packages/core/src/index.ts",
    manifestFile: parsed.manifestFile ?? "docs/docs-manifest.json",
    categories: parsed.categories ?? [],
    enforceCoverage: parsed.enforceCoverage ?? false,
    exclusions: parsed.exclusions ?? [],
    snapshotDir: parsed.snapshotDir,
  };
}
