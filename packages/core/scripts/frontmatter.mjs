import { parse } from "yaml";

const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/;

export function parseFrontmatter(input) {
  const match = FRONTMATTER_RE.exec(input);
  if (!match) {
    return { data: {}, content: input, matter: "" };
  }

  const rawFrontmatter = match[1];
  const data = rawFrontmatter.trim() ? parse(rawFrontmatter) : {};

  if (data === null || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("Frontmatter must parse to an object");
  }

  return {
    data,
    content: input.slice(match[0].length),
    matter: rawFrontmatter,
  };
}
