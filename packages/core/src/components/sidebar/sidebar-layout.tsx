import { Children as ReactChildren } from "react";
import { SidebarProvider, SidebarInset, SidebarTrigger, useSidebar } from "@/components/sidebar";
import { AppShellOutlet } from "@/components/content";
import { AppearanceSwitcher } from "@/components/appearance-switcher";
import { DefaultSidebar } from "./default-sidebar";
import { DynamicBreadcrumb } from "@/components/dynamic-breadcrumb";

export type SidebarLayoutProps = {
  /**
   * Custom content renderer.
   *
   * @example
   * ```tsx
   * <SidebarLayout>
   *   {({ Outlet }) => (
   *     <>
   *       <CustomHeader />
   *       <Outlet />
   *       <CustomFooter />
   *     </>
   *   )}
   * </SidebarLayout>
   * ```
   */
  children?: (props: { Outlet: () => React.ReactNode }) => React.ReactNode;

  /**
   * Custom sidebar content.
   *
   * @default DefaultSidebar
   * @example
   * ```tsx
   * <SidebarLayout sidebar={<MyCustomSidebar />} />
   * ```
   */
  sidebar?: React.ReactNode;

  /**
   * Whether the sidebar is open by default on desktop.
   *
   * @default true
   */
  defaultOpen?: boolean;

  /**
   * Whether the sidebar can be collapsed.
   * When set to `false`, the sidebar is always visible and cannot be toggled.
   * `defaultOpen` is ignored when this is `false`.
   *
   * @default true
   */
  collapsible?: boolean;

  /**
   * Custom action(s) rendered on the right side of the top bar, immediately
   * before the appearance switcher. Use this to add app-specific actions such
   * as a notification bell, user menu, or global search.
   *
   * Accepts a single node or an array of nodes; they are laid out in a
   * horizontal, vertically-centered row with consistent spacing.
   *
   * @example
   * ```tsx
   * <SidebarLayout headerActions={<NotificationBell />} />
   * ```
   *
   * @example
   * ```tsx
   * <SidebarLayout
   *   headerActions={[<NotificationBell key="bell" />, <UserMenu key="user" />]}
   * />
   * ```
   */
  headerActions?: React.ReactNode | React.ReactNode[];
};

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

export const SidebarLayout = (props: SidebarLayoutProps) => {
  const Children = props.children ? props.children({ Outlet: AppShellOutlet }) : null;
  // Children.toArray flattens, drops nullish nodes, and preserves any keys the
  // consumer set on array items (so dynamic/reordered actions keep their identity).
  const headerActions = ReactChildren.toArray(props.headerActions);

  return (
    <SidebarProvider
      defaultOpen={props.defaultOpen}
      collapsible={props.collapsible}
      className="astw:flex astw:flex-col"
    >
      <div className="astw:flex astw:flex-1">
        {props.sidebar ?? <DefaultSidebar />}
        <SidebarInset className="astw:w-[calc(100%-var(--sidebar-width))]">
          <header className="astw:flex astw:h-14 astw:shrink-0 astw:items-center astw:gap-2 astw:transition-[width,height] astw:ease-linear astw:group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
            <div className="astw:flex astw:w-full astw:items-center astw:justify-between">
              <div className="astw:flex astw:items-center astw:gap-2">
                <HidableSidebarTrigger />
                <DynamicBreadcrumb />
              </div>
              <div className="astw:flex astw:items-center astw:gap-2">
                {headerActions.length > 0 && (
                  <div className="astw:flex astw:flex-row astw:items-center astw:gap-2">
                    {headerActions}
                  </div>
                )}
                <AppearanceSwitcher />
              </div>
            </div>
          </header>
          <div className="astw:flex astw:flex-col astw:gap-4 astw:flex-1 astw:min-h-0">
            {Children ?? <AppShellOutlet />}
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};
