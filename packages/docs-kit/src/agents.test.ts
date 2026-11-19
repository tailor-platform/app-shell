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

const fixture = (template: string, overrides: Partial<AgentsConfig> = {}) => {
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
  writeFileSync(join(root, "AGENTS.template.md"), template);
  const config: AgentsConfig = {
    templatePath: "AGENTS.template.md",
    packageDir: "packages/core",
    docsDir: "docs",
    blockFile: "agents/AGENTS.block.md",
    ...overrides,
  };
  return computeAgents(root, config, outlines);
};

const TEMPLATE = "Docs: {{DOCS_ROOT}}/\n\n{{COMPONENTS_SLUGS}}\n\n{{API_TEASERS}}\n";

describe("computeAgents", () => {
  it("ships each section's docs under the package docs dir, keeping nesting", () => {
    const { docs } = fixture(TEMPLATE);
    expect([...docs.keys()].toSorted()).toEqual([
      "packages/core/docs/api/guards/pass.md",
      "packages/core/docs/components/alert.md",
      "packages/core/docs/components/button.md",
    ]);
  });

  it("fills sorted slug lists and teasers", () => {
    const { block, blockPath } = fixture(TEMPLATE);
    expect(blockPath).toBe("packages/core/agents/AGENTS.block.md");
    expect(block).toContain("\nalert, button\n");
    expect(block).toContain("- `guards/pass`: Allow the route");
  });

  it("leaves the package root for the CLI and bakes in the docs dir", () => {
    expect(fixture(TEMPLATE).block).toContain("Docs: {{PACKAGE_ROOT}}/docs/");
    expect(fixture(TEMPLATE, { docsDir: "dist/docs" }).block).toContain(
      "Docs: {{PACKAGE_ROOT}}/dist/docs/",
    );
  });

  it("requires the docs root exactly once", () => {
    expect(() => fixture("{{COMPONENTS_SLUGS}} {{API_SLUGS}}")).toThrow(/exactly once/);
    expect(() => fixture(`{{DOCS_ROOT}} ${TEMPLATE}`)).toThrow(/exactly once/);
  });

  it("rejects a template that drops a section with docs", () => {
    expect(() => fixture("{{DOCS_ROOT}} {{COMPONENTS_SLUGS}}")).toThrow(/indexes no api docs/);
  });

  it("rejects an unknown placeholder", () => {
    expect(() => fixture(`${TEMPLATE}{{COMPONENT_SLUGS}}`)).toThrow(/unknown placeholder/);
  });

  it("enforces the size budget", () => {
    expect(() => fixture(TEMPLATE, { maxBytes: 10 })).toThrow(/byte budget/);
  });
});
