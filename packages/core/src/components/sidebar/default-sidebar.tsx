import { Suspense } from "react";
import { Await, useLocation } from "react-router";
import { ChevronRight, SearchIcon } from "lucide-react";
import { Collapsible } from "@base-ui/react/collapsible";
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
} from "@/components/sidebar";
import { useAppShellConfig } from "@/contexts/appshell-context";
import { useCommandPaletteState } from "@/contexts/command-palette-context";
import { Link } from "react-router";
import { useT } from "@/i18n-labels";
import { useNavItems, type NavItem } from "@/routing/navigation";
import { cn } from "@/lib/utils";

function resolveCollapsibleMode(
  collapsible: boolean | undefined,
  isIconMode: boolean,
): "none" | "icon" | "offcanvas" {
  if (!collapsible) return "none";
  if (isIconMode) return "icon";
  return "offcanvas";
}

function resolveCommandPaletteShortcutLabel() {
  if (typeof navigator === "undefined") return "Ctrl+K";

  const platform =
    (navigator as Navigator & { userAgentData?: { platform?: string } }).userAgentData?.platform ??
    navigator.platform ??
    "";

  return /mac|iphone|ipad|ipod/i.test(platform) ? "⌘K" : "Ctrl+K";
}

// Always rendered regardless of searchSources — the palette searches routes
// and contextual actions too, so there is always something to search.
const SearchEntry = () => {
  const { openCommandPalette } = useCommandPaletteState();
  const t = useT();
  const shortcutLabel = resolveCommandPaletteShortcutLabel();
  const tooltipLabel = `${t("search")} (${shortcutLabel})`;

  return (
    <SidebarMenuItem className="astw:mt-1 astw:pb-2">
      <SidebarMenuButton
        render={<button type="button" />}
        tooltip={tooltipLabel}
        aria-label={tooltipLabel}
        onClick={() => openCommandPalette()}
        className={cn(
          "astw:h-8 astw:justify-start astw:gap-2.5 astw:border astw:border-border/80 astw:bg-background/70 astw:px-2.5 astw:py-1.5 astw:text-xs astw:font-normal astw:text-muted-foreground astw:shadow-none",
          "astw:hover:bg-muted/30 astw:hover:text-muted-foreground",
          "astw:focus-visible:border-ring astw:focus-visible:ring-ring/40 astw:focus-visible:ring-2",
        )}
      >
        <SearchIcon className="astw:size-3.5 astw:text-muted-foreground astw:opacity-70" />
        <span className="astw:flex-1 astw:truncate astw:text-xs astw:text-muted-foreground astw:group-data-[collapsible=icon]:hidden">
          {t("commandPaletteSearch")}
        </span>
        <kbd
          aria-hidden="true"
          className="astw:pointer-events-none astw:shrink-0 astw:font-normal astw:text-xs astw:text-muted-foreground astw:opacity-70 astw:group-data-[collapsible=icon]:hidden"
        >
          {shortcutLabel}
        </kbd>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
};

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
 * Must be rendered inside `AppShell` (or a `CommandPaletteProvider`) — the
 * built-in Search button requires the palette context.
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
  const { isIconMode, collapsible } = useSidebar();

  const DefaultHeader = (
    <SidebarHeader>
      {icon}
      <h1 className={cn("astw:text-sm astw:mb-2 astw:mt-2 astw:px-2", isIconMode && "astw:hidden")}>
        {title}
      </h1>
    </SidebarHeader>
  );
  const DefaultFooter = null;

  const collapsibleMode = resolveCollapsibleMode(collapsible, isIconMode);

  return (
    <Sidebar variant="inset" collapsible={collapsibleMode}>
      {!isIconMode && (
        <div className="astw:flex astw:justify-between astw:items-center">
          {props.header ?? DefaultHeader}
          {collapsible && (
            <div className="astw:hidden astw:md:block">
              <SidebarTrigger className="astw:-ml-1" />
            </div>
          )}
        </div>
      )}
      <SidebarContent>
        {props.children ? (
          // New API: children-based explicit definition
          <SidebarGroup>
            <SidebarMenu>
              <SearchEntry />
              {props.children}
            </SidebarMenu>
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
      {(items) => <AutoSidebarItems items={items ?? []} currentPath={currentPath} />}
    </Await>
  );
};

/**
 * Compare a nav-item URL (which may lack a leading slash) against the
 * current pathname (which always starts with "/").
 */
const isActivePath = (url: string | undefined, currentPath: string) => {
  if (!url) return false;
  const normalizedUrl = url.startsWith("/") ? url : `/${url}`;
  return normalizedUrl === currentPath;
};

/**
 * Automatically generates sidebar items from navigation data.
 */
const AutoSidebarItems = (props: { items: Array<NavItem>; currentPath: string }) => {
  const t = useT();

  return (
    <SidebarGroup>
      <SidebarMenu>
        <SearchEntry />
        {props.items.map((item) => {
          return (
            <Collapsible.Root key={item.title} render={<SidebarMenuItem />} defaultOpen={true}>
              {item.url ? (
                <>
                  <SidebarMenuButton
                    render={
                      <Link
                        to={item.url as string}
                        className={
                          isActivePath(item.url, props.currentPath)
                            ? "astw:bg-sidebar-accent astw:font-medium"
                            : undefined
                        }
                      />
                    }
                    tooltip={item.title}
                  >
                    {item.icon}
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                  {!!item.items?.length && (
                    <Collapsible.Trigger
                      render={<SidebarMenuAction className="astw:data-panel-open:rotate-90" />}
                    >
                      <ChevronRight />
                      <span className="astw:sr-only">{t("toggle")}</span>
                    </Collapsible.Trigger>
                  )}
                </>
              ) : (
                <>
                  <Collapsible.Trigger className="astw:flex astw:w-full astw:[&[data-panel-open]_.astw-rotate-target]:rotate-90">
                    <SidebarMenuButton
                      render={<span className="astw:flex astw:w-full" />}
                      tooltip={item.title}
                      onClick={(e) =>
                        // Prevent SidebarMenuButton's auto-close behavior so the mobile sidebar
                        // stays open when toggling a collapsible group.
                        e.preventDefault()
                      }
                    >
                      {item.icon}
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                    {!!item.items?.length && (
                      <SidebarMenuAction className="astw-rotate-target" render={<span />}>
                        <ChevronRight />
                        <span className="astw:sr-only">{t("toggle")}</span>
                      </SidebarMenuAction>
                    )}
                  </Collapsible.Trigger>
                </>
              )}
              {!!item.items?.length && (
                <Collapsible.Panel>
                  <SidebarMenuSub>
                    {item.items
                      ?.filter((subItem) => subItem.url)
                      .map((subItem) => (
                        <SidebarMenuSubItem key={subItem.title}>
                          <SidebarMenuSubButton
                            render={
                              <Link
                                to={subItem.url!}
                                className={
                                  isActivePath(subItem.url, props.currentPath)
                                    ? "astw:bg-sidebar-accent astw:font-medium"
                                    : undefined
                                }
                              />
                            }
                          >
                            <span>{subItem.title}</span>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                  </SidebarMenuSub>
                </Collapsible.Panel>
              )}
            </Collapsible.Root>
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
