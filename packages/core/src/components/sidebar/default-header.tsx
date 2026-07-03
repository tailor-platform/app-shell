import { Children as ReactChildren } from "react";
import { SidebarTrigger, useSidebar } from "@/components/sidebar";
import { AppearanceSwitcher } from "@/components/appearance-switcher";
import { DynamicBreadcrumb } from "@/components/dynamic-breadcrumb";

const HidableSidebarTrigger = () => {
  const { open, isIconMode, collapsible } = useSidebar();

  if (!collapsible) return null;

  // Hide trigger when sidebar is open (desktop), but show it in icon mode
  return (
    <div className={open && !isIconMode ? "astw:md:hidden" : undefined}>
      <SidebarTrigger className="astw:-ml-2.5" />
    </div>
  );
};

export type DefaultHeaderProps = {
  /**
   * The right-hand cluster of the header. Rendered in a horizontal,
   * vertically-centered row with consistent spacing — you don't wrap it
   * yourself. Accepts a single node or an array of nodes.
   *
   * **`actions` replaces the entire right-hand cluster, including the
   * appearance switcher.** When omitted, it defaults to just the
   * `<AppearanceSwitcher />`. If you pass your own actions and still want the
   * switcher, include `<AppearanceSwitcher />` in the array (it is a public
   * export). Passing `actions={[]}` renders an empty right side.
   *
   * @default [<AppearanceSwitcher />]
   * @example
   * ```tsx
   * // Add a notification bell, keeping the appearance switcher:
   * <SidebarLayout.DefaultHeader
   *   actions={[<NotificationBell key="bell" />, <AppearanceSwitcher key="appearance" />]}
   * />
   * ```
   */
  actions?: React.ReactNode | React.ReactNode[];
};

/**
 * DefaultHeader — the built-in `SidebarLayout` top bar.
 *
 * Renders the sidebar trigger and breadcrumb trail on the left, and the
 * `actions` cluster (defaulting to the appearance switcher) on the right.
 *
 * Use it via the `SidebarLayout.DefaultHeader` namespace to slightly extend the
 * built-in header without reconstructing it:
 *
 * @example
 * ```tsx
 * <SidebarLayout
 *   header={
 *     <SidebarLayout.DefaultHeader
 *       actions={[<NotificationBell key="bell" />, <AppearanceSwitcher key="appearance" />]}
 *     />
 *   }
 * />
 * ```
 */
export const DefaultHeader = ({ actions }: DefaultHeaderProps) => {
  // Children.toArray flattens, drops nullish nodes, and preserves any keys the
  // consumer set on array items (so dynamic/reordered actions keep identity).
  const resolvedActions =
    actions === undefined
      ? [<AppearanceSwitcher key="appearance" />]
      : ReactChildren.toArray(actions);

  return (
    <header className="astw:flex astw:h-14 astw:shrink-0 astw:items-center astw:gap-2 astw:transition-[width,height] astw:ease-linear astw:group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
      <div className="astw:flex astw:w-full astw:items-center astw:justify-between">
        <div className="astw:flex astw:items-center astw:gap-2">
          <HidableSidebarTrigger />
          <DynamicBreadcrumb />
        </div>
        <div className="astw:flex astw:flex-row astw:items-center astw:gap-2">
          {resolvedActions}
        </div>
      </div>
    </header>
  );
};
DefaultHeader.displayName = "SidebarLayout.DefaultHeader";
