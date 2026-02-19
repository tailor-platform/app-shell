import { defineConfig } from "tsdown";

export default defineConfig({
  // entry: { index: "src/index.ts" },
  entry: "src/index.ts",
  format: ["esm"],
  clean: true,
  dts: true,
  /*
  sourcemap: process.env.NODE_ENV === "development",
  minify: process.env.NODE_ENV !== "development",
  */
});
