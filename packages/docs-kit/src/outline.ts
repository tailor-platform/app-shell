import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { basename, join, relative } from "node:path";

import matter from "gray-matter";
import picomatch from "picomatch";

import type { DocsConfig, Outline, OutlineFrontmatter, UnitKind } from "./types";

const OUTLINE_SUFFIX = ".docs-outline.md";

function toPosix(p: string): string {
  return p.split("\\").join("/");
}

function walk(dir: string, out: string[] = []): string[] {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === "dist" || name.startsWith(".")) continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (name.endsWith(OUTLINE_SUFFIX)) out.push(full);
  }
  return out;
}

function classify(fm: OutlineFrontmatter, outlineRel: string): UnitKind {
  if (fm.sources && fm.sources.length > 0) return "code-backed";
  if ((fm.claims && fm.claims.length > 0) || outlineRel.includes("/references/"))
    return "reference";
  return "prose";
}

function outDirFor(outlineRel: string, config: DocsConfig): string | null {
  for (const rule of config.categories) {
    if (picomatch(rule.match, { dot: true })(outlineRel)) return rule.outDir;
  }
  return null;
}

/** Discover and parse every `*.docs-outline.md` under the configured roots. */
export function discoverOutlines(repoRoot: string, config: DocsConfig): Outline[] {
  const outlines: Outline[] = [];
  for (const root of config.roots) {
    for (const outlinePath of walk(join(repoRoot, root))) {
      const outlineRel = toPosix(relative(repoRoot, outlinePath));
      const parsed = matter(readFileSync(outlinePath, "utf8"));
      const fm = parsed.data as OutlineFrontmatter;
      const kind = classify(fm, outlineRel);
      const slug = fm.group ?? basename(outlinePath).slice(0, -OUTLINE_SUFFIX.length);
      const outDir = outDirFor(outlineRel, config);
      if (!outDir) throw new Error(`docs-kit: no category rule matches outline "${outlineRel}"`);
      outlines.push({
        kind,
        slug,
        outlinePath,
        outlineRel,
        frontmatter: fm,
        body: parsed.content,
        outDir,
        mdPath: `${outDir}/${slug}.md`,
        examplesPath: `${outDir}/${slug}.examples.tsx`,
      });
    }
  }
  outlines.sort((a, b) => a.slug.localeCompare(b.slug));
  return outlines;
}
