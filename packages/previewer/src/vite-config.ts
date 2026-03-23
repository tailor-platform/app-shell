import { resolve, dirname, basename, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import react from "@vitejs/plugin-react";
import mdx from "@mdx-js/rollup";
import remarkFrontmatter from "remark-frontmatter";
import remarkMdxFrontmatter from "remark-mdx-frontmatter";
import remarkGfm from "remark-gfm";
import type { InlineConfig, Plugin, PluginOption } from "vite";
import type { PreviewerRepo } from "./config";

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
  /** Title used in the sidebar header, HTML page title, and llms.txt heading */
  title: string;
  /** GitHub repository configuration */
  repo?: PreviewerRepo;
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
          remarkPlugins: [
            remarkGfm,
            remarkFrontmatter,
            [remarkMdxFrontmatter, { name: "frontmatter" }],
          ],
          providerImportSource: "@mdx-js/react",
        }),
      } as Plugin,
      react({ include: /\.(jsx|tsx)$/ }),
      ...(options.vite?.plugins ?? []),
      previewerEntriesPlugin(options.root, options.glob),
      previewerCssPlugin(options.root, options.css),
      previewerConfigPlugin(options.title, options.repo),
      previewerHtmlTitlePlugin(options.title),
      ...(options.repo?.url
        ? [previewerLlmsTxtPlugin(options.title, options.root, options.glob, options.repo)]
        : []),
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
        filePath: relative(hostRoot, file),
      }));

      return [
        ...entries.map(
          (e) =>
            `import ${e.varName}, { frontmatter as ${e.varName}Fm } from ${JSON.stringify(e.file)};`,
        ),
        "",
        "export const entries = [",
        ...entries.map(
          (e) =>
            `  { name: ${JSON.stringify(e.name)}, Component: ${e.varName}, frontmatter: ${e.varName}Fm ?? {}, filePath: ${JSON.stringify(e.filePath)} },`,
        ),
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

/**
 * Virtual module `virtual:previewer-config` — exposes the resolved
 * repo configuration so the app can render source links.
 */
function previewerConfigPlugin(title: string, repo?: PreviewerRepo): Plugin {
  const MODULE_ID = "virtual:previewer-config";
  const RESOLVED_ID = "\0" + MODULE_ID;

  return {
    name: "previewer-config",

    resolveId(id) {
      if (id === MODULE_ID) return RESOLVED_ID;
    },

    load(id) {
      if (id !== RESOLVED_ID) return;

      const lines: string[] = [];

      lines.push(`export const title = ${JSON.stringify(title)};`);

      if (repo) {
        // Strip trailing slash from URL
        const normalizedUrl = repo.url.replace(/\/+$/, "");
        const ref = repo.ref ?? "main";
        lines.push(`export const repo = ${JSON.stringify({ url: normalizedUrl, ref })};`);
      } else {
        lines.push("export const repo = null;");
      }

      return lines.join("\n");
    },
  };
}

/**
 * Replaces the `<title>` in index.html with the configured title.
 */
function previewerHtmlTitlePlugin(title: string): Plugin {
  return {
    name: "previewer-html-title",
    transformIndexHtml(html) {
      return html.replaceAll("{{title}}", title);
    },
  };
}

/**
 * Serves `/llms.txt` as a plain-text endpoint that describes all discovered
 * preview entries in the llms.txt format (https://llmstxt.org/).
 *
 * - Dev: intercepts the request via `configureServer` middleware.
 * - Build: emits `llms.txt` as a static asset via `generateBundle`.
 */
function previewerLlmsTxtPlugin(
  title: string,
  hostRoot: string,
  glob: string,
  repo?: PreviewerRepo,
): Plugin {
  async function buildLlmsTxt(): Promise<string> {
    const fg = await import("fast-glob");
    const { readFile } = await import("node:fs/promises");

    const files = await fg.default(glob, { cwd: hostRoot, absolute: true });

    // Parse frontmatter from each file
    interface FmEntry {
      title: string;
      description: string;
      group: string;
      order: number;
      filePath: string;
      hidden?: boolean;
    }

    const fmEntries: FmEntry[] = [];
    for (const file of files) {
      const content = await readFile(file, "utf-8");
      const match = content.match(/^---\n([\s\S]*?)\n---/);
      if (!match) continue;

      const yaml = match[1];
      const get = (key: string) => {
        const m = yaml.match(new RegExp(`^${key}:\\s*(.+)$`, "m"));
        return m ? m[1].trim() : undefined;
      };

      if (get("hidden") === "true") continue;

      fmEntries.push({
        title: get("title") ?? basename(file).replace(/\.preview\.mdx$/, ""),
        description: get("description") ?? "",
        group: get("group") ?? "Ungrouped",
        order: Number(get("order") ?? 999),
        filePath: relative(hostRoot, file),
        hidden: get("hidden") === "true",
      });
    }

    // Group entries
    const groupMap = new Map<string, FmEntry[]>();
    for (const entry of fmEntries) {
      const group = groupMap.get(entry.group) ?? [];
      group.push(entry);
      groupMap.set(entry.group, group);
    }
    for (const group of groupMap.values()) {
      group.sort((a, b) => a.order - b.order);
    }

    const ref = repo?.ref ?? "main";

    function buildSourceUrl(entry: FmEntry): string {
      const repoUrl = repo?.url?.replace(/\/+$/, "");
      if (!repoUrl) return "";
      const rawBase = repoUrl.replace(
        /^https:\/\/github\.com\//,
        "https://raw.githubusercontent.com/",
      );
      return `${rawBase}/${ref}/${entry.filePath.replace(/^\/+/, "")}`;
    }

    const lines: string[] = [];
    lines.push(`# ${title}`);
    lines.push("");
    lines.push(`> ${fmEntries.length} components across ${groupMap.size} groups`);
    lines.push("");

    for (const [groupName, groupEntries] of groupMap) {
      lines.push(`## ${groupName}`);
      lines.push("");
      for (const entry of groupEntries) {
        const url = buildSourceUrl(entry);
        const link = url ? `[${entry.title}](${url})` : entry.title;
        const desc = entry.description ? `: ${entry.description}` : "";
        lines.push(`- ${link}${desc}`);
      }
      lines.push("");
    }

    return lines.join("\n");
  }

  return {
    name: "previewer-llms-txt",

    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url !== "/llms.txt") return next();

        buildLlmsTxt()
          .then((text) => {
            res.setHeader("Content-Type", "text/plain; charset=utf-8");
            res.end(text);
          })
          .catch(next);
      });
    },

    async generateBundle() {
      const text = await buildLlmsTxt();
      this.emitFile({
        type: "asset",
        fileName: "llms.txt",
        source: text,
      });
    },
  };
}
