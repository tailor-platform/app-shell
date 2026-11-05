import react from "@vitejs/plugin-react";
import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: [
      "@tailor-platform/app-shell",
      "@tailor-platform/app-shell/testing",
      "@testing-library/react",
    ],
    // The pre-bundle is built from dist, which `test:browser` rebuilds first. Vite
    // keys its dep cache on the lockfile and the config, not on dist, so without
    // `force` a browser run can test the previous build.
    force: true,
  },
  test: {
    name: "styles",
    include: ["tests/browser/**/*.test.{ts,tsx}"],
    setupFiles: ["./tests/browser/setup.ts"],
    browser: {
      enabled: true,
      provider: playwright(),
      instances: [{ browser: "chromium" }],
      headless: true,
      screenshotFailures: false,
    },
  },
});
