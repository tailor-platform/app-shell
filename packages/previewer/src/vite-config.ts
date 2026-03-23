import { resolve, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import react from "@vitejs/plugin-react";
import mdx from "@mdx-js/rollup";
import remarkGfm from "remark-gfm";
import type { InlineConfig, Plugin, PluginOption } from "vite";

const __dirname = dirname(fileURLToPath(import.meta.url));
const APP_DIR = resolve(__dirname, "..", "app");

// Resolve @mdx-js/react from previewer's own node_modules so the host project
// doesn't need to install it.
const require = createRequire(import.meta.url);
const mdxReactEntry = require.resolve("@mdx-js/react");

export function createPreviewerViteConfig(options: {
  /** Host project root directory for discovering preview files and CSS. */
  root: string;
  glob: string;
  css?: string;
  /** Vite configuration overrides */
  vite?: {
    plugins?: PluginOption[];
  };
}): InlineConfig {
  return {
    configFile: false,
    // Use the previewer's own app/ directory as Vite root so that
    // app/index.html is served directly — no HTML injection middleware needed.
    root: APP_DIR,
    publicDir: false,
    resolve: {
      alias: {
        "@mdx-js/react": mdxReactEntry,
      },
    },
    server: {
      port: 3040,
      fs: {
        allow: [options.root, APP_DIR],
      },
    },
    plugins: [
      {
        enforce: "pre",
        ...mdx({
          remarkPlugins: [remarkGfm],
          providerImportSource: "@mdx-js/react",
        }),
      } as Plugin,
      react({ include: /\.(jsx|tsx)$/ }),
      ...(options.vite?.plugins ?? []),
      previewerEntriesPlugin(options.root, options.glob),
      previewerCssPlugin(options.root, options.css),
    ],
  };
}

/**
 * Virtual module `virtual:previewer-entries` — exports all discovered
 * *.preview.mdx files as an array of { name, Component } objects.
 */
function previewerEntriesPlugin(hostRoot: string, glob: string): Plugin {
  const MODULE_ID = "virtual:previewer-entries";
  const RESOLVED_ID = "\0" + MODULE_ID;

  return {
    name: "previewer-entries",

    resolveId(id) {
      if (id === MODULE_ID) return RESOLVED_ID;
    },

    async load(id) {
      if (id !== RESOLVED_ID) return;

      const fg = await import("fast-glob");
      const files = await fg.default(glob, {
        cwd: hostRoot,
        absolute: true,
      });

      const entries = files.map((file, i) => ({
        varName: `Mod${i}`,
        name: basename(file).replace(/\.preview\.mdx$/, ""),
        file,
      }));

      return [
        ...entries.map((e) => `import ${e.varName} from ${JSON.stringify(e.file)};`),
        "",
        "export const entries = [",
        ...entries.map((e) => `  { name: ${JSON.stringify(e.name)}, Component: ${e.varName} },`),
        "];",
      ].join("\n");
    },
  };
}

/**
 * Virtual module `virtual:previewer-css` — imports the host project's
 * CSS file if configured, or exports nothing.
 */
function previewerCssPlugin(hostRoot: string, css?: string): Plugin {
  const MODULE_ID = "virtual:previewer-css";
  // Suffix with .css so Vite routes this through its CSS pipeline instead
  // of serving it as a JS module.
  const RESOLVED_ID = "\0" + MODULE_ID + ".css";

  return {
    name: "previewer-css",

    resolveId(id) {
      if (id === MODULE_ID) return RESOLVED_ID;
    },

    load(id) {
      if (id !== RESOLVED_ID) return;
      if (!css) return "";

      const cssPath = resolve(hostRoot, css);
      return `@import ${JSON.stringify(cssPath)};`;
    },
  };
}
