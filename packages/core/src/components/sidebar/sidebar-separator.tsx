import { SidebarSeparator as ShadcnSidebarSeparator } from "./primitives";

/**
 * A visual divider for sidebar navigation.
 *
 * Adds 4px above and 8px below the line (on top of the menu's own gap) so the
 * items that follow read as a new section.
 *
 * @example
 * ```tsx
 * <DefaultSidebar>
 *   <SidebarItem to="/dashboard" />
 *   <SidebarSeparator />
 *   <SidebarItem to="/settings" />
 * </DefaultSidebar>
 * ```
 */
export const SidebarSeparator = () => {
  return <ShadcnSidebarSeparator className="astw:mt-1 astw:mb-2" />;
};
