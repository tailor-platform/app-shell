declare module "virtual:previewer-entries" {
  import type { ComponentType } from "react";
  interface PreviewEntry {
    name: string;
    Component: ComponentType;
  }
  export const entries: PreviewEntry[];
}

declare module "virtual:previewer-css" {}
