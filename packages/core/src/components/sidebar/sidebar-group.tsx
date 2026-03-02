import type { ReactNode } from "react";
import { useLocation, Link } from "react-router";
import { ChevronRight } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/collapsible";
import {
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuAction,
  SidebarMenuSub,
} from "@/components/sidebar";
import { useT } from "@/i18n-labels";
import { useAppShellConfig } from "@/contexts/appshell-context";
import { buildLocaleResolver, type LocalizedString } from "@/lib/i18n";

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
      <Collapsible render={<SidebarMenuItem />} defaultOpen={defaultOpen}>
        <SidebarMenuButton
          render={
            <Link
              to={to}
              className={
                isActive ? "astw:bg-sidebar-accent astw:font-medium" : undefined
              }
            />
          }
          tooltip={resolvedTitle}
        >
          {icon}
          <span>{resolvedTitle}</span>
        </SidebarMenuButton>
        <CollapsibleTrigger
          render={
            <SidebarMenuAction className="astw:data-panel-open:rotate-90" />
          }
        >
          <ChevronRight />
          <span className="astw:sr-only">{t("toggle")}</span>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarMenuSub>{children}</SidebarMenuSub>
        </CollapsibleContent>
      </Collapsible>
    );
  }

  // Render with non-clickable header (no `to` prop)
  return (
    <Collapsible render={<SidebarMenuItem />} defaultOpen={defaultOpen}>
      <CollapsibleTrigger className="astw:flex astw:w-full astw:[&[data-panel-open]_.astw-rotate-target]:rotate-90">
        <SidebarMenuButton
          render={<span className="astw:flex astw:w-full" />}
          tooltip={resolvedTitle}
        >
          {icon}
          <span>{resolvedTitle}</span>
        </SidebarMenuButton>
        <SidebarMenuAction className="astw-rotate-target" render={<span />}>
          <ChevronRight />
          <span className="astw:sr-only">{t("toggle")}</span>
        </SidebarMenuAction>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <SidebarMenuSub>{children}</SidebarMenuSub>
      </CollapsibleContent>
    </Collapsible>
  );
};
