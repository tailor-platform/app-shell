import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { readSkillVersion, stampSkill } from "./skill";
import type { DocsConfig } from "./types";

const configWith = (versionSource?: string): DocsConfig => ({
  roots: [],
  tsconfig: "",
  indexFile: "",
  manifestFile: "",
  categories: [],
  enforceCoverage: false,
  exclusions: [],
  skill: { outDir: "", templatePath: "", migrationsSource: "", repoBlobUrl: "", versionSource },
});

describe("stampSkill", () => {
  it("replaces every version placeholder", () => {
    const content = 'app-shell-version: "{{APP_SHELL_VERSION}}"\n**{{APP_SHELL_VERSION}}**';
    expect(stampSkill(content, "1.17.0")).toBe('app-shell-version: "1.17.0"\n**1.17.0**');
  });

  it("leaves placeholder-free content untouched without a version", () => {
    expect(stampSkill("no stamp here", null)).toBe("no stamp here");
  });

  it("throws rather than ship an unfilled placeholder", () => {
    expect(() => stampSkill("{{APP_SHELL_VERSION}}", null)).toThrow(/versionSource/);
  });
});

describe("readSkillVersion", () => {
  it("reads the version from the configured package.json", () => {
    const root = mkdtempSync(join(tmpdir(), "docs-kit-"));
    writeFileSync(join(root, "package.json"), JSON.stringify({ version: "2.0.0" }));
    expect(readSkillVersion(root, configWith("package.json"))).toBe("2.0.0");
  });

  it("returns null when no source is configured", () => {
    expect(readSkillVersion("/nonexistent", configWith())).toBeNull();
  });

  it("throws when the package.json has no version", () => {
    const root = mkdtempSync(join(tmpdir(), "docs-kit-"));
    writeFileSync(join(root, "package.json"), "{}");
    expect(() => readSkillVersion(root, configWith("package.json"))).toThrow(/no "version"/);
  });
});
