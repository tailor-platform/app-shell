import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { appShellRoutes } from "@tailor-platform/app-shell/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));
const appRoot = fileURLToPath(new URL(".", import.meta.url));
// The authored examples (`*.docs.examples.tsx`) live in src/ (outside this app),
// so their bare imports don't resolve against this app's node_modules. Resolve
// them as if imported from this app — SCOPED to example files by suffix so it
// never touches App.tsx, whose `@tailor-platform/app-shell` import the routing
// plugin intercepts (via `entrypoint`) to inject the file-based pages.
function resolveExampleDeps(): Plugin {
  const EXAMPLE_DEPS = /^(@tailor-platform\/app-shell|react|react-dom|lucide-react)(\/|$)/;
  return {
    name: "docs-app:resolve-example-deps",
    enforce: "pre",
    async resolveId(source, importer) {
      if (!importer || !importer.endsWith(".docs.examples.tsx")) return null;
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
    // Core's runtime imports `@tailor-platform/vite-plugin-app-shell/parser`, a
    // dependency of core that resolves via the workspace symlink — no alias
    // needed. Dedupe React so the out-of-tree examples share one copy.
    dedupe: ["react", "react-dom"],
  },
  server: {
    port: 5177,
    fs: { allow: [repoRoot] },
  },
});
