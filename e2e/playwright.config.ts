import { defineConfig, devices } from "@playwright/test";

type SuiteCommandArgs = {
  root: string;
  port: number;
};

type Suite = {
  name: string;
  root: string;
  port: number;
  command: (args: SuiteCommandArgs) => string;
};

const suites = [
  {
    name: "real-auth",
    root: "tests/real-auth",
    // Keep this aligned with e2e/backend/tailor.config.ts redirectURIs.
    port: 3100,
    command: ({ root }) => `pnpm exec vite --config ${root}/app/vite.config.ts`,
  },
  {
    name: "routing",
    root: "tests/routing",
    port: 3101,
    command: ({ root }) => `pnpm exec vite --config ${root}/app/vite.config.ts`,
  },
  {
    name: "nextjs-smoke",
    root: "tests/nextjs-smoke",
    port: 3102,
    command: ({ root, port }) =>
      `sh -c "pnpm exec next build ${root}/app && pnpm exec next start ${root}/app --port ${port}"`,
  },
] satisfies readonly Suite[];

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
    command: suite.command(suite),
    url: `http://localhost:${suite.port}`,
    name: suite.name,
    reuseExistingServer: !process.env.CI,
  })),
});
