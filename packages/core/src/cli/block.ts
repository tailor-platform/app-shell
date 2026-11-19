import { PACKAGE_NAME, commandLine } from "./names";

/** Resolved here rather than by docs-kit, because only the consumer's repo
 * layout knows the path into its `node_modules`. */
const PACKAGE_ROOT_TOKEN = "{{PACKAGE_ROOT}}";
const PACKAGE_DIR_TOKEN = "{{PACKAGE_DIR}}";

const marker = (edge: "start" | "end", key: string): string =>
  `<!-- app-shell:agents:${edge} ${key} -->`;

const escapeRegExp = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const markerPattern = (edge: "start" | "end", key: string): string =>
  `<!--\\s*app-shell:agents:${edge}\\s+${escapeRegExp(key)}\\s*-->`;

const normalize = (s: string): string => s.replace(/\s+/g, " ").trim();

/** The block as it sits in the consumer's file. `key` is the frontend package's
 * path, so each package in a repo owns one block. */
export function renderBlock(source: string, key: string, packageRoot: string): string {
  return [
    marker("start", key),
    `<!-- Generated from ${PACKAGE_NAME} by \`${commandLine("sync")}\`. Edits between these markers are overwritten. Delete the whole block to opt out. -->`,
    "",
    source.replaceAll(PACKAGE_ROOT_TOKEN, packageRoot).replaceAll(PACKAGE_DIR_TOKEN, key).trim(),
    "",
    marker("end", key),
  ].join("\n");
}

/** Swap the block between `key`'s markers. Returns null when the markers are
 * absent, which is how a consumer opts out. */
export function replaceBlock(content: string, key: string, block: string): string | null {
  const pattern = new RegExp(
    `${markerPattern("start", key)}[\\s\\S]*?${markerPattern("end", key)}`,
    "g",
  );
  if (!pattern.test(content)) return null;
  const eol = content.includes("\r\n") ? "\r\n" : "\n";
  // A formatter may rewrap the block; only a real content change is worth a diff.
  return content.replace(pattern, (current) =>
    normalize(current) === normalize(block) ? current : block.replaceAll("\n", eol),
  );
}

export function appendBlock(content: string, block: string): string {
  const eol = content.includes("\r\n") ? "\r\n" : "\n";
  const head = content.trimEnd();
  return `${head}${head ? eol + eol : ""}${block.replaceAll("\n", eol)}${eol}`;
}
