import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import { assembleMarkdown } from "./assemble";
import { loadConfig } from "./config";
import { type Finding, reconcile } from "./coverage";
import { hash, normalizeText } from "./hash";
import { writeManifest } from "./manifest";
import { discoverOutlines } from "./outline";
import { writePageStub } from "./pages";
import { computeSkill } from "./skill";
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
  const { outlines, findings: schemaFindings } = discoverOutlines(repoRoot, config);
  if (schemaFindings.length > 0) {
    const detail = schemaFindings.map((f) => `  ${f.slug}: ${f.message}`).join("\n");
    throw new Error(`docs-kit sync: outline schema violations — nothing written.\n${detail}`);
  }

  const surface = loadSurface(repoRoot, config);
  const { findings, ownedBySlug } = reconcile(surface, outlines, config);

  // Phase 1 — assemble + write every markdown output, plus the per-unit route
  // stub that mounts it in the docs-browser (so new units need zero wiring).
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
    const pageRel = writePageStub(repoRoot, outline, config);
    if (pageRel) {
      written.push(pageRel);
      toFormat.push(join(repoRoot, pageRel));
    }
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
      symbols: [...new Set([...owned, ...(outline.frontmatter.claims ?? [])])].toSorted(),
      hashes: {
        typeSurface: outline.kind === "code-backed" ? surface.hashSymbols(owned) : null,
        outline: hash(normalizeText(readFileSync(outline.outlinePath, "utf8"))),
        snapshot:
          outline.kind === "code-backed"
            ? snapshotHashForSlug(repoRoot, config, outline.slug)
            : null,
        outputMd: hash(normalizeText(readFileSync(mdAbs, "utf8"))),
        examples: hasExamples ? hash(normalizeText(readFileSync(examplesAbs, "utf8"))) : null,
      },
    };
  }

  // Phase 4 — emit the consumer skill (gitignored output) from the generated
  // docs + authored guidance, and hash each file so `check` can validate it.
  let skill: Record<string, string> | undefined;
  if (config.skill) {
    rmSync(join(repoRoot, config.skill.outDir), { recursive: true, force: true });
    skill = {};
    for (const [skillRel, content] of computeSkill(repoRoot, config, outlines)) {
      const abs = join(repoRoot, skillRel);
      mkdirSync(dirname(abs), { recursive: true });
      writeFileSync(abs, content, "utf8");
      skill[skillRel] = hash(normalizeText(content));
      written.push(skillRel);
    }
  }

  const manifest: Manifest = { version: 1, units, ...(skill ? { skill } : {}) };
  writeManifest(repoRoot, config.manifestFile, manifest);
  // Format the manifest too, so a clean-tree `sync` is byte-idempotent: the
  // manifest's hashes are over the OUTPUT files, never over the manifest text
  // itself, so this reformatting is safe and only prevents the pre-commit oxfmt
  // hook from later collapsing its arrays into a whitespace-only diff.
  formatFiles(repoRoot, [join(repoRoot, config.manifestFile)]);
  return { manifest, findings, written };
}
