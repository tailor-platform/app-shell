import { resolve } from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  root: "./tests/real-auth/app",
  envDir: resolve(import.meta.dirname, ".."),
  plugins: [react(), tailwindcss()],
  server: {
    port: 3100,
  },
});
