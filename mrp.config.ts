import { defineConfig } from "@izumisy/md-react-preview";

export default defineConfig({
  title: "AppShell Components",
  glob: "docs/components/**/*.md",
  previewCss: "./packages/core/dist/app-shell.css",
});
