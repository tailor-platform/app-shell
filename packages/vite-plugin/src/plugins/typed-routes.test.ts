import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { PluginContext, PluginState } from "../plugin";
import { createTypedRoutesPlugin } from "./typed-routes";
import { generateTypedRoutesCode } from "../utils/typed-routes-gen";
import type { PageFile } from "../utils/scanner";

const tempDirs: string[] = [];

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

function createTestPlugin(root: string, pages: PageFile[]) {
  const state: PluginState = {
    resolvedPagesDir: path.join(root, "src/pages"),
    cachedPages: pages,
  };
  const log = { info: vi.fn(), debug: vi.fn() };
  const ctx: PluginContext = {
    options: {
      pagesDir: "src/pages",
      logLevel: "off",
      generateTypedRoutes: true,
      typedRoutesOutput: "src/routes.generated.ts",
      entrypoint: undefined,
    },
    state,
    log,
  };

  const plugin = createTypedRoutesPlugin(ctx);

  if (plugin.configResolved) {
    const hook = plugin.configResolved as (config: { root: string }) => void;
    hook({ root });
  }

  return {
    buildStart: plugin.buildStart as () => void,
    log,
  };
}

describe("typed-routes plugin", () => {
  it("creates the generated file when it does not exist", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "typed-routes-plugin-"));
    tempDirs.push(root);

    const pages: PageFile[] = [
      {
        filePath: path.join(root, "src/pages/dashboard/page.tsx"),
        relativePath: "dashboard",
        routePath: "dashboard",
      },
    ];

    const { buildStart, log } = createTestPlugin(root, pages);
    buildStart();

    const outputPath = path.join(root, "src/routes.generated.ts");
    expect(fs.readFileSync(outputPath, "utf-8")).toBe(generateTypedRoutesCode(pages));
    expect(log.info).toHaveBeenCalledWith("Generated typed routes: src/routes.generated.ts");
  });

  it("skips rewriting the generated file when content is unchanged", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "typed-routes-plugin-"));
    tempDirs.push(root);

    const pages: PageFile[] = [
      {
        filePath: path.join(root, "src/pages/dashboard/page.tsx"),
        relativePath: "dashboard",
        routePath: "dashboard",
      },
    ];
    const code = generateTypedRoutesCode(pages);
    const outputPath = path.join(root, "src/routes.generated.ts");

    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, code, "utf-8");

    const { buildStart, log } = createTestPlugin(root, pages);
    buildStart();

    expect(fs.readFileSync(outputPath, "utf-8")).toBe(code);
    expect(log.info).not.toHaveBeenCalled();
  });
});
