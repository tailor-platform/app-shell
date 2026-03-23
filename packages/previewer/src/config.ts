import type { PluginOption } from "vite";

export type PreviewerRepo = {
  /** GitHub repository URL (e.g. "https://github.com/user/repo") */
  url: string;
  /** Branch name (default: "main") */
  branch?: string;
};

export type PreviewerSidebar = {
  /** Title displayed at the top of the sidebar */
  title?: string;
};

export type PreviewerConfig = {
  /** Glob pattern for preview MDX files (default: "src/**\/*.preview.mdx") */
  glob?: string;
  /** CSS file to import in the previewer app (e.g. "./src/globals.css") */
  css?: string;
  /** GitHub repository for "View docs code" links. */
  repo?: PreviewerRepo;
  /** Sidebar configuration */
  sidebar?: PreviewerSidebar;
  /** Vite configuration overrides */
  vite?: {
    /** Additional Vite plugins (e.g. @tailwindcss/vite for Tailwind support) */
    plugins?: PluginOption[];
  };
};

export function defineConfig(config: PreviewerConfig): PreviewerConfig {
  return config;
}
