import { SidebarSeparator as ShadcnSidebarSeparator } from "@/components/sidebar";

/**
 * A visual divider for sidebar navigation.
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
  return <ShadcnSidebarSeparator />;
};
