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
const BLOCK = "Docs in `{{DOCS_ROOT}}/` for `{{PACKAGE_DIR}}`.\n\n@{{GUIDE_PATH}}\n";

const fixture = (
  templates: { guide?: string; block?: string } = {},
  overrides: Partial<AgentsConfig> = {},
) => {
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
  writeFileSync(join(root, "block.md"), templates.block ?? BLOCK);
  const config: AgentsConfig = {
    guideTemplatePath: "guide.md",
    blockTemplatePath: "block.md",
    packageDir: "packages/core",
    docsDir: "dist/docs",
    blockFile: "dist/agents/AGENTS.block.md",
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

  it("writes the index into the docs root's README and leaves the version to stamp", () => {
    const guide = fixture().generated.get("packages/core/dist/docs/README.md")!;
    expect(guide).toContain("# Docs {{APP_SHELL_VERSION}}");
    expect(guide).toContain("\nalert, button\n");
    expect(guide).toContain("- `guards/pass`: Allow the route");
  });

  it("points the block at the guide and leaves package paths for the CLI", () => {
    const block = fixture().generated.get("packages/core/dist/agents/AGENTS.block.md")!;
    expect(block).toBe(
      "Docs in `{{PACKAGE_ROOT}}/dist/docs/` for `{{PACKAGE_DIR}}`.\n\n@{{PACKAGE_ROOT}}/dist/docs/README.md\n",
    );
  });

  it("follows the docs dir in the block", () => {
    const block = fixture({}, { docsDir: "docs" }).generated.get(
      "packages/core/dist/agents/AGENTS.block.md",
    );
    expect(block).toContain("@{{PACKAGE_ROOT}}/docs/README.md");
  });

  it("requires the block to point at the guide", () => {
    expect(() => fixture({ block: "Docs: {{DOCS_ROOT}}" })).toThrow(
      /must include \{\{GUIDE_PATH\}\}/,
    );
  });

  it("rejects a guide that drops a section with docs", () => {
    expect(() => fixture({ guide: "{{COMPONENTS_SLUGS}}" })).toThrow(/indexes no api docs/);
  });

  it("rejects unknown placeholders in either template", () => {
    expect(() => fixture({ guide: `${GUIDE}{{COMPONENT_SLUGS}}` })).toThrow(/unknown placeholder/);
    expect(() => fixture({ block: `${BLOCK}{{VERSION}}` })).toThrow(/unknown placeholder/);
  });

  it("enforces both size budgets", () => {
    expect(() => fixture({}, { maxBytes: 10 })).toThrow(/guide\.md: .* byte budget/);
    expect(() => fixture({}, { blockMaxBytes: 10 })).toThrow(/block\.md: .* byte budget/);
  });
});
