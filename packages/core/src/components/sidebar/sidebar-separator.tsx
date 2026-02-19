import { SidebarSeparator as ShadcnSidebarSeparator } from "@/components/ui/sidebar";

export type SidebarSeparatorProps = Record<string, never>;

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
export const SidebarSeparator = (_props: SidebarSeparatorProps) => {
  return <ShadcnSidebarSeparator />;
};
