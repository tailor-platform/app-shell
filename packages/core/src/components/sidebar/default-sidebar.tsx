import { Suspense } from "react";
import { Await, useLocation } from "react-router";
import { ChevronRight } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Sidebar,
  SidebarContent,
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
import { useAppShellConfig } from "@/contexts/appshell-context";
import { Link } from "@/components/ui/client-side-link";
import { useT } from "@/i18n-labels";
import { useNavItems, type NavItem } from "@/routing/navigation";
import { cn } from "@/lib/utils";

export type DefaultSidebarProps = {
  /**
   * Header content.
   */
  header?: React.ReactNode;

  /**
   * Footer content.
   */
  footer?: React.ReactNode;

  /**
   * When provided, enables explicit sidebar composition using React components.
   * Auto-generation is completely disabled when children is specified.
   */
  children?: React.ReactNode;
};

/**
 * Default sidebar component with auto-generated navigation items.
 *
 * It works in both auto-generation mode and composition mode.
 * - Auto-generation mode: when no children are provided, it automatically generates sidebar items based on the application's resource definitions.
 * - Composition mode: when children are provided, it allows developers to manually define the sidebar structure using SidebarItem, SidebarGroup, and other components.
 *
 * @example
 * ```tsx
 * // Auto-generation mode
 * <DefaultSidebar />
 *
 * // Composition mode
 * <DefaultSidebar>
 *   <SidebarItem to="/dashboard" />
 *   <SidebarGroup title="products">
 *     <SidebarItem to="/products/all" />
 *   </SidebarGroup>
 *   <SidebarSeparator />
 * </DefaultSidebar>
 * ```
 */
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
        {props.children ? (
          // New API: children-based explicit definition
          <SidebarGroup>
            <SidebarMenu>{props.children}</SidebarMenu>
          </SidebarGroup>
        ) : (
          // Existing behavior: auto-generation from resources
          <Suspense fallback={<SidebarSkeleton />}>
            <AutoSidebar currentPath={currentPath} />
          </Suspense>
        )}
      </SidebarContent>
      {props.footer ?? DefaultFooter}
    </Sidebar>
  );
};

/**
 * Component boundary to resolve and render automatic sidebar items.
 */
const AutoSidebar = ({ currentPath }: { currentPath: string }) => {
  const navItems = useNavItems();

  return (
    <Await resolve={navItems}>
      {(items) => (
        <AutoSidebarItems items={items ?? []} currentPath={currentPath} />
      )}
    </Await>
  );
};

/**
 * Automatically generates sidebar items from navigation data.
 */
const AutoSidebarItems = (props: {
  items: Array<NavItem>;
  currentPath: string;
}) => {
  const t = useT();

  return (
    <SidebarGroup>
      <SidebarMenu>
        {props.items.map((item) => {
          return (
            <Collapsible key={item.title} render={<SidebarMenuItem />} defaultOpen={true}>
              {item.url ? (
                <>
                  <SidebarMenuButton
                    render={
                      <Link
                        to={item.url as string}
                        className={
                          item.url === props.currentPath
                            ? "astw:bg-sidebar-accent astw:font-medium"
                            : undefined
                        }
                      >
                        {null}
                      </Link>
                    }
                    tooltip={item.title}
                  >
                    {item.icon}
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                  {!!item.items?.length && (
                    <CollapsibleTrigger
                      render={
                        <SidebarMenuAction className="astw:data-panel-open:rotate-90" />
                      }
                    >
                      <ChevronRight />
                      <span className="astw:sr-only">{t("toggle")}</span>
                    </CollapsibleTrigger>
                  )}
                </>
              ) : (
                <>
                  <CollapsibleTrigger className="astw:flex astw:w-full astw:[&[data-panel-open]_.astw-rotate-target]:rotate-90">
                    <SidebarMenuButton render={<span className="astw:flex astw:w-full" />} tooltip={item.title}>
                      {item.icon}
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                    {!!item.items?.length && (
                      <SidebarMenuAction
                        className="astw-rotate-target"
                        render={<span />}
                      >
                        <ChevronRight />
                        <span className="astw:sr-only">{t("toggle")}</span>
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
                        <SidebarMenuSubButton
                          render={
                            <Link
                              to={subItem.url}
                              className={
                                subItem.url === props.currentPath
                                  ? "astw:bg-sidebar-accent astw:font-medium"
                                  : undefined
                              }
                            >
                              {null}
                            </Link>
                          }
                        >
                          <span>{subItem.title}</span>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    ))}
                  </SidebarMenuSub>
                </CollapsibleContent>
              )}
            </Collapsible>
          );
        })}
      </SidebarMenu>
    </SidebarGroup>
  );
};

// Pre-shuffled widths for skeleton items (computed once at module load)
const skeletonWidths = [104, 80, 112, 88, 96, 100, 84, 92];

const SidebarSkeleton = () => {
  return (
    <SidebarGroup>
      <SidebarMenu className="astw:px-2">
        {skeletonWidths.map((width, idx) => (
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
