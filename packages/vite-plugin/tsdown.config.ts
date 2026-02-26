import { defineConfig } from "tsdown";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    parser: "src/parser.ts",
  },
  format: ["esm"],
});
