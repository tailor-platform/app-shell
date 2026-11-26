// @vitest-environment node
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import ts from "typescript";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { checkProject } from "../scripts/check-dts-project.mjs";

const packageName = "@test/core";
let project;
const write = (path, content) => {
  const file = join(project, path);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, content);
};

beforeEach(() => {
  project = mkdtempSync(join(tmpdir(), "check-dts-test-"));
  write(
    "tsconfig.json",
    JSON.stringify({
      compilerOptions: {
        module: "esnext",
        moduleResolution: "bundler",
        lib: ["es5"],
        types: [],
        strict: true,
        skipLibCheck: false,
      },
      include: ["check.ts"],
    }),
  );
  write("check.ts", "export {};");
});

afterEach(() => rmSync(project, { recursive: true, force: true }));

describe("published declaration checks", () => {
  it("checks package exports and separates consumer/own errors from third-party errors", () => {
    for (const [name, missing] of [
      [packageName, "MissingOwn"],
      ["@test/core-extra", "MissingForeign"],
    ]) {
      write(
        `node_modules/${name}/package.json`,
        JSON.stringify({ name, exports: { ".": { types: "./index.d.ts" } } }),
      );
      write(`node_modules/${name}/index.d.ts`, `export type Broken = ${missing};`);
    }
    write(
      "check.ts",
      `import "${packageName}"; import "@test/core-extra"; import "./nested/consumer";`,
    );
    write("nested/consumer.ts", 'export const value: number = "wrong";');

    const result = checkProject(ts, project, packageName);
    expect(result.ours.map((diagnostic) => diagnostic.code).toSorted()).toEqual([2304, 2322]);
    expect(result.foreign.map((diagnostic) => diagnostic.code)).toEqual([2304]);
    expect(result.unexpected).toEqual([]);
  });

  it("reports unresolved consumer imports as fatal", () => {
    write("check.ts", `import * as entry from "${packageName}"; void entry;`);
    const result = checkProject(ts, project, packageName);
    expect(result.ours.map((diagnostic) => diagnostic.code)).toEqual([2307]);
  });

  it.each([
    ["missing", undefined],
    ["malformed", "{"],
    ["invalid option", JSON.stringify({ compilerOptions: { target: "invalid" } })],
    ["no inputs", JSON.stringify({ include: ["missing/**/*.ts"] })],
  ])("reports %s configs as harness failures", (_name, content) => {
    if (content === undefined) rmSync(join(project, "tsconfig.json"));
    else write("tsconfig.json", content);

    const result = checkProject(ts, project, packageName);
    expect(result.unexpected.length).toBeGreaterThan(0);
    expect(result.ours).toEqual([]);
    expect(result.foreign).toEqual([]);
  });

  it("keeps fileless errors fatal even when third-party errors are present", () => {
    write(
      "tsconfig.json",
      JSON.stringify({ compilerOptions: { noLib: true, types: [] }, files: ["check.ts"] }),
    );
    write("check.ts", 'import "foreign";');
    write("node_modules/foreign/index.d.ts", "export type Broken = MissingForeign;");

    const result = checkProject(ts, project, packageName);
    expect(result.unexpected.length).toBeGreaterThan(0);
    expect(result.unexpected.every((diagnostic) => !diagnostic.file)).toBe(true);
    expect(result.foreign.map((diagnostic) => diagnostic.code)).toEqual([2304]);
  });

  it("isolates fixture augmentations while preserving inherited config", () => {
    for (const name of ["augmented", "plain"]) {
      write(
        `${name}/tsconfig.json`,
        JSON.stringify({ extends: "../tsconfig.json", include: ["check.ts"] }),
      );
    }
    write("augmented/check.ts", "interface Object { fixtureOnly: string }\n({}).fixtureOnly;");
    write(
      "plain/check.ts",
      "// @ts-expect-error The other fixture must not augment Object.\n({}).fixtureOnly;",
    );

    for (const name of ["augmented", "plain"]) {
      expect(checkProject(ts, join(project, name), packageName)).toEqual({
        ours: [],
        foreign: [],
        unexpected: [],
      });
    }
  });
});
