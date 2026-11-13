import { defineConfig } from "tsdown";

export default defineConfig({
  entry: { testing: "testing-types.ts" },
  // Unwatched declarations must survive Vite cleaning dist when dev starts.
  outDir: "dist-testing",
  fixedExtension: false,
  dts: { generator: "tsc", emitDtsOnly: true, sourcemap: false },
  deps: { neverBundle: ["@tailor-platform/app-shell"] },
});
