import { defineConfig, devices } from "@playwright/test";

const suites = [
  {
    name: "real-auth",
    root: "tests/real-auth",
    // Keep this aligned with e2e/backend/tailor.config.ts redirectURIs.
    port: 3100,
  },
  {
    name: "routing",
    root: "tests/routing",
    port: 3101,
  },
] as const;

export default defineConfig({
  testDir: "./tests",
  forbidOnly: !!process.env.CI,
  projects: suites.map((suite) => ({
    name: suite.name,
    testDir: `./${suite.root}`,
    use: {
      ...devices["Desktop Chrome"],
      baseURL: `http://localhost:${suite.port}`,
      trace: "on-first-retry",
    },
  })),
  webServer: suites.map((suite) => ({
    command: `pnpm exec vite --config ${suite.root}/app/vite.config.ts`,
    url: `http://localhost:${suite.port}`,
    name: suite.name,
    reuseExistingServer: !process.env.CI,
  })),
});
