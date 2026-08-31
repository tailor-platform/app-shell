import { createRequire } from "node:module";
import react from "@vitejs/plugin-react";
import { defineConfig, esmExternalRequirePlugin } from "vite";
import dts from "vite-plugin-dts";

const require = createRequire(import.meta.url);
const packageJson = require("./package.json") as {
  dependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
};
// AppShell ships as a library, not a standalone app bundle.
// Keep runtime deps external so consumers resolve their own copies,
// especially shared packages like react/react-dom, and so dist stays
// aligned with the packages we declare in package.json.
const externalPackages = Object.keys({
  ...packageJson.dependencies,
  ...packageJson.peerDependencies,
});
const escapeForRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const externalPackagePatterns = externalPackages.map(
  (pkg) => new RegExp(`^${escapeForRegex(pkg)}(?:/.*)?$`),
);

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
     * Vite 8 / Rolldown preserves `require()` for externalized modules.
     * Convert those back to ESM imports so the browser can load our ESM dist.
     */
    esmExternalRequirePlugin({
      external: externalPackagePatterns,
    }),
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
