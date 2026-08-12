import { SidebarTrigger as SidebarTriggerPrimitive } from "@/components/sidebar";

export type TriggerProps = {
  /** Extra classes for the trigger button. */
  className?: string;
  /**
   * Runs before the sidebar toggles. The toggle itself is not cancellable —
   * use `useAppShellSidebar()` if you need to drive the state directly.
   */
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
};

/**
 * Trigger — the sidebar collapse toggle, as used by the built-in header.
 *
 * Render it when composing your own header (or a `body` layout) so users keep
 * a way to collapse the nav. Prefer this over reaching for the built-in
 * trigger through the DOM.
 *
 * @example
 * ```tsx
 * <SidebarLayout.ContentContainer
 *   header={
 *     <div className="flex h-14 items-center gap-2">
 *       <SidebarLayout.Trigger />
 *       <h1>My header</h1>
 *     </div>
 *   }
 * >
 *   <SidebarLayout.Outlet />
 * </SidebarLayout.ContentContainer>
 * ```
 */
export const Trigger = ({ className, onClick }: TriggerProps) => (
  <SidebarTriggerPrimitive className={className} onClick={onClick} />
);
Trigger.displayName = "SidebarLayout.Trigger";
