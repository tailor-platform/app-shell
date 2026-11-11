/** Allowed desktop operations; every mode keeps normal mobile/tablet menu presentation. */
export type SidebarBehaviour =
  /** Always expanded at a fixed desktop width, with no collapse/resize controls; ignores defaultOpen. */
  | "fixed"
  /** Desktop collapse/expand controls only, with a fixed width and no resize handle; respects defaultOpen. */
  | "collapse"
  /**
   * Desktop resizing only, while always expanded; ignores defaultOpen.
   * Width clamps to 192–480px, and double-click resets to 256px without collapsing.
   */
  | "resize"
  /**
   * Default: both desktop collapsing and resizing are enabled; respects defaultOpen.
   * Dragging can expand, resize, and collapse. Double-click resets to 256px or collapses from 256px.
   */
  | "collapse-and-resize";

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
