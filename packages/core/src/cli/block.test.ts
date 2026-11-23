// @vitest-environment node
import { describe, expect, it } from "vitest";

import { appendBlock, renderBlock, replaceBlock } from "./block";

const block = (key: string, body = "Docs: {{PACKAGE_ROOT}}/docs/") =>
  renderBlock(body, key, `${key}/node_modules/@tailor-platform/app-shell`);

describe("renderBlock", () => {
  it("fills in the package's own path and the sync command", () => {
    const out = renderBlock("Used by `{{PACKAGE_DIR}}/`. Run `{{SYNC_COMMAND}}`.", "apps/web", "x");
    expect(out).toContain("Used by `apps/web/`. Run `app-shell agents sync`.");
  });

  it("escapes spaces in the import line only", () => {
    const out = renderBlock(
      "Docs in `{{PACKAGE_ROOT}}/docs/`:\n\n@{{PACKAGE_ROOT}}/docs/AGENTS.md\n",
      "apps/my app",
      "apps/my app/node_modules/@tailor-platform/app-shell",
    );
    expect(out).toContain("Docs in `apps/my app/node_modules/@tailor-platform/app-shell/docs/`:");
    expect(out).toContain(
      "\n@apps/my\\ app/node_modules/@tailor-platform/app-shell/docs/AGENTS.md\n",
    );
  });

  it("wraps the source in markers that carry the package path", () => {
    const out = block("apps/ims/frontend");
    expect(out.startsWith("<!-- app-shell:agents:start apps/ims/frontend -->\n")).toBe(true);
    expect(out.endsWith("\n<!-- app-shell:agents:end apps/ims/frontend -->")).toBe(true);
    expect(out).toContain("Docs: apps/ims/frontend/node_modules/@tailor-platform/app-shell/docs/");
  });
});

describe("replaceBlock", () => {
  const before = "# Project\n\nHouse rules.\n\n";
  const after = "\n\n## Deploying\n\nAsk first.\n";

  it("replaces only what sits between the markers", () => {
    const stale = block("apps/web", "old index");
    const next = replaceBlock(`${before}${stale}${after}`, "apps/web", block("apps/web"));
    expect(next).toBe(`${before}${block("apps/web")}${after}`);
  });

  it("returns null when the markers are absent", () => {
    expect(replaceBlock(`${before}${after}`, "apps/web", block("apps/web"))).toBeNull();
  });

  it("returns null for a start marker with no end", () => {
    const content = `${before}<!-- app-shell:agents:start apps/web -->\nhalf a block${after}`;
    expect(replaceBlock(content, "apps/web", block("apps/web"))).toBeNull();
  });

  it("rewrites only the block for its own package", () => {
    const web = block("apps/web", "old web");
    const admin = block("apps/admin", "old admin");
    const content = `${before}${web}\n\n${admin}${after}`;
    const next = replaceBlock(content, "apps/web", block("apps/web"));
    expect(next).toBe(`${before}${block("apps/web")}\n\n${admin}${after}`);
    // `apps/web` must not match a package whose path merely starts with it.
    expect(replaceBlock(block("apps/web-admin"), "apps/web", block("apps/web"))).toBeNull();
  });

  it("is idempotent", () => {
    const once = replaceBlock(
      `${before}${block("apps/web", "old")}${after}`,
      "apps/web",
      block("apps/web"),
    );
    expect(replaceBlock(once!, "apps/web", block("apps/web"))).toBe(once);
  });

  it("keeps a block a formatter only rewrapped", () => {
    const rewrapped = block("apps/web", "one two").replace("one two", "one\n  two");
    expect(replaceBlock(rewrapped, "apps/web", block("apps/web", "one two"))).toBe(rewrapped);
  });

  it("does not treat `$` sequences in the block as replacement patterns", () => {
    const next = replaceBlock(
      block("apps/web", "old"),
      "apps/web",
      block("apps/web", "cost $& $1"),
    );
    expect(next).toContain("cost $& $1");
  });

  it("keeps CRLF line endings", () => {
    const content = `# Project\r\n\r\n${block(".", "old").replaceAll("\n", "\r\n")}\r\n`;
    const next = replaceBlock(content, ".", block("."))!;
    expect(next).not.toMatch(/[^\r]\n/);
  });
});

describe("appendBlock", () => {
  it("adds the block after existing content with one blank line", () => {
    expect(appendBlock("# Project\n\n\n", "BLOCK")).toBe("# Project\n\nBLOCK\n");
  });

  it("writes just the block into an empty file", () => {
    expect(appendBlock("", "BLOCK")).toBe("BLOCK\n");
  });
});
