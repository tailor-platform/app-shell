import path from "node:path";
import type { NextConfig } from "next";

const monorepoRoot = path.join(__dirname, "..", "..");

const nextConfig: NextConfig = {
  turbopack: {
    root: monorepoRoot,
  },
  experimental: {
    turbopackMemoryLimit: 1536 * 1024 * 1024,
  },
};

export default nextConfig;
