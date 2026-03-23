declare module "virtual:previewer-entries" {
  import type { ComponentType } from "react";
  interface PreviewEntryFrontmatter {
    title?: string;
    description?: string;
    group?: string;
    order?: number;
    status?: "stable" | "beta" | "experimental" | "deprecated";
    hidden?: boolean;
  }
  interface PreviewEntry {
    name: string;
    Component: ComponentType;
    frontmatter: PreviewEntryFrontmatter;
  }
  export const entries: PreviewEntry[];
}

declare module "virtual:previewer-css" {}
