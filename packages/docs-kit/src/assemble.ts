import { existsSync } from "node:fs";
import { join } from "node:path";

import { Project } from "ts-morph";

import type { Surface } from "./project";
import type { Outline, UnitKind } from "./types";

const EXAMPLE_TOKEN = /<!--\s*example:\s*([\w-]+)\s*(?:\|[^]*?)?-->/g;

function titleCase(slug: string): string {
  return slug
    .split(/[-_]/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function pascal(key: string): string {
  return key
    .split(/[-_]/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join("");
}

function stripExport(src: string): string {
  return src.replace(/^export\s+/, "");
}

/** Parse an authored examples module syntactically (no type resolution needed)
 * and return each exported example's source text, keyed by its export name. */
function extractExamples(examplesAbsPath: string): Map<string, string> {
  const map = new Map<string, string>();
  if (!existsSync(examplesAbsPath)) return map;
  const project = new Project({ skipAddingFilesFromTsConfig: true, skipLoadingLibFiles: true });
  const sf = project.addSourceFileAtPath(examplesAbsPath);
  for (const fn of sf.getFunctions()) {
    const name = fn.getName();
    if (fn.isExported() && name) map.set(name, fn.getText());
  }
  for (const v of sf.getVariableStatements()) {
    if (!v.isExported()) continue;
    for (const decl of v.getDeclarations()) map.set(decl.getName(), v.getText());
  }
  return map;
}

const KIND_LABEL: Record<string, string> = {
  FunctionDeclaration: "function",
  VariableDeclaration: "const",
  TypeAliasDeclaration: "type",
  InterfaceDeclaration: "interface",
  ClassDeclaration: "class",
  EnumDeclaration: "enum",
};

/** Escape a value for a single markdown table cell: collapse whitespace and
 * escape pipes so union types like `"a" | "b"` don't break the table. */
function cell(text: string): string {
  return text.replace(/\s+/g, " ").replace(/\|/g, "\\|").trim();
}

function renderApi(surface: Surface, owned: string[], kind: UnitKind, upstream?: string): string {
  if (kind === "reference") {
    const lines = owned.map((n) => `- \`${n}\``).join("\n");
    const link = upstream ? `[upstream documentation](${upstream})` : "the upstream documentation";
    return `## Re-exported API\n\nThese symbols are re-exported by \`@tailor-platform/app-shell\` for convenience. See ${link} for full details.\n\n${lines}`;
  }
  if (kind !== "code-backed" || owned.length === 0) return "";

  const sections: string[] = [];

  // Auto-generated prop tables for every owned `*Props` symbol.
  const tables: string[] = [];
  for (const name of owned) {
    const sym = surface.symbols.get(name);
    if (!sym?.props?.length) continue;
    const head = "| Prop | Type | Description |\n| --- | --- | --- |";
    const body = sym.props
      .map(
        (p) =>
          `| \`${p.name}${p.optional ? "?" : ""}\` | \`${cell(p.type)}\` | ${cell(p.description)} |`,
      )
      .join("\n");
    tables.push(`### ${name}\n\n${head}\n${body}`);
  }
  if (tables.length > 0) {
    sections.push(
      `## Props\n\n_Generated from the type surface — first-party props only._\n\n${tables.join("\n\n")}`,
    );
  }

  const list = owned
    .map((n) => {
      const s = surface.symbols.get(n);
      return `- \`${n}\` — ${KIND_LABEL[s?.kind ?? ""] ?? s?.kind ?? "unknown"}`;
    })
    .join("\n");
  sections.push(`## Exports\n\n${list}`);

  return sections.join("\n\n");
}

/** Deterministically assemble the output markdown from an outline, its authored
 * examples module, and the resolved type surface. No LLM involved. */
export function assembleMarkdown(opts: {
  repoRoot: string;
  outline: Outline;
  surface: Surface;
  owned: string[];
}): string {
  const { repoRoot, outline, surface, owned } = opts;
  const examples = extractExamples(join(repoRoot, outline.examplesPath));

  // The frontmatter title is the canonical H1 (prepended below). Drop a leading
  // H1 the outline body may already carry — outlines migrated from docs/*.md
  // start with their own `# Title` — so the output has a single header.
  const bodyWithoutH1 = outline.body.replace(/^\s*#\s+[^\n]*\r?\n+/, "");

  const body = bodyWithoutH1.replace(EXAMPLE_TOKEN, (_match, key: string) => {
    const name = pascal(key);
    const src = examples.get(name);
    if (!src) {
      throw new Error(
        `docs-kit: ${outline.examplesPath} has no exported "${name}" for example token "${key}"`,
      );
    }
    // Emit an anchor the docs renderer replaces with the LIVE example, in place,
    // followed by the extracted source. The anchor is a custom element, so it is
    // sanitized away (invisible) on GitHub and other plain markdown renderers.
    return (
      `<example-preview name="${key}"></example-preview>\n\n` +
      "```tsx\n" +
      stripExport(src).trim() +
      "\n```"
    );
  });

  const title = outline.frontmatter.title ?? titleCase(outline.slug);
  const description = outline.frontmatter.description ?? "";
  const front = `---\ntitle: ${title}\ndescription: ${description}\n---`;
  const note = `<!-- GENERATED by docs-kit from ${outline.outlineRel} — do not edit by hand. -->`;
  const api = renderApi(surface, owned, outline.kind, outline.frontmatter.upstream);

  // Inject the generated API block at an explicit `<!-- api -->` token if the
  // outline places one; otherwise append it at the end.
  const API_TOKEN = /<!--\s*api\s*-->/;
  let composed: string;
  if (API_TOKEN.test(body)) {
    composed = body.replace(API_TOKEN, api).trim();
  } else {
    composed = api ? `${body.trim()}\n\n${api}` : body.trim();
  }

  return [front, note, `# ${title}`, composed].filter(Boolean).join("\n\n") + "\n";
}
