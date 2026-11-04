import react from "@vitejs/plugin-react";
import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    // The test script rebuilds the package; never reuse an older prebundle.
    force: true,
    include: ["@tailor-platform/app-shell", "@testing-library/react"],
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
