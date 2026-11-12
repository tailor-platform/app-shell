import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { computeSkill, readSkillVersion, stampSkill, unclaimedSkillDirFindings } from "./skill";
import type { DocsConfig, Outline, SkillConfig, UnclaimedSkillDir } from "./types";

const configWith = (versionSource?: string): SkillConfig => ({
  outDir: "",
  templatePath: "",
  versionSource,
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

describe("computeSkill", () => {
  const fixture = () => {
    const root = mkdtempSync(join(tmpdir(), "docs-kit-"));
    mkdirSync(join(root, "docs/components"), { recursive: true });
    writeFileSync(join(root, "docs/components/button.md"), "# Button\n");
    writeFileSync(
      join(root, "docs/migrations.md"),
      "---\ntitle: M\n---\nSee [x](./concepts/a.md)\n",
    );
    writeFileSync(join(root, "SKILL.template.md"), "{{COMPONENTS_TABLE}}\n");
    const button = {
      slug: "button",
      outDir: "docs/components",
      mdPath: "docs/components/button.md",
      frontmatter: { title: "Button", description: "Clickable" },
    } as unknown as Outline;
    return { root, outlines: [button] };
  };

  it("copies every section by default", () => {
    const { root, outlines } = fixture();
    const files = computeSkill(
      root,
      { outDir: "out", templatePath: "SKILL.template.md" },
      outlines,
    );
    expect([...files.keys()].toSorted()).toEqual([
      "out/SKILL.md",
      "out/references/components/button.md",
    ]);
    expect(files.get("out/SKILL.md")).toContain("[Button](references/components/button.md)");
  });

  it("ships only the migrations doc when sections is empty", () => {
    const { root, outlines } = fixture();
    const files = computeSkill(
      root,
      {
        outDir: "up",
        templatePath: "SKILL.template.md",
        sections: [],
        migrationsSource: "docs/migrations.md",
        repoBlobUrl: "https://example.test/blob/main",
      },
      outlines,
    );
    expect([...files.keys()].toSorted()).toEqual(["up/SKILL.md", "up/references/migrations.md"]);
    expect(files.get("up/references/migrations.md")).toBe(
      "See [x](https://example.test/blob/main/docs/concepts/a.md)\n",
    );
  });

  it("throws when the configured migrations source is missing", () => {
    const { root, outlines } = fixture();
    expect(() =>
      computeSkill(
        root,
        {
          outDir: "up",
          templatePath: "SKILL.template.md",
          migrationsSource: "docs/moved.md",
          repoBlobUrl: "https://example.test/blob/main",
        },
        outlines,
      ),
    ).toThrow(/docs\/moved\.md does not exist/);
  });

  it("requires repoBlobUrl alongside migrationsSource", () => {
    const { root, outlines } = fixture();
    expect(() =>
      computeSkill(
        root,
        { outDir: "up", templatePath: "SKILL.template.md", migrationsSource: "docs/migrations.md" },
        outlines,
      ),
    ).toThrow(/repoBlobUrl/);
  });
});

const docsConfig = (
  skills: SkillConfig[],
  unclaimedSkillDirs: UnclaimedSkillDir[] = [],
): DocsConfig => ({
  roots: [],
  tsconfig: "",
  indexFile: "",
  manifestFile: "",
  categories: [
    { match: "docs-src/patterns/**", outDir: "docs/patterns" },
    { match: "docs-src/guides/**", outDir: "docs" },
  ],
  enforceCoverage: false,
  exclusions: [],
  skills,
  unclaimedSkillDirs,
});
const messages = (c: DocsConfig): string[] => unclaimedSkillDirFindings(c).map((f) => f.message);
const docsException = { dir: "docs", reason: "guides are for people" };

describe("unclaimedSkillDirFindings", () => {
  it("passes when every dir is claimed or excepted", () => {
    expect(messages(docsConfig([{ outDir: "s", templatePath: "" }], [docsException]))).toEqual([]);
  });

  it("blocks a dir no skill carries", () => {
    expect(messages(docsConfig([{ outDir: "s", templatePath: "" }]))).toEqual([
      expect.stringMatching(/^docs has no skill section/),
    ]);
  });

  it("blocks a section that every skill leaves out", () => {
    expect(
      messages(docsConfig([{ outDir: "s", templatePath: "", sections: [] }], [docsException])),
    ).toEqual([expect.stringMatching(/^docs\/patterns \(section "patterns"\) is in no skill/)]);
  });

  it("blocks stale and reasonless exceptions", () => {
    const found = messages(
      docsConfig(
        [{ outDir: "s", templatePath: "" }],
        [
          { dir: "docs", reason: " " },
          { dir: "docs/patterns", reason: "x" },
          { dir: "docs/gone", reason: "x" },
        ],
      ),
    );
    expect(found).toEqual([
      expect.stringMatching(/^docs\/patterns is listed .* but a skill carries it/),
      expect.stringMatching(/^policy.skills.unclaimed entry docs needs a reason/),
      expect.stringMatching(/lists docs\/gone, which is not a documents.mappings dir/),
    ]);
  });

  it("is off when no skill is configured", () => {
    expect(messages(docsConfig([]))).toEqual([]);
  });
});
