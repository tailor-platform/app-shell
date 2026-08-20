import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
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

function selfCheck() {
  const sample = `---
slug: pattern/list/dense-scan
name: Dense Scan List
requiredImports:
  [
    DataTable,
    useDataTable,
  ]
tags: [table, datatable]
do:
  - Browsing many records
  - Operators sort and filter
enabled: true
---

# Body
`;

  assert.deepStrictEqual(parseFrontmatter(sample), {
    data: {
      slug: "pattern/list/dense-scan",
      name: "Dense Scan List",
      requiredImports: ["DataTable", "useDataTable"],
      tags: ["table", "datatable"],
      do: ["Browsing many records", "Operators sort and filter"],
      enabled: true,
    },
    content: "\n# Body\n",
    matter: `slug: pattern/list/dense-scan
name: Dense Scan List
requiredImports:
  [
    DataTable,
    useDataTable,
  ]
tags: [table, datatable]
do:
  - Browsing many records
  - Operators sort and filter
enabled: true`,
  });

  assert.deepStrictEqual(parseFrontmatter("# Body\n"), {
    data: {},
    content: "# Body\n",
    matter: "",
  });

  console.log("frontmatter parser ok");
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  selfCheck();
}
