import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Lock this app to the **app-shell** monorepo root so Turbopack does not pick a
 * parent directory that happens to contain another `package-lock.json` or
 * `pnpm-workspace.yaml` (which breaks `workspace:*` resolution for `app-module`).
 */
const monorepoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

const nextConfig: NextConfig = {
  turbopack: {
    root: monorepoRoot,
  },
  transpilePackages: ["app-module", "@tailor-platform/app-shell"],
};

export default nextConfig;
