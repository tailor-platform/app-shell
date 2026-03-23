declare module "virtual:previewer-entries" {
  import type { ComponentType } from "react";
  interface PreviewEntryFrontmatter {
    title?: string;
    description?: string;
    group?: string;
    order?: number;
    status?: "stable" | "beta" | "experimental" | "deprecated";
    hidden?: boolean;
    /** Relative path from the repository root to the source code. Used for "View docs code" link. */
    codePath?: string;
  }
  interface PropInfo {
    name: string;
    type: string;
    required: boolean;
    defaultValue?: string;
    description?: string;
  }
  interface PropsGroup {
    name: string;
    props: PropInfo[];
  }
  interface PreviewEntry {
    name: string;
    Component: ComponentType;
    frontmatter: PreviewEntryFrontmatter;
    /** File path relative to the host project root */
    filePath: string;
    /** Props data extracted at build time from frontmatter `props` field */
    propsData: PropsGroup[];
  }
  export const entries: PreviewEntry[];
}

declare module "virtual:previewer-config" {
  interface PreviewerRepoResolved {
    url: string;
    ref: string;
  }
  export const title: string;
  export const repo: PreviewerRepoResolved | null;
}

declare module "virtual:previewer-css" {}
