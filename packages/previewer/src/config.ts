import type { PluginOption } from "vite";

export type PreviewerConfig = {
  /** Glob pattern for preview MDX files (default: "src/**\/*.preview.mdx") */
  glob?: string;
  /** CSS file to import in the previewer app (e.g. "./src/globals.css") */
  css?: string;
  /** Vite configuration overrides */
  vite?: {
    /** Additional Vite plugins (e.g. @tailwindcss/vite for Tailwind support) */
    plugins?: PluginOption[];
  };
};

export function defineConfig(config: PreviewerConfig): PreviewerConfig {
  return config;
}
