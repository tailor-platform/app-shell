import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { SunIcon } from "lucide-react";
import { AppShellOutlet } from "@/components/content";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/contexts/theme-context";
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
};

const HidableSidebarTrigger = () => {
  const { open, isIconMode } = useSidebar();

  // Hide trigger when sidebar is open (desktop), but show it in icon mode
  return (
    <div className={open && !isIconMode ? "astw:md:hidden" : undefined}>
      <SidebarTrigger className="astw:-ml-2.5" />
    </div>
  );
};

export const SidebarLayout = (props: SidebarLayoutProps) => {
  const Children = props.children
    ? props.children({ Outlet: AppShellOutlet })
    : null;
  const themeContext = useTheme();
  const toggleTheme = () => {
    themeContext.setTheme(themeContext.theme === "dark" ? "light" : "dark");
  };

  return (
    <SidebarProvider className="astw:flex astw:flex-col">
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
                <Button variant="outline" size="icon" onClick={toggleTheme}>
                  <SunIcon />
                </Button>
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
