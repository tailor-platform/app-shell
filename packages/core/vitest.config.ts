import path from "node:path";
import { configDefaults, defineConfig } from "vitest/config";

const coverageEnabled = process.env.CI === "true";
const projectDir = import.meta.dirname;

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    environment: "happy-dom",
    // `pnpm build` writes to dist/. Keep any test file there out of the run.
    exclude: [...configDefaults.exclude, "dist/**"],
    typecheck: {
      enabled: true,
    },
    coverage: {
      enabled: coverageEnabled,
      provider: "v8",
      reporter: ["lcov", "text-summary"],
      reportsDirectory: "coverage",
    },
    resolveSnapshotPath: (testPath, snapExtension) => {
      const relativePath = path.relative(projectDir, testPath);
      const snapshotName = relativePath.replaceAll(path.sep, "__");
      return path.join(projectDir, "__snapshots__", snapshotName + snapExtension);
    },
  },
});
