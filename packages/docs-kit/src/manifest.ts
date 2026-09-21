import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import type { Manifest } from "./types";

export function readManifest(repoRoot: string, manifestRel: string): Manifest | null {
  const p = join(repoRoot, manifestRel);
  if (!existsSync(p)) return null;
  return JSON.parse(readFileSync(p, "utf8")) as Manifest;
}

export function writeManifest(repoRoot: string, manifestRel: string, manifest: Manifest): void {
  const p = join(repoRoot, manifestRel);
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
}
