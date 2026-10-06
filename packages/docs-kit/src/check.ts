import { existsSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";

import { loadConfig } from "./config";
import { type Finding, reconcile } from "./coverage";
import { DOCS_INDEX_TOKEN, renderDocsIndex } from "./docs-index";
import { hash, normalizeText } from "./hash";
import { readManifest } from "./manifest";
import { discoverOutlines } from "./outline";
import { loadSurface, snapshotHashForSlug } from "./project";
import { unmanagedOutputs, walkMarkdown } from "./tree";

export interface CheckResult {
  findings: Finding[];
  ok: boolean;
}

/** Deterministic drift gate. No LLM, no writes. Exit non-zero on any block. */
export function check(repoRoot: string): CheckResult {
  const config = loadConfig(repoRoot);
  const { outlines, findings: schemaFindings } = discoverOutlines(repoRoot, config);
  // Schema first: hashes computed from a malformed outline would report as
  // downstream drift instead of naming the actual problem.
  if (schemaFindings.length > 0) return { findings: schemaFindings, ok: false };

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

    // An index depends on every outline's metadata, not just its own source.
    if (DOCS_INDEX_TOKEN.test(outline.body)) {
      const catalogue = hash(normalizeText(renderDocsIndex(outlines, outline)));
      if (catalogue !== entry.hashes.catalogue) {
        findings.push({
          level: "block",
          slug,
          message: `documentation index is stale — run sync.`,
        });
      }
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

  // Reverse check: a manifest entry with no live outline means its outline was
  // deleted but the generated .md (and its manifest entry) were left behind. The
  // orphaned output passes every forward check silently, so flag it here.
  if (manifest) {
    const liveSlugs = new Set(outlines.map((o) => o.slug));
    for (const slug of Object.keys(manifest.units)) {
      if (!liveSlugs.has(slug)) {
        findings.push({
          level: "block",
          slug,
          message: `orphaned output ${manifest.units[slug].output} — its outline was removed; delete the generated file and run sync.`,
        });
      }
    }
  }

  // Nothing unmanaged may live in the generated tree. Every .md under an output
  // root must be a unit's output; anything else was hand-authored where it will
  // never be regenerated, and no other check would ever see it.
  const outputRoots = new Set(config.categories.map((c) => c.outDir.split("/")[0]));
  const found = [...outputRoots].flatMap((root) =>
    walkMarkdown(join(repoRoot, root)).map((abs) => toPosix(relative(repoRoot, abs))),
  );
  for (const rel of unmanagedOutputs(
    found,
    outlines.map((o) => o.mdPath),
  )) {
    findings.push({
      level: "block",
      slug: rel,
      message: `${rel} has no source — everything under ${rel.split("/")[0]}/ is generated. Author an outline under \`docs-src/\` and run sync.`,
    });
  }

  return { findings, ok: !findings.some((f) => f.level === "block") };
}

function toPosix(p: string): string {
  return p.split("\\").join("/");
}
