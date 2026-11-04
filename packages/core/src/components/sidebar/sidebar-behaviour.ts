/** Allowed desktop operations; mobile/tablet menu presentation is independent. */
export type SidebarBehaviour = "fixed" | "collapse" | "resize" | "collapse-and-resize";

/** New and deprecated configuration cannot be specified together. */
export type SidebarBehaviourProps =
  | {
      /** Desktop operations to allow. @default "collapse-and-resize" */
      sidebarBehaviour?: SidebarBehaviour;
      collapsible?: never;
    }
  | {
      sidebarBehaviour?: never;
      /** @deprecated Use sidebarBehaviour. true maps to "collapse", false to "fixed". */
      collapsible?: boolean;
    };
