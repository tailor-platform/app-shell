import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { loadConfig } from "./config";
import { type Finding, reconcile } from "./coverage";
import { hash, normalizeText } from "./hash";
import { readManifest } from "./manifest";
import { discoverOutlines } from "./outline";
import { loadSurface, snapshotHashForSlug } from "./project";

export interface CheckResult {
  findings: Finding[];
  ok: boolean;
}

/** Deterministic drift gate. No LLM, no writes. Exit non-zero on any block. */
export function check(repoRoot: string): CheckResult {
  const config = loadConfig(repoRoot);
  const outlines = discoverOutlines(repoRoot, config);
  const surface = loadSurface(repoRoot, config);
  const { findings: reconcileFindings, ownedBySlug } = reconcile(surface, outlines, config);
  const findings: Finding[] = [...reconcileFindings];
  const manifest = readManifest(repoRoot, config.manifestFile);

  for (const outline of outlines) {
    const { slug } = outline;
    const entry = manifest?.units[slug];
    const owned = ownedBySlug.get(slug) ?? [];

    if (!entry) {
      findings.push({
        level: "block",
        slug,
        message: `no manifest entry — run \`docs-kit sync\`.`,
      });
      continue;
    }

    const curOutline = hash(normalizeText(readFileSync(outline.outlinePath, "utf8")));
    const curType = outline.kind === "code-backed" ? surface.hashSymbols(owned) : null;
    const curSnap =
      outline.kind === "code-backed" ? snapshotHashForSlug(repoRoot, config, slug) : null;

    if (curType !== entry.hashes.typeSurface) {
      findings.push({
        level: "block",
        slug,
        message: `interface (type surface) drifted — resync required.`,
      });
    }
    if (curOutline !== entry.hashes.outline) {
      findings.push({ level: "block", slug, message: `outline edited — resync required.` });
    }
    if (curSnap !== entry.hashes.snapshot) {
      findings.push({
        level: "warn",
        slug,
        message: `rendered snapshot changed — advisory: update the outline if a default/behavior changed.`,
      });
    }

    // Output integrity — generated files must match the manifest exactly.
    const mdAbs = join(repoRoot, outline.mdPath);
    if (!existsSync(mdAbs)) {
      findings.push({
        level: "block",
        slug,
        message: `missing generated output ${outline.mdPath} — run sync.`,
      });
    } else if (hash(normalizeText(readFileSync(mdAbs, "utf8"))) !== entry.hashes.outputMd) {
      findings.push({
        level: "block",
        slug,
        message: `${outline.mdPath} was hand-edited or is stale — never edit generated files; run sync.`,
      });
    }

    if (entry.hashes.examples) {
      const exAbs = join(repoRoot, outline.examplesPath);
      if (!existsSync(exAbs)) {
        findings.push({ level: "block", slug, message: `missing ${outline.examplesPath}.` });
      } else if (hash(normalizeText(readFileSync(exAbs, "utf8"))) !== entry.hashes.examples) {
        findings.push({
          level: "block",
          slug,
          message: `${outline.examplesPath} changed since last sync — its .md code fences are stale; run sync.`,
        });
      }
    }
  }

  return { findings, ok: !findings.some((f) => f.level === "block") };
}
