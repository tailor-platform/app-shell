import fs from "node:fs";
import path from "node:path";
import type { Plugin } from "vite";
import { Project } from "ts-morph";
import type { PluginContext } from "../plugin";
import {
  VIRTUAL_MODULE_ID,
  RESOLVED_VIRTUAL_MODULE_ID,
  PAGE_FILE_NAME,
} from "../constants";
import { scanPages } from "../utils/scanner";
import { generateVirtualModuleCode } from "../utils/code-gen";
import { formatRoutesTable } from "../utils/logger";
import {
  type ValidationWarning,
  validateAppShellPageProps,
  findAppShellPagePropsNode,
} from "../validator";
import { appShellPagePropsSchema } from "../schema";

// ============================================
// Schema Validation
// ============================================

/**
 * Validate appShellPageProps in a page file using ts-morph AST analysis.
 */
function validatePageFile(
  filePath: string,
  content: string,
): ValidationWarning[] {
  const project = new Project({ useInMemoryFileSystem: true });
  const sourceFile = project.createSourceFile("temp.tsx", content);

  const appShellPagePropsNode = findAppShellPagePropsNode(sourceFile);
  if (!appShellPagePropsNode) {
    return [];
  }

  return validateAppShellPageProps(
    appShellPagePropsNode,
    appShellPagePropsSchema,
    filePath,
  );
}

/**
 * Output validation warnings.
 */
function outputValidationResults(
  warnings: ValidationWarning[],
  logger: { warn: (msg: string) => void },
): void {
  if (warnings.length === 0) return;

  for (const warning of warnings) {
    const message =
      `[app-shell] Warning: ${warning.message}\n` +
      `  at ${warning.file}\n` +
      `  Valid keys: ${warning.validKeys.join(", ")}`;

    logger.warn(message);
  }
}

// ============================================
// Plugin
// ============================================

/**
 * Create the virtual pages plugin.
 *
 * This plugin:
 * 1. Scans `pagesDir` for page.tsx files
 * 2. Generates a virtual module `virtual:app-shell-pages`
 * 3. Validates appShellProps schema
 * 4. Supports HMR for page changes
 */
export function createVirtualPagesPlugin(ctx: PluginContext): Plugin {
  const { options, state, log } = ctx;

  return {
    name: "app-shell-virtual-pages",

    configResolved(config) {
      state.resolvedPagesDir = path.resolve(config.root, options.pagesDir);
    },

    configureServer(devServer) {
      const watcher = devServer.watcher;

      const invalidateVirtualModule = () => {
        state.cachedPages = null;
        const mod = devServer.moduleGraph.getModuleById(
          RESOLVED_VIRTUAL_MODULE_ID,
        );
        if (mod) {
          devServer.moduleGraph.invalidateModule(mod);
          devServer.ws.send({ type: "full-reload" });
        }
      };

      watcher.on("add", (file) => {
        if (
          file.startsWith(state.resolvedPagesDir) &&
          file.endsWith(PAGE_FILE_NAME)
        ) {
          invalidateVirtualModule();
        }
      });

      watcher.on("unlink", (file) => {
        if (
          file.startsWith(state.resolvedPagesDir) &&
          file.endsWith(PAGE_FILE_NAME)
        ) {
          invalidateVirtualModule();
        }
      });
    },

    resolveId(id) {
      if (id === VIRTUAL_MODULE_ID) {
        return RESOLVED_VIRTUAL_MODULE_ID;
      }
      return null;
    },

    load(id) {
      if (id === RESOLVED_VIRTUAL_MODULE_ID) {
        log.debug("Loading virtual module");
        log.debug("Resolved pages dir:", state.resolvedPagesDir);

        // Scan pages if not cached
        if (!state.cachedPages) {
          state.cachedPages = scanPages(
            state.resolvedPagesDir,
            state.resolvedPagesDir,
          );
          log.debug("Scanned pages:", state.cachedPages);

          // Log routes table at info level
          const routeCount = state.cachedPages.length;
          log.info(
            `Detected ${routeCount} route${routeCount === 1 ? "" : "s"}:\n\n${formatRoutesTable(state.cachedPages, options.pagesDir)}\n`,
          );
        }

        // Validate appShellPageProps schema
        const allWarnings: ValidationWarning[] = [];

        for (const page of state.cachedPages) {
          try {
            const content = fs.readFileSync(page.filePath, "utf-8");
            const warnings = validatePageFile(page.filePath, content);
            allWarnings.push(...warnings);
          } catch {
            // Ignore read errors
          }
        }

        outputValidationResults(allWarnings, {
          warn: (msg) => console.warn(msg),
        });

        const code = generateVirtualModuleCode(state.cachedPages);
        log.debug("Generated code:\n", code);
        return code;
      }
      return null;
    },

    handleHotUpdate({ file }) {
      if (file.startsWith(state.resolvedPagesDir) && file.endsWith(".tsx")) {
        state.cachedPages = null;
      }
    },
  };
}
