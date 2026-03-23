import { defineConfig } from "@tailor-platform/previewer";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  glob: "src/components/**/*.preview.mdx",
  css: "./src/previewer.css",
  vite: {
    plugins: [tailwindcss()],
  },
});
