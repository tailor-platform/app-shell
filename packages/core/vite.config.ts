import { createRequire } from "node:module";
import react from "@vitejs/plugin-react";
import { defineConfig, esmExternalRequirePlugin } from "vite";
import dts from "vite-plugin-dts";
import { build as buildTesting } from "tsdown";

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
  builder: {
    async buildApp(builder) {
      /**
       * Vite builds main JS/CSS and the private testing-runtime entry together;
       * tsdown then builds the public testing entry's JS and declarations.
       *
       * Two identities must remain shared across these builds. For types, API
       * Extractor's independent entry rollups would duplicate AppShellRegister,
       * so testing.ts imports main's public props and WithPages types instead.
       * tsdown keeps that main-package import external to preserve augmentation.
       *
       * For runtime state, independently bundling the local AppShellInternal
       * source would duplicate React Contexts AND the module-scope guard store.
       * Main-entry hooks and main-created module loaders would then read state
       * different from the providers/store populated by testing's AppShell.
       * Externalizing React alone does not externalize these local modules.
       *
       * The private testing-runtime entry shares its implementation with main
       * in Vite's graph. tsdown externalizes that entry and imports its stable
       * output path, not a hashed chunk or minified export alias. It therefore
       * owns testing's output without bundling another copy of shared state.
       * No public package export is added for the private runtime entry.
       *
       * Finish Vite first: testing resolves main's emitted declarations and
       * needs the private runtime output. buildApp keeps `vite build` as the
       * sole entry point and skips testing if the main build fails.
       */
      const client = builder.environments.client;
      await builder.build(client);

      // In watch mode, build(client) returns a watcher before outputs are ready.
      // Testing is intentionally built only by a normal build. dist-testing
      // survives Vite's dist cleanup; its stable runtime and main-type imports
      // follow subsequent main builds without a separate testing watcher.
      if (!client.config.build.watch) {
        await buildTesting({ config: "tsdown.testing.config.ts" });
      }
    },
  },
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
        "testing-runtime": "src/testing/runtime.ts",
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
