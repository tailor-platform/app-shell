import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { appShellRoutes } from "@tailor-platform/app-shell/vite-plugin";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    appShellRoutes({
      generateTypedRoutes: true,
    }),
  ],
  server: {
    port: 3030,
  },
});
