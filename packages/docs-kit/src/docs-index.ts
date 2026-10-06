import { dirname, relative } from "node:path";

import type { Outline } from "./types";

export const DOCS_INDEX_TOKEN = /<!--\s*docs-index\s*-->/;

function cell(text: string): string {
  return text.replace(/\s+/g, " ").replace(/\\/g, "\\\\").replace(/\|/g, "\\|").trim();
}

/** Catalogue links are relative to the index, so the entire docs tree is portable. */
export function renderDocsIndex(outlines: Outline[], index: Outline): string {
  const sections = new Map<string, Outline[]>();
  for (const outline of outlines) {
    if (outline.mdPath === index.mdPath) continue;
    const section = relative(index.outDir, outline.outDir).split(/[/\\]/)[0] || "guides";
    const entries = sections.get(section) ?? [];
    entries.push(outline);
    sections.set(section, entries);
  }

  return [...sections]
    .toSorted(([a], [b]) => a.localeCompare(b))
    .map(([section, entries]) => {
      const rows = entries
        .toSorted((a, b) => a.mdPath.localeCompare(b.mdPath))
        .map((outline) => {
          const href = relative(dirname(index.mdPath), outline.mdPath).split("\\").join("/");
          return `| [${cell(outline.frontmatter.title)}](${href}) | ${cell(outline.frontmatter.description)} |`;
        });
      return [
        `## ${section === "api" ? "API" : section.charAt(0).toUpperCase() + section.slice(1)}`,
        "",
        "| Document | Description |",
        "| --- | --- |",
        ...rows,
      ].join("\n");
    })
    .join("\n\n");
}
