import type { ReactNode } from "react";
import { SidebarProvider, SidebarInset, SidebarTrigger, useSidebar } from "@/components/sidebar";
import { AppShellOutlet } from "@/components/content";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { DefaultSidebar } from "./default-sidebar";
import { DynamicBreadcrumb } from "@/components/dynamic-breadcrumb";

export type SidebarLayoutProps = {
  /**
   * Header theme control.
   *
   * @default Built-in **`ThemeSwitcher`** menu (all themes + **System**).
   * Pass **`null`** to hide. Pass a custom **`ReactNode`** to replace.
   */
  themeSwitcher?: ReactNode;

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
  const themeSwitcher = props.themeSwitcher !== undefined ? props.themeSwitcher : <ThemeSwitcher />;

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
              {themeSwitcher !== null ? (
                <div className="astw:flex astw:items-center astw:gap-2">{themeSwitcher}</div>
              ) : null}
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
