import path from "node:path";
import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

const coverageEnabled = process.env.APP_SHELL_COVERAGE === "true";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "happy-dom",
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
      const relativePath = path.relative(__dirname, testPath);
      const snapshotName = relativePath.replaceAll(path.sep, "__");
      return path.join(__dirname, "__snapshots__", snapshotName + snapExtension);
    },
  },
});
