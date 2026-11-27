import { existsSync, readFileSync } from "node:fs";
import { join, posix, relative } from "node:path";

import { computeAgents } from "./agents";
import { loadConfig } from "./config";
import { type Finding, reconcile } from "./coverage";
import { hash, normalizeText } from "./hash";
import { readManifest } from "./manifest";
import { discoverOutlines } from "./outline";
import { loadSurface, snapshotHashForSlug } from "./project";
import {
  computeStampedSkill,
  readSkillVersion,
  stampSkill,
  unclaimedSkillDirFindings,
} from "./skill";
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

  findings.push(...unclaimedSkillDirFindings(config));
  const recorded = manifest?.skills ?? {};
  type SkillOutput = { id: string; unitSlug?: string };
  const expected = new Map<string, SkillOutput>();
  for (const [id, skill] of Object.entries(recorded)) {
    if (typeof skill.output === "string") {
      expected.set(skill.output, { id });
    }
  }
  for (const entry of Object.values(manifest?.units ?? {})) {
    for (const [id, paths] of Object.entries(entry.skillReferences ?? {})) {
      if (!Object.hasOwn(recorded, id)) {
        findings.push({
          level: "block",
          slug: entry.slug,
          message: `skill references for ${entry.slug} refer to unknown skill ${id} — run sync.`,
        });
        continue;
      }
      // Use the recorded location, not the current config, to catch skill moves.
      const output = recorded[id].output;
      if (typeof output !== "string") continue;
      const outDir = posix.dirname(output);
      for (const path of paths) {
        expected.set(posix.join(outDir, "references", path), {
          id,
          unitSlug: entry.slug,
        });
      }
    }
  }
  const actual = new Map<string, SkillOutput>();
  // A skill that can't be computed is reported once, not as a series of removals.
  const failedSkills = new Set<string>();
  for (const [id, skill] of Object.entries(config.skills)) {
    try {
      // Validate version stamping even though it is not part of drift detection.
      const { output, template, files } = computeStampedSkill(repoRoot, skill, outlines);
      if (Object.hasOwn(recorded, id)) {
        const baseline = recorded[id].template;
        if (baseline?.path !== template.path || baseline.hash !== template.hash) {
          findings.push({
            level: "block",
            slug: "skill",
            message: `skill template ${template.path} drifted — run sync.`,
          });
        }
      }
      const outDir = posix.dirname(output);
      for (const [path, file] of files) {
        actual.set(posix.join(outDir, path), { id, unitSlug: file.unitSlug });
      }
    } catch (e) {
      failedSkills.add(id);
      findings.push({ level: "block", slug: "skill", message: (e as Error).message });
    }
  }
  for (const [path, file] of actual) {
    const baseline = expected.get(path);
    if (!baseline) {
      findings.push({
        level: "block",
        slug: "skill",
        message: `skill file ${path} is new — run sync.`,
      });
    } else if (baseline.id !== file.id || baseline.unitSlug !== file.unitSlug) {
      findings.push({
        level: "block",
        slug: "skill",
        message: `skill file ${path} drifted — run sync.`,
      });
    }
  }
  for (const [path, file] of expected) {
    if (!actual.has(path) && !failedSkills.has(file.id)) {
      findings.push({
        level: "block",
        slug: "skill",
        message: `skill file ${path} removed — run sync.`,
      });
    }
  }

  try {
    const { guide } = computeAgents(repoRoot, config.agents, outlines);
    const baseline = manifest?.agents;
    if (
      baseline?.output !== guide.output ||
      baseline.template?.path !== guide.template.path ||
      baseline.template.hash !== guide.template.hash
    ) {
      findings.push({
        level: "block",
        slug: "agents",
        message: `${guide.output} guide path or template drifted — run sync.`,
      });
    }
    stampSkill(guide.content, readSkillVersion(repoRoot, config.agents));
  } catch (e) {
    findings.push({ level: "block", slug: "agents", message: (e as Error).message });
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
