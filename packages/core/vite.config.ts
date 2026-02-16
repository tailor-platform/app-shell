import tsconfigPaths from "vite-tsconfig-paths";
import react from "@vitejs/plugin-react";
import { externalizeDeps } from "vite-plugin-externalize-deps";
import { defineConfig } from "vite";
import dts from "vite-plugin-dts";

const whenProductionBuild = (mode: string) => mode === "production";

export default defineConfig(({ mode }) => ({
  plugins: [
    /**
     * Automatically externalize imports in `dependencies` and `peerDependencies`.
     */
    externalizeDeps(),

    /**
     * Generate TypeScript declaration files.
     */
    dts({
      include: ["src"],
      rollupTypes: true,
    }),

    /**
     * Support path mapping based on tsconfig.json.
     */
    tsconfigPaths(),

    /**
     * Support React JSX/TSX.
     */
    react(),
  ],
  publicDir: "src/assets",
  build: {
    lib: {
      entry: "src/index.ts",
      formats: ["es"],
    },
    target: "es2020",
    minify: whenProductionBuild(mode),
    sourcemap: !whenProductionBuild(mode),
    cssCodeSplit: false,
  },
}));
