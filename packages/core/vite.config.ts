import { createRequire } from "node:module";
import react from "@vitejs/plugin-react";
import { defineConfig, esmExternalRequirePlugin } from "vite";
import dts from "vite-plugin-dts";

/**
 * Vite 8 / Rolldown preserves `require()` for externalized modules.
 * Convert those back to ESM imports so the browser can load our ESM dist.
 */
const externalizeDeps = () => {
  const require = createRequire(import.meta.url);
  const packageJson = require("./package.json") as {
    dependencies?: Record<string, string>;
    peerDependencies?: Record<string, string>;
  };

  return esmExternalRequirePlugin({
    external: Object.keys({
      ...packageJson.dependencies,
      ...packageJson.peerDependencies,
    }).map(
      /**
       * `esmExternalRequirePlugin` accepts package matchers as regexes.
       * Escape package names first so future deps like `foo.bar` still match as
       * literal package ids instead of regex syntax.
       */
      (pkg) => new RegExp(`^${pkg.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?:/.*)?$`),
    ),
  });
};

const whenProductionBuild = (mode: string) => mode === "production";

export default defineConfig(({ mode }) => ({
  plugins: [
    /**
     * Generate TypeScript declaration files.
     */
    dts({
      include: ["src"],
      bundleTypes: true,
    }),

    /**
     * Support React JSX/TSX.
     */
    react(),

    /**
     * Automatically externalize imports in `dependencies` and `peerDependencies`.
     */
    externalizeDeps(),
  ],
  resolve: {
    tsconfigPaths: true,
  },
  publicDir: "src/assets",
  build: {
    lib: {
      entry: {
        "app-shell": "src/index.ts",
        "style-entry": "src/style-entry.ts",
        "vite-plugin": "src/vite-plugin.ts",
      },
      cssFileName: "app-shell-core",
      formats: ["es"],
    },
    target: "es2020",
    minify: whenProductionBuild(mode),
    sourcemap: !whenProductionBuild(mode),
    cssCodeSplit: false,
  },
}));
