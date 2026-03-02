import type { ReactNode } from "react";
import { useLocation, Link } from "react-router";
import { ExternalLink } from "lucide-react";
import { SidebarMenuItem, SidebarMenuButton } from "@/components/sidebar";
import { usePageMeta } from "@/hooks/use-page-meta";

export type SidebarItemRenderProps = {
  /** Title auto-resolved from resource meta */
  title: string;
  /** Target URL */
  url: string;
  /** Icon auto-resolved from resource meta */
  icon?: ReactNode;
  /** Whether this item is currently active */
  isActive: boolean;
};

export type SidebarItemProps = {
  /**
   * Target URL (required).
   * External URLs (http://...) are rendered as external links.
   */
  to: string;

  /**
   * Override title.
   * When omitted, title is auto-resolved from resource meta.
   */
  title?: string;

  /**
   * Override icon.
   * When omitted, icon is auto-resolved from resource meta.
   */
  icon?: ReactNode;

  /**
   * Opens as external link with `target="_blank"`.
   * When true, adds an external link icon and opens in new tab.
   */
  external?: boolean;

  /**
   * How to match the current path for active state.
   * - "exact": Only highlight when the path matches exactly.
   * - "prefix": Highlight when the current path starts with `to` (with segment boundary check).
   * @default "prefix"
   */
  activeMatch?: "exact" | "prefix";

  /**
   * Custom rendering function.
   * When omitted, title/icon are auto-resolved from resource meta and default UI is rendered.
   * When specified, receives title/icon/isActive in render function for full customization.
   */
  render?: (props: SidebarItemRenderProps) => ReactNode;
};

/**
 * A navigation item for the sidebar.
 *
 * Automatically resolves title and icon from the resource definition's meta
 * corresponding to the URL specified in `to`.
 *
 * @example
 * ```tsx
 * // Auto-resolved from resource meta
 * <SidebarItem to="/dashboard" />
 *
 * // Override title and icon
 * <SidebarItem to="/" title="Home" icon={<Home />} />
 *
 * // Custom rendering
 * <SidebarItem
 *   to="/tasks"
 *   render={({ title, icon, isActive }) => (
 *     <>
 *       {icon}
 *       {title}
 *       <Badge>5</Badge>
 *     </>
 *   )}
 * />
 *
 * // External link
 * <SidebarItem to="https://docs.example.com" external />
 * ```
 */
export const SidebarItem = (props: SidebarItemProps) => {
  const {
    to,
    external,
    render,
    activeMatch = "prefix",
    title: titleOverride,
    icon: iconOverride,
  } = props;
  const { pathname: currentPath } = useLocation();
  const pageMeta = usePageMeta(to);

  const isActive =
    activeMatch === "exact"
      ? currentPath === to
      : currentPath === to || currentPath.startsWith(`${to}/`);
  const title = titleOverride ?? pageMeta?.title ?? extractTitleFromUrl(to);
  const icon = iconOverride ?? pageMeta?.icon;

  const renderProps: SidebarItemRenderProps = {
    title,
    url: to,
    icon,
    isActive,
  };

  // External link handling
  if (external || isExternalUrl(to)) {
    return (
      <SidebarMenuItem>
        <SidebarMenuButton
          render={
            <a
              href={to}
              target="_blank"
              rel="noopener noreferrer"
              className={
                isActive ? "astw:bg-sidebar-accent astw:font-medium" : undefined
              }
            />
          }
          tooltip={title}
        >
            {render ? (
              render(renderProps)
            ) : (
              <>
                {icon ?? <ExternalLink className="astw:size-4" />}
                <span>{title}</span>
              </>
            )}
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  }

  // Internal link
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        render={
          <Link
            to={to}
            className={
              isActive ? "astw:bg-sidebar-accent astw:font-medium" : undefined
            }
          />
        }
        tooltip={title}
      >
          {render ? (
            render(renderProps)
          ) : (
            <>
              {icon}
              <span>{title}</span>
            </>
          )}
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
};

/**
 * Check if a URL is external
 */
const isExternalUrl = (url: string): boolean => {
  return url.startsWith("http://") || url.startsWith("https://");
};

/**
 * Extract a human-readable title from a URL path
 */
const extractTitleFromUrl = (url: string): string => {
  if (isExternalUrl(url)) {
    try {
      return new URL(url).hostname;
    } catch {
      return url;
    }
  }

  // Get the last segment and convert to title case
  const segments = url.split("/").filter(Boolean);
  const lastSegment = segments[segments.length - 1] ?? url;
  return lastSegment
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};
