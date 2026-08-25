import * as React from "react";
import { SidebarContext } from "@/components/sidebar";

export type AppShellSidebarState = {
  /**
   * Whether the sidebar is expanded on desktop — the same signal the DOM
   * exposes as `[data-slot="sidebar"][data-state]`.
   *
   * On mobile the sidebar is an overlay sheet rather than an in-flow column,
   * so this does not describe how much room the content has; branch on
   * `isMobile` when that distinction matters.
   */
  open: boolean;

  /** Whether the viewport is below the mobile breakpoint (768px). */
  isMobile: boolean;

  /** Expand or collapse the sidebar. */
  setOpen: (open: boolean) => void;

  /**
   * Toggle the sidebar — the same action as `<SidebarLayout.Trigger />` and the
   * ⌘B / Ctrl+B shortcut, including the mobile and tablet overlay behaviour.
   */
  toggle: () => void;
};

const noop = () => {};

// Stable inert value so the hook is safe to call outside a SidebarLayout, in
// the same spirit as `useAppShellScrollContainer()` handing back an empty ref
// rather than throwing.
const FALLBACK: AppShellSidebarState = {
  open: true,
  isMobile: false,
  setOpen: noop,
  toggle: noop,
};

/**
 * Read and control the AppShell sidebar's collapsed state.
 *
 * Use this instead of observing `[data-slot="sidebar"][data-state]` or clicking
 * the trigger through the DOM — those reach into internals that can change
 * between releases.
 *
 * ```tsx
 * const { open, toggle } = useAppShellSidebar();
 * return <button onClick={toggle}>{open ? "Hide nav" : "Show nav"}</button>;
 * ```
 *
 * Outside a `SidebarLayout` there is no sidebar to describe, so this reports
 * `open: true` with no-op setters rather than throwing.
 */
export function useAppShellSidebar(): AppShellSidebarState {
  const context = React.useContext(SidebarContext);

  return React.useMemo(() => {
    if (!context) return FALLBACK;
    return {
      open: context.open,
      isMobile: context.isMobile,
      setOpen: context.setOpen,
      toggle: context.toggleSidebar,
    };
  }, [context]);
}
