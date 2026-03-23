import { defineConfig } from "@tailor-platform/previewer";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  glob: "src/components/**/*.preview.mdx",
  css: "./src/previewer.css",
  sidebar: {
    title: "AppShell Components",
  },
  repo: {
    url: "https://github.com/tailor-platform/app-shell",
  },
  vite: {
    plugins: [tailwindcss()],
  },
});
