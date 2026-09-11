#!/usr/bin/env node
import { cwd } from "node:process";
import { relative } from "node:path";
import { scaffoldPage, type ScaffoldKind, type ScaffoldPageResult } from "./index.js";

const SUPPORTED_KINDS: ScaffoldKind[] = ["resource/list"];

function printUsage(): void {
  console.log(
    `Usage:\n  app-shell-scaffold <kind> --name <entity-name> --out <directory> [--force]\n`,
  );
  console.log("Supported kinds:");
  for (const kind of SUPPORTED_KINDS) console.log(`  - ${kind}`);
}

function printNextSteps(result: ScaffoldPageResult): void {
  const relativeFiles = result.files.map((file) => relative(cwd(), file) || ".");

  switch (result.kind) {
    case "resource/list": {
      const tableFile = relativeFiles.find(
        (file) => file.includes("/components/") || file.includes("\\components\\"),
      );
      const pageFile = relativeFiles.find((file) => file.endsWith("page.tsx"));

      console.log("\nNext steps:");
      if (pageFile) console.log(`  1. Page shell is ready: ${pageFile}`);
      if (tableFile)
        console.log(
          `  2. In ${tableFile}, add graphql(...) + useQuery(...) and write the collection query.`,
        );
      if (tableFile)
        console.log(
          `  3. In ${tableFile}, replace the placeholder row type with a GraphQL-generated node type.`,
        );
      if (tableFile)
        console.log(
          `  4. In ${tableFile}, search your project for the generated tableMetadata file (metadataOutputPath is configurable; look for app-shell-datatable.generated.ts or \`export const tableMetadata =\`) and import tableMetadata.<entity>.`,
        );
      console.log(
        "  5. Replace the placeholder rows / loading / error / tableData block using variables.pagination, variables.order, and variables.query.",
      );
      console.log(
        "  6. Map edges -> rows and pass pageInfo / total / loading / error into useDataTable.",
      );
      console.log("  7. Keep the labelled empty state after replacing the placeholder rows.");
      console.log(
        "  8. Create a sibling create/page.tsx route if you keep the header Create action.",
      );
      return;
    }
  }
}

const args = process.argv.slice(2);

if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
  printUsage();
  process.exit(args.length === 0 ? 1 : 0);
}

const [kindArg, ...rest] = args;
if (!SUPPORTED_KINDS.includes(kindArg as ScaffoldKind)) {
  console.error(`Unsupported kind: ${kindArg}`);
  printUsage();
  process.exit(1);
}

let name: string | undefined;
let outDir: string | undefined;
let force = false;

for (let index = 0; index < rest.length; index += 1) {
  const arg = rest[index];

  if (arg === "--force") {
    force = true;
    continue;
  }

  if (arg === "--name") {
    name = rest[index + 1];
    index += 1;
    continue;
  }

  if (arg === "--out") {
    outDir = rest[index + 1];
    index += 1;
    continue;
  }

  console.error(`Unknown option: ${arg}`);
  process.exit(1);
}

if (!name || !outDir) {
  printUsage();
  process.exit(1);
}

try {
  const result = scaffoldPage({ kind: kindArg as ScaffoldKind, name, outDir, force });
  const displayPath = relative(cwd(), result.outDir) || ".";

  console.log(`Created ${result.kind} scaffold for ${result.entityName} in ${displayPath}`);
  printNextSteps(result);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
