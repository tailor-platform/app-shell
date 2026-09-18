import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";

import { Node, type ParameterDeclaration, Project, SymbolFlags } from "ts-morph";

import { hash, normalizeText } from "./hash";
import type { DocsConfig } from "./types";

function toPosix(p: string): string {
  return p.split("\\").join("/");
}

export interface PropRow {
  name: string;
  type: string;
  optional: boolean;
  description: string;
  /** Default value from cva `defaultVariants`, a destructuring default, or an
   * `@default` JSDoc tag — null when none is declared. */
  default: string | null;
}

/** Collect prop defaults declared in a component's own source file: cva
 * `defaultVariants` and destructuring defaults on the component function's props
 * parameter. (`@default` JSDoc tags are read per-prop in extractProps.) */
function collectDefaults(decl: Node): Map<string, string> {
  const out = new Map<string, string>();
  const sf = decl.getSourceFile();

  // cva(...) `defaultVariants: { variant: "default", size: "default" }`
  for (const v of sf.getVariableDeclarations()) {
    const init = v.getInitializer();
    if (!init || !Node.isCallExpression(init) || init.getExpression().getText() !== "cva") continue;
    const cfg = init
      .getArguments()
      .find((a) => Node.isObjectLiteralExpression(a) && !!a.getProperty("defaultVariants"));
    if (!cfg || !Node.isObjectLiteralExpression(cfg)) continue;
    const dv = cfg.getProperty("defaultVariants");
    if (!dv || !Node.isPropertyAssignment(dv)) continue;
    const obj = dv.getInitializer();
    if (!obj || !Node.isObjectLiteralExpression(obj)) continue;
    for (const p of obj.getProperties()) {
      if (Node.isPropertyAssignment(p)) {
        const val = p.getInitializer();
        if (val) out.set(p.getName(), val.getText());
      }
    }
  }

  // Destructuring defaults: `function Cmp({ size = "sm", ... }: CmpProps)`
  const scanParams = (params: ParameterDeclaration[]): void => {
    const nameNode = params[0]?.getNameNode();
    if (!nameNode || !Node.isObjectBindingPattern(nameNode)) return;
    for (const el of nameNode.getElements()) {
      const di = el.getInitializer();
      if (di) out.set(el.getName(), di.getText());
    }
  };
  for (const fn of sf.getFunctions()) scanParams(fn.getParameters());
  for (const v of sf.getVariableDeclarations()) {
    const init = v.getInitializer();
    if (init && (Node.isArrowFunction(init) || Node.isFunctionExpression(init)))
      scanParams(init.getParameters());
  }

  return out;
}

/** For an exported `*Props` interface/type alias, list its FIRST-PARTY props —
 * skipping members inherited purely from `node_modules` (e.g. the hundreds of
 * DOM attributes from `React.ComponentProps<"button">`), so only the props this
 * component actually adds (variants, render, etc.) surface in the table. */
function extractProps(name: string, decl: Node): PropRow[] | null {
  if (!/Props$/.test(name)) return null;
  if (!(Node.isInterfaceDeclaration(decl) || Node.isTypeAliasDeclaration(decl))) return null;
  let properties;
  try {
    properties = decl.getType().getProperties();
  } catch {
    return null;
  }
  const defaults = collectDefaults(decl);
  const variantDocs = collectVariantDescriptions(decl);
  const rows: PropRow[] = [];
  for (const prop of properties) {
    const decls = prop.getDeclarations();
    const allExternal =
      decls.length > 0 &&
      decls.every((d) => d.getSourceFile().getFilePath().includes("/node_modules/"));
    if (allExternal) continue; // inherited DOM/lib prop — not part of our surface

    const d0 = decls[0];
    let optional = (prop.getFlags() & SymbolFlags.Optional) !== 0;
    let description = "";
    let jsdocDefault: string | null = null;
    if (d0 && (Node.isPropertySignature(d0) || Node.isPropertyDeclaration(d0))) {
      optional = d0.hasQuestionToken();
      const jsdocs = d0.getJsDocs();
      if (jsdocs.length > 0) {
        const last = jsdocs[jsdocs.length - 1];
        description = (last.getCommentText() ?? "").trim();
        const tag = last.getTags().find((t) => t.getTagName() === "default");
        if (tag) jsdocDefault = (tag.getCommentText() ?? "").trim() || null;
      }
    }
    if (!description) description = variantDocs.get(prop.getName()) ?? "";
    // Prefer the DECLARED type annotation (syntactic) so authored aliases like
    // `React.ReactNode`, `BadgeVariant`, `() => void` survive instead of the
    // fully-expanded resolved type. Fall back to the resolved type for computed
    // props (e.g. cva `VariantProps`) that carry no annotation.
    let typeText = "unknown";
    const typeNode =
      d0 && (Node.isPropertySignature(d0) || Node.isPropertyDeclaration(d0))
        ? d0.getTypeNode()
        : undefined;
    if (typeNode) {
      typeText = typeNode.getText();
    } else {
      try {
        typeText = prop.getTypeAtLocation(decl).getText(decl);
      } catch {
        /* keep fallback */
      }
    }
    // `?` already conveys optionality — drop the trailing `| undefined` noise.
    typeText = typeText.replace(/\s*\|\s*undefined\s*$/, "");
    // Safety net: collapse the giant resolved React.ReactNode union when a
    // computed prop resolves to it (no annotation to preserve).
    if (/React\.ReactPortal/.test(typeText) && /Iterable<React\.ReactNode>/.test(typeText))
      typeText = "React.ReactNode";
    rows.push({
      name: prop.getName(),
      type: typeText,
      optional,
      description,
      default: jsdocDefault ?? defaults.get(prop.getName()) ?? null,
    });
  }
  rows.sort((a, b) => a.name.localeCompare(b.name));
  return rows.length > 0 ? rows : null;
}

export interface PublicSymbol {
  name: string;
  /** Repo-relative file of the resolved declaration (may be under node_modules). */
  file: string;
  /** Declaration resolves into node_modules — an external re-export. */
  external: boolean;
  /** Resolved type text, used for the type-surface hash. */
  typeText: string;
  /** Local declaration text (bodies included) — used for the readable API section. */
  declText: string;
  kind: string;
  /** First-party props, for `*Props` symbols; null otherwise. */
  props: PropRow[] | null;
}

export interface Surface {
  /** Public export name → resolved info. */
  symbols: Map<string, PublicSymbol>;
  /** Type-surface hash over a set of owned names; null when empty. */
  hashSymbols(names: string[]): string | null;
}

/** Load the public surface from `index.ts` via its tsconfig, resolving every
 * re-export to its originating declaration and resolved type. */
export function loadSurface(repoRoot: string, config: DocsConfig): Surface {
  const project = new Project({
    tsConfigFilePath: join(repoRoot, config.tsconfig),
  });
  const index = project.getSourceFileOrThrow(join(repoRoot, config.indexFile));
  const symbols = new Map<string, PublicSymbol>();

  for (const [name, decls] of index.getExportedDeclarations()) {
    const decl = decls[0];
    if (!decl) continue;
    const sourceFile = decl.getSourceFile();
    let typeText: string;
    try {
      typeText = decl.getType().getText(decl);
    } catch {
      typeText = decl.getText();
    }
    symbols.set(name, {
      name,
      file: toPosix(relative(repoRoot, sourceFile.getFilePath())),
      external: sourceFile.isInNodeModules(),
      typeText,
      declText: safeDeclText(decl.getText()),
      kind: decl.getKindName(),
      props: extractProps(name, decl),
    });
  }

  return {
    symbols,
    hashSymbols(names: string[]): string | null {
      if (names.length === 0) return null;
      const parts = names
        .slice()
        .sort()
        .map((n) => {
          const s = symbols.get(n);
          return `${n}::${s ? s.typeText : "<missing>"}`;
        });
      return hash(normalizeText(parts.join("\n")));
    },
  };
}

/** Trim runaway declaration text (e.g. a component whose body is inline). */
function safeDeclText(text: string): string {
  const trimmed = text.trim();
  return trimmed.length > 2000 ? `${trimmed.slice(0, 2000)}\n/* …truncated… */` : trimmed;
}

/** Advisory snapshot signal: hash any centralized snapshot files whose flattened
 * name references this unit's slug. Best-effort — never blocks. */
export function snapshotHashForSlug(
  repoRoot: string,
  config: DocsConfig,
  slug: string,
): string | null {
  if (!config.snapshotDir) return null;
  const dir = join(repoRoot, config.snapshotDir);
  if (!existsSync(dir)) return null;
  const token = slug.replace(/-/g, "-");
  const matched = readdirSync(dir)
    .filter((f) => f.endsWith(".snap") && f.includes(token))
    .sort();
  if (matched.length === 0) return null;
  const contents = matched.map((f) => readFileSync(join(dir, f), "utf8")).join("\n");
  return hash(normalizeText(contents));
}

/** Read the last leading comment (JSDoc or line comment) above a node,
 * cleaned to one line — used for cva variant-key descriptions. */
function leadingCommentText(node: Node): string | null {
  const ranges = node.getLeadingCommentRanges();
  if (ranges.length === 0) return null;
  const cleaned = ranges[ranges.length - 1]
    .getText()
    .replace(/^\/\*\*?/, "")
    .replace(/\*\/$/, "")
    .replace(/^\/\//, "")
    .split("\n")
    .map((l) => l.replace(/^\s*\*?\s?/, "").trim())
    .filter(Boolean)
    .join(" ")
    .trim();
  return cleaned || null;
}

/** Descriptions for cva variant props: the comment above each key in a cva
 * `variants: { … }` object becomes that prop's description in the API table. */
function collectVariantDescriptions(decl: Node): Map<string, string> {
  const out = new Map<string, string>();
  const sf = decl.getSourceFile();
  for (const v of sf.getVariableDeclarations()) {
    const init = v.getInitializer();
    if (!init || !Node.isCallExpression(init) || init.getExpression().getText() !== "cva") continue;
    const cfg = init
      .getArguments()
      .find((a) => Node.isObjectLiteralExpression(a) && !!a.getProperty("variants"));
    if (!cfg || !Node.isObjectLiteralExpression(cfg)) continue;
    const variantsProp = cfg.getProperty("variants");
    if (!variantsProp || !Node.isPropertyAssignment(variantsProp)) continue;
    const obj = variantsProp.getInitializer();
    if (!obj || !Node.isObjectLiteralExpression(obj)) continue;
    for (const p of obj.getProperties()) {
      if (!Node.isPropertyAssignment(p)) continue;
      const text = leadingCommentText(p);
      if (text) out.set(p.getName(), text);
    }
  }
  return out;
}
