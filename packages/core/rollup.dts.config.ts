import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";
import path from "node:path";
import { defineConfig } from "rollup";
import alias from "@rollup/plugin-alias";
import dts from "rollup-plugin-dts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const pkg = JSON.parse(readFileSync("./package.json", "utf-8")) as {
  dependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
};

const packageNames = [
  ...Object.keys(pkg.dependencies ?? {}),
  ...Object.keys(pkg.peerDependencies ?? {}),
];

const isExternal = (id: string) =>
  id.endsWith(".css") || packageNames.some((name) => id === name || id.startsWith(`${name}/`));

const pathAliasPlugin = alias({
  entries: [{ find: "@", replacement: path.resolve(__dirname, "src") }],
});

export default defineConfig([
  {
    input: "src/index.ts",
    output: { file: "dist/index.d.ts", format: "es" },
    external: isExternal,
    plugins: [pathAliasPlugin, dts()],
  },
  {
    input: "src/vite-plugin.ts",
    output: { file: "dist/vite-plugin.d.ts", format: "es" },
    external: isExternal,
    plugins: [pathAliasPlugin, dts()],
  },
]);
