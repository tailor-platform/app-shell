import { type ReactNode, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useLocation, Link } from "react-router";
import { ChevronRight } from "lucide-react";
import { Collapsible } from "@base-ui/react/collapsible";
import {
  SidebarContext,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuAction,
  SidebarMenuSub,
  useSidebar,
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
 * Whether the sidebar is currently a narrow icon rail — the state where a group
 * swaps its inline collapsible submenu for a hover flyout.
 */
function useIsIconRail(): boolean {
  // The sidebar is a narrow icon rail whenever it's the tablet rail (isIconMode)
  // or a collapsed desktop rail. Mobile keeps the toggle-driven slide-in drawer.
  const { state, isMobile, isIconMode } = useSidebar();
  return !isMobile && (isIconMode || state === "collapsed");
}

/**
 * Hover flyout for a group in the icon rail: hovering the group icon reveals its
 * child pages in a portaled popover. It is portaled to `document.body` so it
 * escapes the rail's `overflow-hidden`, and its content runs under an
 * `expanded` sidebar context so the child items show labels and drop their own
 * icon-rail tooltips.
 */
const IconRailFlyout = ({
  trigger,
  title,
  children,
}: {
  trigger: ReactNode;
  title: string;
  children: ReactNode;
}) => {
  const ctx = useSidebar();
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancelClose = () => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  };
  const openFrom = (el: HTMLElement) => {
    cancelClose();
    // Anchor to the icon button (not the wider menu item / rail padding) so the
    // flyout sits snug against the icon, top-aligned with it.
    const anchor = el.querySelector('[data-slot="sidebar-menu-button"]') ?? el;
    const rect = anchor.getBoundingClientRect();
    setPos({ top: rect.top, left: rect.right + 8 });
    setOpen(true);
  };
  const scheduleClose = () => {
    cancelClose();
    closeTimer.current = setTimeout(() => setOpen(false), 150);
  };

  // Inside the flyout the sidebar is neither collapsed nor an icon rail, so the
  // child items show their labels and suppress their own icon-rail tooltips.
  const flyoutCtx = useMemo(
    () => ({ ...ctx, state: "expanded" as const, isMobile: false, isIconMode: false }),
    [ctx],
  );

  return (
    <SidebarMenuItem onMouseEnter={(e) => openFrom(e.currentTarget)} onMouseLeave={scheduleClose}>
      {trigger}
      {open &&
        createPortal(
          <nav
            data-slot="sidebar-group-flyout"
            aria-label={title}
            onMouseEnter={cancelClose}
            onMouseLeave={scheduleClose}
            style={{ top: pos.top, left: pos.left }}
            className="astw:fixed astw:z-(--z-popup) astw:min-w-48 astw:rounded-md astw:border astw:border-border astw:bg-popover astw:p-1 astw:text-popover-foreground astw:shadow-md"
          >
            <div className="astw:px-2 astw:py-1.5 astw:text-xs astw:font-medium astw:text-muted-foreground">
              {title}
            </div>
            <SidebarContext.Provider value={flyoutCtx}>
              <ul className="astw:flex astw:min-w-0 astw:flex-col astw:gap-0.5">{children}</ul>
            </SidebarContext.Provider>
          </nav>,
          document.body,
        )}
    </SidebarMenuItem>
  );
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

  const isIconRail = useIsIconRail();

  const resolvedTitle = resolve(title, typeof title === "string" ? title : "");
  const isActive = to ? currentPath === to : false;

  // Icon rail: swap the inline collapsible submenu for a hover flyout. The group
  // icon is the trigger; hovering it reveals the child pages in a popover.
  if (isIconRail) {
    const trigger = to ? (
      <SidebarMenuButton
        render={
          <Link
            to={to}
            className={isActive ? "astw:bg-sidebar-accent astw:font-medium" : undefined}
          />
        }
      >
        {icon}
        <span>{resolvedTitle}</span>
      </SidebarMenuButton>
    ) : (
      <SidebarMenuButton render={<button type="button" />}>
        {icon}
        <span>{resolvedTitle}</span>
      </SidebarMenuButton>
    );

    return (
      <IconRailFlyout trigger={trigger} title={resolvedTitle}>
        {children}
      </IconRailFlyout>
    );
  }

  // Render with clickable header (has `to` prop)
  if (to) {
    return (
      <Collapsible.Root render={<SidebarMenuItem />} defaultOpen={defaultOpen}>
        <SidebarMenuButton
          render={
            <Link
              to={to}
              className={isActive ? "astw:bg-sidebar-accent astw:font-medium" : undefined}
            />
          }
          tooltip={resolvedTitle}
        >
          {icon}
          <span>{resolvedTitle}</span>
        </SidebarMenuButton>
        <Collapsible.Trigger
          render={<SidebarMenuAction className="astw:data-panel-open:rotate-90" />}
        >
          <ChevronRight />
          <span className="astw:sr-only">{t("toggle")}</span>
        </Collapsible.Trigger>
        <Collapsible.Panel>
          <SidebarMenuSub>{children}</SidebarMenuSub>
        </Collapsible.Panel>
      </Collapsible.Root>
    );
  }

  // Render with non-clickable header (no `to` prop)
  return (
    <Collapsible.Root render={<SidebarMenuItem />} defaultOpen={defaultOpen}>
      <Collapsible.Trigger className="astw:flex astw:w-full astw:[&[data-panel-open]_.astw-rotate-target]:rotate-90">
        <SidebarMenuButton
          render={<span className="astw:flex astw:w-full" />}
          tooltip={resolvedTitle}
          // Prevent SidebarMenuButton's auto-close behavior so the mobile sidebar
          // stays open when toggling a collapsible group.
          onClick={(e) => e.preventDefault()}
        >
          {icon}
          <span>{resolvedTitle}</span>
        </SidebarMenuButton>
        <SidebarMenuAction className="astw-rotate-target" render={<span />}>
          <ChevronRight />
          <span className="astw:sr-only">{t("toggle")}</span>
        </SidebarMenuAction>
      </Collapsible.Trigger>
      <Collapsible.Panel>
        <SidebarMenuSub>{children}</SidebarMenuSub>
      </Collapsible.Panel>
    </Collapsible.Root>
  );
};
