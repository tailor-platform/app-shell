import { createRequire } from "node:module";
import react from "@vitejs/plugin-react";
import ts from "typescript";
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
    // Generate main and /testing declarations together, without a second build pipeline.
    dts({
      // Only library source belongs in dist, not build configs or test infrastructure.
      include: ["src"],
      // Unbundled output retains each source declaration, so exclude tests before publishing.
      exclude: ["**/*.test.*", "**/*.test-d.*", "**/test-utils.*"],
      // Strip src/ so shared declarations live under dist/components, dist/contexts, etc.
      entryRoot: "src",

      // Independent entry rollups can duplicate AppShellRegister and disconnect augmentation.
      // Keep one shared type graph for main/testing props, guards, and AppShell.WithPages.
      // Runtime Contexts and guard state are shared separately by the single lib.entry build.
      bundleTypes: false,
      // Source filenames differ from public entry names (index -> app-shell, testing/index -> testing).
      // Emit .d.ts facades matching the JS entry names and package.json exports.
      insertTypesEntry: true,

      // Ordinary .d.ts files target Bundler resolution, which accepts extensionless imports.
      // No moduleFormat conversion: NodeNext/Node16 compatibility and its patches are out of scope.
      compilerOptions: {
        // Sources are not shipped, so declaration maps would point at unavailable .ts/.tsx files.
        declarationMap: false,
        // A clean build has no dist yet; resolve testing's type-only package self-import via source.
        // This override replaces tsconfig paths, so retain the existing @/* alias as well.
        paths: {
          "@/*": ["./src/*"],
          "@tailor-platform/app-shell": ["./src/index.ts"],
        },
      },
      // Keep the public package import in output instead of rewriting it to a local file.
      // Testing-only consumers must load main's type entry for their module augmentation to apply.
      aliasesExclude: ["@tailor-platform/app-shell"],

      // The plugin reports diagnostics without failing by default; never ship invalid declarations.
      // Warnings remain non-fatal; check-dts also validates the actual tarball with skipLibCheck: false.
      afterDiagnostic(diagnostics) {
        if (diagnostics.some(({ category }) => category === ts.DiagnosticCategory.Error)) {
          throw new Error("Declaration generation failed; see TypeScript diagnostics above.");
        }
      },
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
        // One JS graph shares Contexts and module-scope guard state.
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
