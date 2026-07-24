import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { appShellRoutes } from "@tailor-platform/app-shell/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";

const repoRoot = fileURLToPath(new URL("../..", import.meta.url));
const appRoot = fileURLToPath(new URL(".", import.meta.url));
const docsDir = resolve(repoRoot, "docs");

// The generated examples live at repo-root docs/ (outside this app), so their
// bare imports don't resolve against this app's node_modules. Resolve them as
// if imported from this app — SCOPED to docs/ importers so it never touches
// App.tsx, whose `@tailor-platform/app-shell` import the routing plugin
// intercepts (via `entrypoint`) to inject the file-based pages.
function resolveExampleDeps(): Plugin {
  const EXAMPLE_DEPS = /^(@tailor-platform\/app-shell|react|react-dom|lucide-react)(\/|$)/;
  return {
    name: "docs-app:resolve-example-deps",
    enforce: "pre",
    async resolveId(source, importer) {
      if (!importer || !importer.startsWith(docsDir)) return null;
      if (!EXAMPLE_DEPS.test(source)) return null;
      const resolved = await this.resolve(source, resolve(appRoot, "src/main.tsx"), {
        skipSelf: true,
      });
      return resolved?.id ?? null;
    },
  };
}

export default defineConfig({
  plugins: [
    resolveExampleDeps(),
    react(),
    tailwindcss(),
    // File-based routing: routes + sidebar are inferred from src/pages/.
    appShellRoutes({ entrypoint: "src/App.tsx" }),
  ],
  resolve: {
    // Core's built bundle imports the vite-plugin parser; alias it to the built
    // output so it resolves from wherever the bundle is loaded.
    alias: [
      {
        find: /^@tailor-platform\/app-shell-vite-plugin\/parser$/,
        replacement: resolve(repoRoot, "packages/vite-plugin/dist/parser.mjs"),
      },
    ],
    dedupe: ["react", "react-dom"],
  },
  server: {
    port: 5177,
    fs: { allow: [repoRoot] },
  },
});
