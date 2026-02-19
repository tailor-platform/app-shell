import fs from "node:fs";
import path from "node:path";
import type { Plugin } from "vite";
import type { PluginContext } from "../plugin";
import { PAGE_FILE_NAME } from "../constants";
import { scanPages } from "../utils/scanner";
import { generateTypedRoutesCode } from "../utils/typed-routes-gen";

// ============================================
// Plugin
// ============================================

/**
 * Create the typed routes plugin.
 *
 * This plugin:
 * 1. Generates a TypeScript file with type-safe route definitions
 * 2. Writes to disk at `typedRoutesOutput` path
 * 3. Regenerates on page file changes (HMR)
 */
export function createTypedRoutesPlugin(ctx: PluginContext): Plugin {
  const { options, state, log } = ctx;

  let projectRoot = "";
  let outputPath = "";

  /**
   * Write the generated routes file to disk.
   */
  function writeRoutesFile(): void {
    // Ensure pages are scanned
    if (!state.cachedPages) {
      state.cachedPages = scanPages(
        state.resolvedPagesDir,
        state.resolvedPagesDir,
      );
    }

    const code = generateTypedRoutesCode(state.cachedPages);

    // Ensure output directory exists
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Write file only if content changed
    const existingContent = fs.existsSync(outputPath)
      ? fs.readFileSync(outputPath, "utf-8")
      : "";

    if (existingContent !== code) {
      fs.writeFileSync(outputPath, code, "utf-8");
      log.info(`Generated typed routes: ${options.typedRoutesOutput}`);
    }
  }

  return {
    name: "app-shell-typed-routes",

    configResolved(config) {
      projectRoot = config.root;
      outputPath = path.resolve(projectRoot, options.typedRoutesOutput);

      // Ensure resolvedPagesDir is set (may be set by virtual-pages plugin first)
      if (!state.resolvedPagesDir) {
        state.resolvedPagesDir = path.resolve(projectRoot, options.pagesDir);
      }
    },

    buildStart() {
      writeRoutesFile();
    },

    configureServer(devServer) {
      const watcher = devServer.watcher;

      const regenerateRoutes = () => {
        // Clear cache to force rescan
        state.cachedPages = null;
        writeRoutesFile();
      };

      watcher.on("add", (file) => {
        if (
          file.startsWith(state.resolvedPagesDir) &&
          file.endsWith(PAGE_FILE_NAME)
        ) {
          regenerateRoutes();
        }
      });

      watcher.on("unlink", (file) => {
        if (
          file.startsWith(state.resolvedPagesDir) &&
          file.endsWith(PAGE_FILE_NAME)
        ) {
          regenerateRoutes();
        }
      });
    },
  };
}
