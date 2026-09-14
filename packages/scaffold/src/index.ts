import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { basename, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const TEXT_EXTENSIONS = new Set([".css", ".html", ".json", ".jsonc", ".md", ".ts", ".tsx"]);
const TEXT_BASENAMES = new Set([".gitignore"]);
const TEMPLATE_DIRS = {
  "resource/list": fileURLToPath(new URL("../templates/resource/list", import.meta.url)),
} as const;

export type ScaffoldKind = keyof typeof TEMPLATE_DIRS;

export interface ScaffoldPageOptions {
  kind: ScaffoldKind;
  name: string;
  outDir: string;
  force?: boolean;
}

export interface ScaffoldPageResult {
  kind: ScaffoldKind;
  outDir: string;
  entityName: string;
  files: string[];
}

function splitWords(value: string): string[] {
  return value
    .trim()
    .split(/[^a-zA-Z0-9]+/)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => part.toLowerCase());
}

function capitalize(value: string): string {
  return value.slice(0, 1).toUpperCase() + value.slice(1);
}

function pluralizeWord(value: string): string {
  if (/[bcdfghjklmnpqrstvwxyz]y$/i.test(value)) return `${value.slice(0, -1)}ies`;
  if (/(s|x|z|ch|sh)$/i.test(value)) return `${value}es`;
  return `${value}s`;
}

function buildNameTokens(name: string): Record<string, string> {
  const singularWords = splitWords(name);
  if (singularWords.length === 0) {
    throw new Error("Entity name is required.");
  }

  const pluralWords = [...singularWords];
  pluralWords[pluralWords.length - 1] = pluralizeWord(
    pluralWords[pluralWords.length - 1] ?? "item",
  );

  const singularTitle = singularWords.map(capitalize).join(" ");
  const pluralTitle = pluralWords.map(capitalize).join(" ");

  return {
    __ENTITY_NAME_SINGULAR_KEBAB__: singularWords.join("-"),
    __ENTITY_NAME_PLURAL_KEBAB__: pluralWords.join("-"),
    __ENTITY_NAME_SINGULAR_CAMEL__:
      singularWords[0] + singularWords.slice(1).map(capitalize).join(""),
    __ENTITY_NAME_PLURAL_CAMEL__: pluralWords[0] + pluralWords.slice(1).map(capitalize).join(""),
    __ENTITY_NAME_SINGULAR_PASCAL__: singularWords.map(capitalize).join(""),
    __ENTITY_NAME_PLURAL_PASCAL__: pluralWords.map(capitalize).join(""),
    __ENTITY_NAME_SINGULAR_TITLE__: singularTitle,
    __ENTITY_NAME_PLURAL_TITLE__: pluralTitle,
    __ENTITY_NAME_SINGULAR_TITLE_LOWER__: singularTitle.toLowerCase(),
    __ENTITY_NAME_PLURAL_TITLE_LOWER__: pluralTitle.toLowerCase(),
    __TABLE_FILE__: `${pluralWords.join("-")}-table`,
  };
}

function isTextFile(filePath: string): boolean {
  return TEXT_BASENAMES.has(basename(filePath)) || TEXT_EXTENSIONS.has(extname(filePath));
}

function replaceTokens(value: string, replacements: Record<string, string>): string {
  let next = value;
  for (const [token, replacement] of Object.entries(replacements)) {
    next = next.replaceAll(token, replacement);
  }
  return next;
}

function ensureOutputDirectory(outDir: string, force: boolean): void {
  if (!existsSync(outDir)) {
    mkdirSync(outDir, { recursive: true });
    return;
  }

  if (!statSync(outDir).isDirectory()) {
    throw new Error(`Output path exists and is not a directory: ${outDir}`);
  }

  if (!force && readdirSync(outDir).length > 0) {
    throw new Error(`Output directory is not empty: ${outDir}`);
  }
}

function copyTemplateDirectory(
  sourceDir: string,
  targetDir: string,
  replacements: Record<string, string>,
): string[] {
  mkdirSync(targetDir, { recursive: true });

  const files: string[] = [];

  for (const entry of readdirSync(sourceDir, { withFileTypes: true })) {
    const sourcePath = join(sourceDir, entry.name);
    const targetName = replaceTokens(entry.name, replacements);
    const targetPath = join(targetDir, targetName);

    if (entry.isDirectory()) {
      files.push(...copyTemplateDirectory(sourcePath, targetPath, replacements));
      continue;
    }

    const file = readFileSync(sourcePath);
    if (!isTextFile(sourcePath)) {
      writeFileSync(targetPath, file);
      files.push(targetPath);
      continue;
    }

    writeFileSync(targetPath, replaceTokens(file.toString("utf8"), replacements), "utf8");
    files.push(targetPath);
  }

  return files;
}

export function scaffoldPage(options: ScaffoldPageOptions): ScaffoldPageResult {
  const templateDir = TEMPLATE_DIRS[options.kind];
  const outDir = resolve(options.outDir);
  const replacements = buildNameTokens(options.name);

  ensureOutputDirectory(outDir, Boolean(options.force));
  const files = copyTemplateDirectory(templateDir, outDir, replacements);

  return {
    kind: options.kind,
    outDir,
    entityName: options.name,
    files,
  };
}
