import { createRequire } from "node:module";
import react from "@vitejs/plugin-react";
import { defineConfig, esmExternalRequirePlugin } from "vite";
import dts from "vite-plugin-dts";
import { build as buildTestingTypes } from "tsdown";

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
       * Vite builds runtime JS/CSS for all entries and generates declarations
       * with vite-plugin-dts. We do not publish that plugin's testing rollup:
       * API Extractor bundles each entry independently, duplicating shared types
       * such as AppShellRegister. Augmenting the main entry would then have no
       * effect on testing's props and guards.
       *
       * tsdown builds ONLY testing declarations from testing-types.ts. That
       * facade imports the main entry's public types, and its config keeps the
       * main package external, preserving one shared type identity.
       *
       * Do not independently bundle testing's runtime JS with tsdown: its entry
       * imports the local AppShellInternal implementation, which would bring a
       * second copy of the internal React Context modules into that bundle.
       * Main-entry hooks reading those Contexts would then use different instances
       * from the providers mounted by testing's AppShell and would not see them.
       * Externalizing React alone cannot prevent duplication of local Contexts.
       * Keep both runtime entries in Vite's single graph to share their instances.
       *
       * Finish the main build first: the facade resolves this package's root
       * export to the emitted main declarations, not to source files. Using
       * buildApp keeps `vite build` as the sole entry point and prevents the
       * testing step from running if the main build fails.
       */
      const client = builder.environments.client;
      await builder.build(client);

      // In watch mode, build(client) returns a watcher before outputs are ready.
      // Testing declarations are intentionally built only by a normal build;
      // dist-testing survives Vite's dist cleanup, and its imports continue to
      // resolve updated main types without a separate testing watcher.
      if (!client.config.build.watch) {
        await buildTestingTypes({ config: "tsdown.testing.config.ts" });
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
        testing: "src/testing/index.ts",
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
