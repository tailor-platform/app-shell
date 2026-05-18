import { defineConfig, devices } from "@playwright/test";
import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(import.meta.dirname, ".env") });

export default defineConfig({
  testDir: "./tests",
  forbidOnly: !!process.env.CI,
  use: {
    baseURL: "http://localhost:3100",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "pnpm dev",
    url: "http://localhost:3100",
    reuseExistingServer: !process.env.CI,
  },
});
