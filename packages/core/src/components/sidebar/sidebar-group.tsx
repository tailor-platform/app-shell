import type { ReactNode } from "react";
import { useLocation } from "react-router";
import { ChevronRight } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuAction,
  SidebarMenuSub,
} from "@/components/ui/sidebar";
import { Link } from "@/components/ui/client-side-link";
import { useT } from "@/i18n-labels";
import { useAppShellConfig } from "@/contexts/appshell-context";
import { buildLocaleResolver, type LocalizedString } from "@/lib/i18n";
import type { Guard } from "@/resource";

export type SidebarGroupProps = {
  /**
   * Group title (i18n supported).
   */
  title: LocalizedString;

  /**
   * Group icon.
   */
  icon?: ReactNode;

  /**
   * When specified, title becomes a clickable link.
   */
  to?: string;

  /**
   * Initial expanded state.
   * @default true
   */
  defaultOpen?: boolean;

  /**
   * Guards for group visibility.
   * When defined, evaluated before children. Group is hidden if guards return non-pass.
   * When omitted, group is hidden only if all children are hidden.
   */
  guards?: Guard[];

  /**
   * Child items (SidebarItem, SidebarGroup, etc.)
   */
  children: ReactNode;
};

/**
 * A collapsible group for sidebar navigation.
 *
 * @example
 * ```tsx
 * // Basic group
 * <SidebarGroup title={labels.t("products")} icon={<Package />}>
 *   <SidebarItem to="/products/all" />
 *   <SidebarItem to="/products/categories" />
 * </SidebarGroup>
 *
 * // Clickable group header
 * <SidebarGroup title={labels.t("settings")} icon={<Settings />} to="/settings">
 *   <SidebarItem to="/settings/profile" />
 *   <SidebarItem to="/settings/security" />
 * </SidebarGroup>
 *
 * // Nested groups
 * <SidebarGroup title={labels.t("products")} icon={<Package />}>
 *   <SidebarItem to="/products/all" />
 *   <SidebarGroup title={labels.t("archives")} defaultOpen={false}>
 *     <SidebarItem to="/products/archives/2024" />
 *     <SidebarItem to="/products/archives/2023" />
 *   </SidebarGroup>
 * </SidebarGroup>
 * ```
 */
export const SidebarGroup = (props: SidebarGroupProps) => {
  const { title, icon, to, defaultOpen = true, children } = props;
  const { pathname: currentPath } = useLocation();
  const { configurations } = useAppShellConfig();
  const resolve = buildLocaleResolver(configurations.locale);
  const t = useT();

  const resolvedTitle = resolve(title, typeof title === "string" ? title : "");
  const isActive = to ? currentPath === to : false;

  // Render with clickable header (has `to` prop)
  if (to) {
    return (
      <Collapsible asChild defaultOpen={defaultOpen}>
        <SidebarMenuItem>
          <SidebarMenuButton asChild tooltip={resolvedTitle}>
            <Link
              to={to}
              className={
                isActive ? "astw:bg-sidebar-accent astw:font-medium" : undefined
              }
            >
              {icon}
              <span>{resolvedTitle}</span>
            </Link>
          </SidebarMenuButton>
          <CollapsibleTrigger asChild>
            <SidebarMenuAction className="astw:data-[state=open]:rotate-90">
              <ChevronRight />
              <span className="astw:sr-only">{t("toggle")}</span>
            </SidebarMenuAction>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <SidebarMenuSub>{children}</SidebarMenuSub>
          </CollapsibleContent>
        </SidebarMenuItem>
      </Collapsible>
    );
  }

  // Render with non-clickable header (no `to` prop)
  return (
    <Collapsible asChild defaultOpen={defaultOpen}>
      <SidebarMenuItem>
        <CollapsibleTrigger className="astw:flex astw:w-[100%] astw:[&[data-state=open]_.astw-rotate-target]:rotate-90">
          <SidebarMenuButton asChild tooltip={resolvedTitle}>
            <span className="astw:flex astw:w-[100%]">
              {icon}
              <span>{resolvedTitle}</span>
            </span>
          </SidebarMenuButton>
          <SidebarMenuAction className="astw-rotate-target" asChild>
            <span>
              <ChevronRight />
              <span className="astw:sr-only">{t("toggle")}</span>
            </span>
          </SidebarMenuAction>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarMenuSub>{children}</SidebarMenuSub>
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  );
};
