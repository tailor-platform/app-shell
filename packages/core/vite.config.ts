import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import tsconfigPaths from "vite-tsconfig-paths";
import react from "@vitejs/plugin-react";
import { externalizeDeps } from "vite-plugin-externalize-deps";
import { defineConfig, type Plugin } from "vite";
import dts from "vite-plugin-dts";

const whenProductionBuild = (mode: string) => mode === "production";

/**
 * Appends the pre-generated fonts.generated.css to the CSS bundle asset
 * during generation. This avoids Vite trying to resolve woff2 urls during
 * build while still including fonts in the default styles export.
 *
 * Using generateBundle (instead of closeBundle/writeBundle) ensures the file
 * is written to disk only once, preventing spurious change-detection in
 * downstream dev servers during watch mode.
 */
function appendFonts(props: { appendCSSFile: string }): Plugin {
  return {
    name: "append-fonts",
    enforce: "post",
    generateBundle(_, bundle) {
      const fontsPath = resolve(import.meta.dirname, "src/assets/fonts.generated.css");
      if (!existsSync(fontsPath)) {
        this.error("src/assets/fonts.generated.css not found. Run `pnpm generate:fonts` first.");
      }
      const fontCss = readFileSync(fontsPath, "utf8");
      const cssAsset = Object.values(bundle).find(
        (asset) => asset.type === "asset" && asset.fileName === props.appendCSSFile,
      );
      if (cssAsset && cssAsset.type === "asset") {
        cssAsset.source += "\n" + fontCss;
      }
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
