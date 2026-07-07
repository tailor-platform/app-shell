import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    // workspace:* links resolve to ../../packages/*, outside this app dir.
    // Point Turbopack at the monorepo root so linked package CSS imports are resolvable.
    root: path.resolve(__dirname, "../.."),
  },
};

export default nextConfig;
