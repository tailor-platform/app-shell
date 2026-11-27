import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { check } from "./check";
import { computeSkill, readSkillVersion, stampSkill, unclaimedSkillDirFindings } from "./skill";
import { sync } from "./sync";
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
    const migrations = {
      slug: "migrations",
      outDir: "docs",
      mdPath: "docs/migrations.md",
    } as Outline;
    return { root, outlines: [button, migrations] };
  };

  it("covers every section by default", () => {
    const { root, outlines } = fixture();
    const { files } = computeSkill(
      root,
      { outDir: "out", templatePath: "SKILL.template.md" },
      outlines,
    );
    expect([...files.keys()].toSorted()).toEqual(["SKILL.md", "references/components/button.md"]);
    expect(files.get("references/components/button.md")?.unitSlug).toBe("button");
  });

  it("leaves pointer stubs and lists docs-root paths", () => {
    const { root } = fixture();
    mkdirSync(join(root, "docs/api/guards"), { recursive: true });
    writeFileSync(join(root, "docs/api/guards/pass.md"), "# pass\n");
    writeFileSync(join(root, "SKILL.template.md"), "{{COMPONENTS_TABLE}}\n\n{{API_TABLE}}\n");
    const outlines = [
      {
        slug: "button",
        outDir: "docs/components",
        mdPath: "docs/components/button.md",
        frontmatter: { title: "Button", description: "Clickable" },
      },
      {
        slug: "guards/pass",
        outDir: "docs/api",
        mdPath: "docs/api/guards/pass.md",
        frontmatter: { title: "pass", description: "Allow" },
      },
    ] as unknown as Outline[];
    const { files } = computeSkill(
      root,
      { outDir: "out", templatePath: "SKILL.template.md" },
      outlines,
    );

    const stub = files.get("references/components/button.md")?.content;
    expect(stub).toMatch(/^# MOVED: Button\. This file is a pointer, not documentation\./);
    expect(stub).toContain("`components/button.md`");
    expect(stub).toContain("`../../SKILL.md`");
    expect(stub).not.toContain("# Button");
    expect(files.get("references/api/guards/pass.md")?.content).toContain("`../../../SKILL.md`");

    const skillMd = files.get("SKILL.md")?.content;
    expect(skillMd).toContain("Button (`components/button.md`)");
    expect(skillMd).not.toContain("](references/");
  });

  it("updates table links without changing the template hash", () => {
    const { root, outlines } = fixture();
    const tabPath = "docs/components/tabs.md";
    writeFileSync(join(root, tabPath), "# Tabs\n");
    const tabs: Outline = {
      ...outlines[0],
      slug: "tabs",
      mdPath: tabPath,
      frontmatter: { ...outlines[0].frontmatter, title: "Tabs" },
    };
    const config = { outDir: "out", templatePath: "SKILL.template.md" };
    const withTabs = computeSkill(root, config, [...outlines, tabs]);
    expect(withTabs.files.get("SKILL.md")?.content).toContain("Button (`components/button.md`)");
    expect(withTabs.files.get("SKILL.md")?.content).toContain("Tabs (`components/tabs.md`)");
    const withoutButton = computeSkill(root, config, [tabs]);
    expect(withoutButton.files.get("SKILL.md")?.content).not.toContain("components/button.md");
    expect(withoutButton.template.hash).toBe(withTabs.template.hash);
  });

  it("ships only the migrations doc when sections is empty", () => {
    const { root, outlines } = fixture();
    const { files } = computeSkill(
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
    expect([...files.keys()].toSorted()).toEqual(["SKILL.md", "references/migrations.md"]);
    expect(files.get("references/migrations.md")).toEqual({
      unitSlug: "migrations",
      content: "See [x](https://example.test/blob/main/docs/concepts/a.md)\n",
    });
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

  it("requires the migrations source to belong to a unit", () => {
    const { root, outlines } = fixture();
    expect(() =>
      computeSkill(
        root,
        {
          outDir: "up",
          templatePath: "SKILL.template.md",
          migrationsSource: "docs/migrations.md",
          repoBlobUrl: "https://example.test/blob/main",
        },
        outlines.filter((outline) => outline.slug !== "migrations"),
      ),
    ).toThrow(/docs\/migrations\.md has no unit/);
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

it("checks template edits and the paths and source units of skill outputs", () => {
  const root = mkdtempSync(join(tmpdir(), "docs-kit-manifest-"));
  const write = (p: string, value: string) => writeFileSync(join(root, p), value);
  const upgrade: SkillConfig = {
    outDir: "upgrade",
    templatePath: "upgrade.template.md",
    sections: [],
    migrationsSource: "docs/migrations.md",
    repoBlobUrl: "https://example.test/blob/main",
  };
  const configure = (outDir: string, id = "patterns", templatePath = "SKILL.template.md") =>
    write(
      "docs-kit.config.json",
      JSON.stringify({
        inputs: { api: { tsconfig: "tsconfig.json", entrypoint: "index.ts" } },
        outputs: {
          documents: {
            mappings: [
              { match: "docs-src/components/**", dir: "docs/components" },
              { match: "docs-src/guides/**", dir: "docs" },
            ],
          },
          agents: { guideTemplatePath: "AGENTS.template.md", packageDir: "pkg", docsDir: "docs" },
          skills: { [id]: { outDir, templatePath }, upgrade },
        },
        policy: { skills: { unclaimed: [{ dir: "docs", reason: "Guides are opt-in" }] } },
      }),
    );
  const messages = () => check(root).findings.map((f) => f.message);
  try {
    mkdirSync(join(root, "docs-src/components"), { recursive: true });
    mkdirSync(join(root, "docs-src/guides"), { recursive: true });
    write(
      "tsconfig.json",
      JSON.stringify({ compilerOptions: { noLib: true }, files: ["index.ts"] }),
    );
    write("index.ts", "export {};\n");
    write(
      "docs-src/components/button.docs.outline.md",
      "---\nkind: prose\ngroup: button\ntitle: Button\ndescription: Clickable\n---\n\nButton docs.\n",
    );
    write(
      "docs-src/guides/migrations.docs.outline.md",
      "---\nkind: prose\ngroup: migrations\ntitle: Migrations\ndescription: Upgrade notes\n---\n\nSee [Button](./components/button.md).\n",
    );
    write("SKILL.template.md", "{{COMPONENTS_TABLE}}\n");
    write("upgrade.template.md", "Upgrade guide.\n");
    write("AGENTS.template.md", "{{COMPONENTS_TEASERS}}\n");
    configure("patterns");
    const { manifest } = sync(root);
    expect(manifest.units.button.skillReferences).toEqual({ patterns: ["components/button.md"] });
    expect(manifest.units.migrations.skillReferences).toEqual({ upgrade: ["migrations.md"] });
    expect(manifest.skills).toEqual({
      patterns: {
        output: { dir: "patterns", filename: "SKILL.md" },
        template: { path: "SKILL.template.md", hash: expect.any(String) },
      },
      upgrade: {
        output: { dir: "upgrade", filename: "SKILL.md" },
        template: { path: "upgrade.template.md", hash: expect.any(String) },
      },
    });
    expect(check(root).ok).toBe(true);
    const outline = "docs-src/components/button.docs.outline.md";
    const originalOutline = readFileSync(join(root, outline), "utf8");
    write(outline, originalOutline.replace("Clickable", "Pressable"));
    const updated = sync(root).manifest;
    expect(updated).toEqual({
      ...manifest,
      units: { ...manifest.units, button: updated.units.button },
    });
    expect(readFileSync(join(root, "pkg/docs/AGENTS.md"), "utf8")).toContain("Pressable");
    expect(check(root).ok).toBe(true);
    write(outline, originalOutline);
    sync(root);

    write("AGENTS.template.md", "Read these first.\n\n{{COMPONENTS_TEASERS}}\n");
    expect(messages()).toEqual(["pkg/docs/AGENTS.md guide path or template drifted — run sync."]);
    write("AGENTS.template.md", "{{COMPONENTS_TEASERS}}\n");

    upgrade.repoBlobUrl = "https://example.test/blob/next";
    configure("patterns");
    expect(check(root).ok).toBe(true);
    upgrade.migrationsSource = "docs/components/button.md";
    configure("patterns");
    expect(messages()).toEqual(["skill file upgrade/references/migrations.md drifted — run sync."]);
    upgrade.migrationsSource = "docs/migrations.md";
    configure("patterns", "renamed");
    expect(messages()).toContain("skill file patterns/SKILL.md drifted — run sync.");
    write("renamed.template.md", "{{COMPONENTS_TABLE}}\n");
    configure("patterns", "patterns", "renamed.template.md");
    expect(messages()).toEqual(["skill template renamed.template.md drifted — run sync."]);
    configure("patterns");

    for (const path of ["SKILL.template.md", "upgrade.template.md"]) {
      const original = readFileSync(join(root, path), "utf8");
      write(path, `Read these first.\n\n${original}`);
      expect(messages()).toEqual([`skill template ${path} drifted — run sync.`]);
      write(path, original);
    }

    const output = "docs/components/button.md";
    const original = readFileSync(join(root, output), "utf8");
    write(output, "Stale output.\n");
    expect(messages()).toEqual([
      `${output} was hand-edited or is stale — never edit generated files; run sync.`,
    ]);
    write(output, original);

    configure("moved");
    expect(messages().toSorted()).toEqual(
      [
        "skill file patterns/SKILL.md removed — run sync.",
        "skill file patterns/references/components/button.md removed — run sync.",
        "skill file moved/SKILL.md is new — run sync.",
        "skill file moved/references/components/button.md is new — run sync.",
      ].toSorted(),
    );
    const moved = sync(root).manifest;
    expect(moved.units).toEqual(manifest.units);
    expect(moved.skills?.patterns.output.dir).toBe("moved");
    expect(check(root).ok).toBe(true);

    const broken = structuredClone(moved);
    const skillOutput = broken.skills!.patterns.output;
    skillOutput.filename = "old-SKILL.md";
    write("docs-manifest.json", JSON.stringify(broken));
    expect(messages().toSorted()).toEqual([
      "skill file moved/SKILL.md is new — run sync.",
      "skill file moved/old-SKILL.md removed — run sync.",
    ]);
    skillOutput.filename = "SKILL.md";
    broken.units.button.skillReferences = { patterns: ["components/old-button.md"] };
    write("docs-manifest.json", JSON.stringify(broken));
    expect(messages().toSorted()).toEqual([
      "skill file moved/references/components/button.md is new — run sync.",
      "skill file moved/references/components/old-button.md removed — run sync.",
    ]);
    broken.units.button.skillReferences = { unknown: ["components/button.md"] };
    write("docs-manifest.json", JSON.stringify(broken));
    expect(messages()).toContain(
      "skill references for button refer to unknown skill unknown — run sync.",
    );

    upgrade.sections = ["components"];
    upgrade.migrationsSource = "docs/components/button.md";
    configure("moved");
    expect(sync(root).manifest.units.button.skillReferences?.upgrade).toEqual([
      "components/button.md",
      "migrations.md",
    ]);
    expect(check(root).ok).toBe(true);

    write("docs-kit.config.json", JSON.stringify({ outputs: { skills: [] } }));
    expect(() => check(root)).toThrow(/outputs\.skills must be an object keyed by skill ID/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

const docsConfig = (
  skills: DocsConfig["skills"],
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
  agents: { guideTemplatePath: "", packageDir: "", docsDir: "" },
  unclaimedSkillDirs,
});
const messages = (c: DocsConfig): string[] => unclaimedSkillDirFindings(c).map((f) => f.message);
const docsException = { dir: "docs", reason: "guides are for people" };

describe("unclaimedSkillDirFindings", () => {
  it("passes when every dir is claimed or excepted", () => {
    expect(messages(docsConfig({ s: { outDir: "s", templatePath: "" } }, [docsException]))).toEqual(
      [],
    );
  });

  it("blocks a dir no skill carries", () => {
    expect(messages(docsConfig({ s: { outDir: "s", templatePath: "" } }))).toEqual([
      expect.stringMatching(/^docs has no skill section/),
    ]);
  });

  it("blocks a section that every skill leaves out", () => {
    expect(
      messages(docsConfig({ s: { outDir: "s", templatePath: "", sections: [] } }, [docsException])),
    ).toEqual([expect.stringMatching(/^docs\/patterns \(section "patterns"\) is in no skill/)]);
  });

  it("blocks stale and reasonless exceptions", () => {
    const found = messages(
      docsConfig({ s: { outDir: "s", templatePath: "" } }, [
        { dir: "docs", reason: " " },
        { dir: "docs/patterns", reason: "x" },
        { dir: "docs/gone", reason: "x" },
      ]),
    );
    expect(found).toEqual([
      expect.stringMatching(/^docs\/patterns is listed .* but a skill carries it/),
      expect.stringMatching(/^policy.skills.unclaimed entry docs needs a reason/),
      expect.stringMatching(/lists docs\/gone, which is not a documents.mappings dir/),
    ]);
  });

  it("is off when no skill is configured", () => {
    expect(messages(docsConfig({}))).toEqual([]);
  });
});
