import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { appShellRoutes } from "@tailor-platform/app-shell/vite-plugin";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    appShellRoutes({
      entrypoint: "src/App.tsx",
      generateTypedRoutes: true,
    }),
  ],
  server: {
    port: 3032,
  },
});
