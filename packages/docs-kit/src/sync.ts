import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import { assembleMarkdown } from "./assemble";
import { loadConfig } from "./config";
import { type Finding, reconcile } from "./coverage";
import { hash, normalizeText } from "./hash";
import { writeManifest } from "./manifest";
import { discoverOutlines } from "./outline";
import { loadSurface, snapshotHashForSlug } from "./project";
import type { Manifest, ManifestEntry } from "./types";

export interface SyncResult {
  manifest: Manifest;
  findings: Finding[];
  written: string[];
}

/** Run the repo formatter (oxfmt) over the given files so that committed output
 * is byte-identical to what the manifest hashes. This makes the pre-commit
 * oxfmt hook idempotent — it can never reformat a generated file after the fact
 * and silently invalidate the drift gate. Best-effort: if oxfmt isn't present,
 * hashing simply falls back to sync's own output. */
function formatFiles(repoRoot: string, paths: string[]): void {
  const bin = join(repoRoot, "node_modules/.bin/oxfmt");
  const targets = [...new Set(paths)].filter((p) => existsSync(p));
  if (targets.length === 0 || !existsSync(bin)) return;
  try {
    execFileSync(bin, ["--no-error-on-unmatched-pattern", ...targets], {
      cwd: repoRoot,
      stdio: "ignore",
    });
  } catch {
    /* formatting is best-effort */
  }
}

/** Deterministically (re)generate every unit's markdown from its outline +
 * authored examples + resolved type surface, format everything with the repo
 * formatter, then rewrite the manifest with hashes of the FORMATTED files. */
export function sync(repoRoot: string): SyncResult {
  const config = loadConfig(repoRoot);
  const outlines = discoverOutlines(repoRoot, config);
  const surface = loadSurface(repoRoot, config);
  const { findings, ownedBySlug } = reconcile(surface, outlines, config);

  // Phase 1 — assemble + write every markdown output.
  const written: string[] = [];
  const toFormat: string[] = [];
  for (const outline of outlines) {
    const owned = ownedBySlug.get(outline.slug) ?? [];
    const md = assembleMarkdown({ repoRoot, outline, surface, owned });
    const mdAbs = join(repoRoot, outline.mdPath);
    mkdirSync(dirname(mdAbs), { recursive: true });
    writeFileSync(mdAbs, md, "utf8");
    written.push(outline.mdPath);
    toFormat.push(mdAbs, outline.outlinePath);
    const examplesAbs = join(repoRoot, outline.examplesPath);
    if (existsSync(examplesAbs)) toFormat.push(examplesAbs);
  }

  // Phase 2 — format outputs + sources so the committed bytes match the hashes.
  formatFiles(repoRoot, toFormat);

  // Phase 3 — hash the FORMATTED files and build the manifest.
  const units: Record<string, ManifestEntry> = {};
  for (const outline of outlines) {
    const owned = ownedBySlug.get(outline.slug) ?? [];
    const mdAbs = join(repoRoot, outline.mdPath);
    const examplesAbs = join(repoRoot, outline.examplesPath);
    const hasExamples = existsSync(examplesAbs);

    units[outline.slug] = {
      slug: outline.slug,
      kind: outline.kind,
      outline: outline.outlineRel,
      output: outline.mdPath,
      examples: hasExamples ? outline.examplesPath : null,
      sources: outline.frontmatter.sources ?? [],
      claims: outline.frontmatter.claims ?? [],
      symbols: owned,
      hashes: {
        typeSurface: outline.kind === "code-backed" ? surface.hashSymbols(owned) : null,
        outline: hash(normalizeText(readFileSync(outline.outlinePath, "utf8"))),
        snapshot:
          outline.kind === "code-backed"
            ? snapshotHashForSlug(repoRoot, config, outline.slug)
            : null,
        outputMd: hash(normalizeText(readFileSync(mdAbs, "utf8"))),
        outputExamples: hasExamples ? hash(normalizeText(readFileSync(examplesAbs, "utf8"))) : null,
      },
    };
  }

  const manifest: Manifest = { version: 1, units };
  writeManifest(repoRoot, config.manifestFile, manifest);
  return { manifest, findings, written };
}
