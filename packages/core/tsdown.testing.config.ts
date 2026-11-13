import { fileURLToPath } from "node:url";
import { defineConfig } from "tsdown";

const runtimeSource = fileURLToPath(new URL("./src/testing/runtime.ts", import.meta.url));

export default defineConfig({
  entry: { testing: "testing.ts" },
  // Unwatched testing artifacts must survive Vite cleaning dist when dev starts.
  outDir: "dist-testing",
  platform: "browser",
  target: "es2020",
  fixedExtension: false,
  dts: { generator: "tsc", sourcemap: false },
  deps: { neverBundle: [runtimeSource, "@tailor-platform/app-shell"] },
  // Share the Vite-built implementation, rather than bundling another Context.
  outputOptions: { paths: { [runtimeSource]: "../dist/testing-runtime.js" } },
});
