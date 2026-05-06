import path from "node:path";
import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "happy-dom",
    typecheck: {
      enabled: true,
    },
    resolveSnapshotPath: (testPath, snapExtension) => {
      const relativePath = path.relative(__dirname, testPath);
      const snapshotName = relativePath.replaceAll(path.sep, "__");
      return path.join(__dirname, "__snapshots__", snapshotName + snapExtension);
    },
  },
});
