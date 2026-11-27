import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { computeAgents } from "./agents";
import type { AgentsConfig, Outline } from "./types";

const outline = (dir: string, slug: string, description: string): Outline =>
  ({
    slug,
    outDir: `docs/${dir}`,
    mdPath: `docs/${dir}/${slug}.md`,
    frontmatter: { title: slug, description },
  }) as unknown as Outline;

const GUIDE = "# Docs {{APP_SHELL_VERSION}}\n\n{{COMPONENTS_SLUGS}}\n\n{{API_TEASERS}}\n";

const fixture = (templates: { guide?: string } = {}, overrides: Partial<AgentsConfig> = {}) => {
  const root = mkdtempSync(join(tmpdir(), "docs-kit-agents-"));
  const outlines = [
    outline("components", "button", "Clickable"),
    outline("components", "alert", "Inline message"),
    outline("api", "guards/pass", "Allow the route"),
    outline("references", "glossary", "Not shipped"),
  ];
  for (const o of outlines) {
    mkdirSync(join(root, o.mdPath, ".."), { recursive: true });
    writeFileSync(join(root, o.mdPath), `# ${o.slug}\n`);
  }
  writeFileSync(join(root, "guide.md"), templates.guide ?? GUIDE);
  const config: AgentsConfig = {
    guideTemplatePath: "guide.md",
    packageDir: "packages/core",
    docsDir: "dist/docs",
    ...overrides,
  };
  return computeAgents(root, config, outlines);
};

describe("computeAgents", () => {
  it("ships each section's docs under the package docs dir, keeping nesting", () => {
    expect([...fixture().docs.keys()].toSorted()).toEqual([
      "packages/core/dist/docs/api/guards/pass.md",
      "packages/core/dist/docs/components/alert.md",
      "packages/core/dist/docs/components/button.md",
    ]);
  });

  it("writes the index into the docs root's AGENTS.md and leaves the version to stamp", () => {
    const guide = fixture().generated.get("packages/core/dist/docs/AGENTS.md")!;
    expect(guide).toContain("# Docs {{APP_SHELL_VERSION}}");
    expect(guide).toContain("\nalert, button\n");
    expect(guide).toContain("- `guards/pass`: Allow the route");
  });

  it("emits only the guide besides the docs", () => {
    expect([...fixture().generated.keys()]).toEqual(["packages/core/dist/docs/AGENTS.md"]);
  });

  it("follows the docs dir", () => {
    expect([...fixture({}, { docsDir: "docs" }).generated.keys()]).toEqual([
      "packages/core/docs/AGENTS.md",
    ]);
  });

  it("rejects a guide that drops a section with docs", () => {
    expect(() => fixture({ guide: "{{COMPONENTS_SLUGS}}" })).toThrow(/indexes no api docs/);
  });

  it("rejects unknown placeholders in the guide", () => {
    expect(() => fixture({ guide: `${GUIDE}{{COMPONENT_SLUGS}}` })).toThrow(/unknown placeholder/);
  });

  it("enforces the size budget", () => {
    expect(() => fixture({}, { maxBytes: 10 })).toThrow(/guide\.md: .* byte budget/);
  });
});
