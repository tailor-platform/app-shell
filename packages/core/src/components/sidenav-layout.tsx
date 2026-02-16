import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Await, useLocation, useMatch } from "react-router";
import {
  Sidebar,
  SidebarProvider,
  SidebarContent,
  SidebarInset,
  SidebarGroup,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuAction,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarHeader,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { ChevronRight, SunIcon } from "lucide-react";
import { Suspense } from "react";
import { useAppShellConfig } from "@/contexts/appshell-context";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "./ui/breadcrumb";
import { AppShellOutlet } from "./content";
import { processPathSegments } from "@/routing/path";
import { Button } from "./ui/button";
import { useTheme } from "@/contexts/theme-context";
import { Link } from "./ui/client-side-link";
import { useT } from "@/i18n-labels";
import { useNavItems, type NavItem } from "../routing/navigation";
import { cn } from "@/lib/utils";

export type SidebarLayoutProps = {
  children?: (props: { Outlet: () => React.ReactNode }) => React.ReactNode;
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

type DefaultSidebarProps = {
  header?: React.ReactNode;
  footer?: React.ReactNode;
};

export const DefaultSidebar = (props: DefaultSidebarProps) => {
  const { title, icon } = useAppShellConfig();
  const { pathname: currentPath } = useLocation();
  const { isIconMode } = useSidebar();

  const DefaultHeader = (
    <SidebarHeader>
      {icon}
      <h1
        className={cn(
          "astw:text-sm astw:mb-2 astw:mt-2 astw:px-2",
          isIconMode && "astw:hidden",
        )}
      >
        {title}
      </h1>
    </SidebarHeader>
  );
  const DefaultFooter = null;

  return (
    <Sidebar variant="inset" collapsible={isIconMode ? "icon" : "offcanvas"}>
      {!isIconMode && (
        <div className="astw:flex astw:justify-between astw:items-center">
          {props.header ?? DefaultHeader}
          <div className="astw:hidden astw:md:block">
            <SidebarTrigger className="astw:-ml-1" />
          </div>
        </div>
      )}
      <SidebarContent>
        <Suspense fallback={<SidebarSkeleton />}>
          <AwaitNavItems currentPath={currentPath} />
        </Suspense>
      </SidebarContent>
      {props.footer ?? DefaultFooter}
    </Sidebar>
  );
};

const AwaitNavItems = ({ currentPath }: { currentPath: string }) => {
  const navItems = useNavItems();

  return (
    <Await resolve={navItems}>
      {(items) => <SidebarNav items={items ?? []} currentPath={currentPath} />}
    </Await>
  );
};

const SidebarNav = (props: { items: Array<NavItem>; currentPath: string }) => {
  const t = useT();

  return (
    <SidebarGroup>
      <SidebarMenu>
        {props.items.map((item) => {
          return (
            <Collapsible key={item.title} asChild defaultOpen={true}>
              <SidebarMenuItem>
                {item.url ? (
                  <>
                    <SidebarMenuButton asChild tooltip={item.title}>
                      <Link
                        to={item.url as string}
                        className={
                          item.url === props.currentPath
                            ? "astw:bg-sidebar-accent astw:font-medium"
                            : undefined
                        }
                      >
                        {item.icon}
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                    {!!item.items?.length && (
                      <CollapsibleTrigger asChild>
                        <SidebarMenuAction className="astw:data-[state=open]:rotate-90">
                          <ChevronRight />
                          <span className="astw:sr-only">{t("toggle")}</span>
                        </SidebarMenuAction>
                      </CollapsibleTrigger>
                    )}
                  </>
                ) : (
                  <>
                    <CollapsibleTrigger className="astw:flex astw:w-[100%] astw:[&[data-state=open]_.astw-rotate-target]:rotate-90">
                      <SidebarMenuButton asChild tooltip={item.title}>
                        <span className="astw:flex astw:w-[100%]">
                          {item.icon}
                          <span>{item.title}</span>
                        </span>
                      </SidebarMenuButton>
                      {!!item.items?.length && (
                        <SidebarMenuAction
                          className="astw-rotate-target"
                          asChild
                        >
                          <span>
                            <ChevronRight />
                            <span className="astw:sr-only">{t("toggle")}</span>
                          </span>
                        </SidebarMenuAction>
                      )}
                    </CollapsibleTrigger>
                  </>
                )}
                {!!item.items?.length && (
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {item.items?.map((subItem) => (
                        <SidebarMenuSubItem key={subItem.title}>
                          <SidebarMenuSubButton asChild>
                            <Link
                              to={subItem.url}
                              className={
                                subItem.url === props.currentPath
                                  ? "astw:bg-sidebar-accent astw:font-medium"
                                  : undefined
                              }
                            >
                              <span>{subItem.title}</span>
                            </Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                )}
              </SidebarMenuItem>
            </Collapsible>
          );
        })}
      </SidebarMenu>
    </SidebarGroup>
  );
};

const SidebarSkeleton = () => {
  const widthsPx = [112, 96, 80, 104, 88, 100, 92, 84];
  const shuffled = [...widthsPx].sort(() => Math.random() - 0.5);

  return (
    <SidebarGroup>
      <SidebarMenu className="astw:px-2">
        {shuffled.map((width, idx) => (
          <SidebarMenuItem key={idx}>
            <div className="astw:flex astw:items-center astw:gap-2 astw:py-1.5">
              <div className="astw:h-4 astw:w-4 astw:rounded-md astw:bg-muted" />
              <div
                className="astw:h-4 astw:rounded astw:bg-muted"
                style={{ width: `${width}px` }}
              />
            </div>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  );
};

/**
 * Hook to retrieve the current path segments and their corresponding titles.
 */
const usePathSegments = () => {
  const { configurations } = useAppShellConfig();
  const location = useLocation();

  return processPathSegments(
    location.pathname,
    configurations.basePath,
    configurations.modules,
    configurations.locale,
  );
};

export const DynamicBreadcrumb = () => {
  const { segments } = usePathSegments();
  const isSettings = useMatch("/:prefix/settings/:suffix");
  const t = useT();

  if (isSettings) {
    return (
      <Breadcrumb>
        <BreadcrumbList>
          <div className="astw:inline-flex astw:items-center astw:gap-3 astw:last:text-foreground">
            <BreadcrumbItem>
              <BreadcrumbLink to={`/${isSettings.params.prefix}/settings`}>
                {t("settings")}
              </BreadcrumbLink>
            </BreadcrumbItem>
          </div>
        </BreadcrumbList>
      </Breadcrumb>
    );
  }

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {segments.map((segmentInfo, index) => (
          <div
            className="astw:inline-flex astw:items-center astw:gap-3 astw:last:text-foreground"
            key={index}
          >
            <BreadcrumbItem>
              <BreadcrumbLink to={segmentInfo.path}>
                {segmentInfo.title}
              </BreadcrumbLink>
            </BreadcrumbItem>
            {index < segments.length - 1 && <BreadcrumbSeparator />}
          </div>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
};
