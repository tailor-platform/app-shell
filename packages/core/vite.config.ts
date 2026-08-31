import { createRequire } from "node:module";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
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
    rolldownOptions: {
      // Vite 8 no longer uses the helper plugin we previously relied on,
      // so keep the library externalization rule explicit here.
      external: externalPackages,
    },
  },
}));
