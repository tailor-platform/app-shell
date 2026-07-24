import type { ComponentType } from "react";

import manifestJson from "../../../docs/docs-manifest.json";

// Glob the generated docs IN PLACE (repo-root docs/, outside this app). Vite
// resolves these at build time; in dev they are served straight from source.
// NOTE: import.meta.glob's options must be an inline object literal — Vite
// parses them statically, so a shared const is rejected.
const markdown = import.meta.glob("../../../docs/**/*.md", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;
const exampleSource = import.meta.glob("../../../docs/**/*.examples.tsx", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;
const exampleModule = import.meta.glob("../../../docs/**/*.examples.tsx", {
  eager: true,
}) as Record<string, Record<string, unknown>>;

interface ManifestEntry {
  slug: string;
  kind: string;
  output: string;
  examples: string | null;
}
const manifest = manifestJson as { units: Record<string, ManifestEntry> };

export interface Example {
  name: string;
  Component: ComponentType;
}

export interface DocUnit {
  slug: string;
  kind: string;
  category: string;
  markdown: string;
  source: string | null;
  examples: Example[];
}

const key = (repoRel: string): string => `../../../${repoRel}`;

/** Strip the generated frontmatter block and HTML comments before rendering —
 * react-markdown would otherwise show them as literal text. */
function cleanMarkdown(md: string): string {
  return md
    .replace(/^---\n[\s\S]*?\n---\n/, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .trim();
}

export const units: DocUnit[] = Object.values(manifest.units).map((entry) => {
  const mod = entry.examples ? exampleModule[key(entry.examples)] : undefined;
  const examples: Example[] = mod
    ? Object.entries(mod)
        .filter(([, value]) => typeof value === "function")
        .map(([name, value]) => ({ name, Component: value as ComponentType }))
    : [];
  return {
    slug: entry.slug,
    kind: entry.kind,
    category: entry.output.split("/")[1] ?? "misc",
    markdown: cleanMarkdown(markdown[key(entry.output)] ?? ""),
    source: entry.examples ? (exampleSource[key(entry.examples)] ?? null) : null,
    examples,
  };
});
