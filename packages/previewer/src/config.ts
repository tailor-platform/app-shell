import type { PluginOption } from "vite";

export type PreviewerRepo = {
  /** GitHub repository URL (e.g. "https://github.com/user/repo") */
  url: string;
  /** Git ref — branch, tag, or commit SHA (default: "main") */
  ref?: string;
};

export type PreviewerConfig = {
  /** Title used in the sidebar header, HTML page title, and llms.txt heading */
  title: string;
  /** Glob pattern for preview MDX files (default: "src/**\/*.preview.mdx") */
  glob?: string;
  /** CSS file to import in the previewer app (e.g. "./src/globals.css") */
  css?: string;
  /** GitHub repository for "View docs code" links. */
  repo?: PreviewerRepo;
  /** Vite configuration overrides */
  vite?: {
    /** Additional Vite plugins (e.g. @tailwindcss/vite for Tailwind support) */
    plugins?: PluginOption[];
  };
};

export function defineConfig(config: PreviewerConfig): PreviewerConfig {
  return config;
}
