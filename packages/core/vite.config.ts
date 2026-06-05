import { readFileSync, appendFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import tsconfigPaths from "vite-tsconfig-paths";
import react from "@vitejs/plugin-react";
import { externalizeDeps } from "vite-plugin-externalize-deps";
import { defineConfig, type Plugin } from "vite";
import dts from "vite-plugin-dts";

const whenProductionBuild = (mode: string) => mode === "production";

/**
 * Appends the pre-generated fonts.generated.css to dist/app-shell.css
 * after Vite finishes bundling. This avoids Vite trying to resolve woff2
 * urls during build while still including fonts in the default styles export.
 */
function appendFonts(props: { appendCSSFile: string }): Plugin {
  return {
    name: "append-fonts",
    closeBundle() {
      const fontsPath = resolve(import.meta.dirname, "src/assets/fonts.generated.css");
      if (!existsSync(fontsPath)) {
        this.error("src/assets/fonts.generated.css not found. Run `pnpm generate:fonts` first.");
      }
      const dist = resolve(import.meta.dirname, "dist");
      const fontCss = readFileSync(fontsPath, "utf8");
      appendFileSync(resolve(dist, props.appendCSSFile), "\n" + fontCss);
    },
  };
}

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

    /**
     * Append pre-generated font CSS to the output after build.
     */
    appendFonts({
      appendCSSFile: "app-shell.css",
    }),
  ],
  publicDir: "src/assets",
  build: {
    lib: {
      entry: {
        "app-shell": "src/index.ts",
        "vite-plugin": "src/vite-plugin.ts",
      },
      formats: ["es"],
    },
    target: "es2020",
    minify: whenProductionBuild(mode),
    sourcemap: !whenProductionBuild(mode),
    cssCodeSplit: false,
  },
}));
