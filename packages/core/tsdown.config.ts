import { defineConfig } from "tsdown";

// The `app-shell` bin. Vite builds the library for the browser, so the Node
// entry gets its own build into the same dist/.
export default defineConfig({
  entry: { cli: "src/cli/index.ts" },
  format: ["esm"],
  platform: "node",
  target: "node20",
  dts: false,
  // `vite build` has already emptied and filled dist/.
  clean: false,
});
