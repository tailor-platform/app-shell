import { defineConfig, devices } from "@playwright/test";

const suites = [
  {
    name: "real-auth",
    root: "tests/real-auth",
    // Keep this aligned with e2e/backend/tailor.config.ts redirectURIs.
    port: 3100,
    command: "pnpm exec vite --config tests/real-auth/app/vite.config.ts",
  },
  {
    name: "routing",
    root: "tests/routing",
    port: 3101,
    command: "pnpm exec vite --config tests/routing/app/vite.config.ts",
  },
  {
    name: "nextjs-smoke",
    root: "tests/nextjs-smoke",
    port: 3102,
    command:
      'sh -c "pnpm exec next build tests/nextjs-smoke/app && pnpm exec next start tests/nextjs-smoke/app --port 3102"',
  },
] as const;

export default defineConfig({
  testDir: "./tests",
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
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
    command: suite.command,
    url: `http://localhost:${suite.port}`,
    name: suite.name,
    reuseExistingServer: !process.env.CI,
  })),
});
