#!/usr/bin/env node
import { resolve } from "node:path";
import { createServer, build } from "vite";
import { defineCommand, runMain } from "citty";
import { createPreviewerViteConfig } from "./vite-config";
import { loadPreviewerConfig } from "./load-config";

const dev = defineCommand({
  meta: { name: "dev", description: "Start the previewer dev server" },
  async run() {
    const cwd = process.cwd();
    const config = await loadPreviewerConfig(cwd);
    const viteConfig = createPreviewerViteConfig({
      root: cwd,
      title: config.title,
      glob: config.glob ?? "src/**/*.preview.mdx",
      css: config.css,
      repo: config.repo,
      vite: config.vite,
    });
    const server = await createServer(viteConfig);
    await server.listen();
    server.printUrls();
  },
});

const buildCmd = defineCommand({
  meta: { name: "build", description: "Build the previewer for production" },
  async run() {
    const cwd = process.cwd();
    const config = await loadPreviewerConfig(cwd);
    const viteConfig = createPreviewerViteConfig({
      root: cwd,
      title: config.title,
      glob: config.glob ?? "src/**/*.preview.mdx",
      css: config.css,
      repo: config.repo,
      vite: config.vite,
    });
    await build({
      ...viteConfig,
      build: {
        ...viteConfig.build,
        outDir: resolve(cwd, "dist-preview"),
      },
    });
  },
});

const main = defineCommand({
  meta: { name: "previewer", description: "Component previewer" },
  subCommands: { dev, build: buildCmd },
});

runMain(main);
