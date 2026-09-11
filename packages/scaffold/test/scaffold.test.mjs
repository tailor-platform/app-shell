import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { scaffoldPage } from "../dist/index.mjs";

test("scaffoldPage creates a resource/list page bundle", () => {
  const outDir = mkdtempSync(join(tmpdir(), "app-shell-scaffold-"));

  scaffoldPage({
    kind: "resource/list",
    name: "purchase-order",
    outDir,
  });

  const page = readFileSync(join(outDir, "page.tsx"), "utf8");
  const table = readFileSync(join(outDir, "components", "purchase-orders-table.tsx"), "utf8");

  assert.match(page, /app-shell-scaffold: resource\/list scaffold banner\./);
  assert.match(page, /pattern: list\/dense-scan/);
  assert.match(page, /ListTable/);
  assert.match(table, /app-shell-scaffold: resource\/list table scaffold banner\./);
  assert.match(table, /type PurchaseOrderRow/);
  assert.match(
    table,
    /TODO\(app-shell-scaffold\): Step 1 of 5\. Add your GraphQL query and imports\./,
  );
  assert.match(
    table,
    /TODO\(app-shell-scaffold\): Step 2 of 5\. Replace the placeholder row type below/,
  );
  assert.match(
    table,
    /TODO\(app-shell-scaffold\): Step 3 of 5\. Replace the inline metadata below with/,
  );
  assert.match(table, /metadata output path is configurable/);
  assert.match(table, /Search your project for `app-shell-datatable\.generated\.ts` or/);
  assert.match(
    table,
    /TODO\(app-shell-scaffold\): Step 4 of 5\. Replace the placeholder data block/,
  );
  assert.match(table, /TODO\(app-shell-scaffold\): Step 5 of 5\. Keep a labelled empty state/);
  assert.match(table, /```ts/);
  assert.match(table, /const loading = fetching/);
  assert.match(table, /const tableData = data\?\./);
  assert.match(table, /data: tableData/);
});

test("cli prints next steps after scaffolding", () => {
  const outDir = mkdtempSync(join(tmpdir(), "app-shell-scaffold-cli-"));
  const cliPath = fileURLToPath(new URL("../dist/cli.mjs", import.meta.url));
  const stdout = execFileSync(
    process.execPath,
    [cliPath, "resource/list", "--name", "purchase-order", "--out", outDir],
    { cwd: process.cwd(), encoding: "utf8" },
  );

  assert.match(stdout, /Created resource\/list scaffold for purchase-order/);
  assert.match(stdout, /Next steps:/);
  assert.match(
    stdout,
    /2\. In .*add graphql\(\.\.\.\) \+ useQuery\(\.\.\.\) and write the collection query/,
  );
  assert.match(stdout, /3\. In .*GraphQL-generated node type/);
  assert.match(stdout, /4\. In .*metadataOutputPath is configurable/);
  assert.match(stdout, /app-shell-datatable\.generated\.ts/);
  assert.match(stdout, /6\. Map edges -> rows/);
});
