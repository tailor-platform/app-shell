import { type ReactNode, useContext, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useLocation, Link } from "react-router";
import { ChevronRight } from "lucide-react";
import { Collapsible } from "@base-ui/react/collapsible";
import {
  SidebarRailContext,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuAction,
  SidebarMenuSub,
} from "@/components/sidebar";
import { useHasHover } from "@/hooks/use-has-hover";
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
  // `SidebarRailContext` is true wherever the sidebar renders as a collapsed
  // icon rail (any width). Gate the hover flyout on hover-capability so a narrow
  // desktop window still gets it, while touch devices fall back to the
  // toggle-driven slide-in drawer.
  const isRail = useContext(SidebarRailContext);
  const hasHover = useHasHover();
  return isRail && hasHover;
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
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const flyoutRef = useRef<HTMLElement>(null);
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

  // Keep the flyout on screen: if a long menu (or one anchored low in the rail)
  // would spill past the viewport bottom, shift it up to fit.
  useLayoutEffect(() => {
    if (!open) return;
    const el = flyoutRef.current;
    if (!el) return;
    const margin = 8;
    const maxTop = window.innerHeight - el.offsetHeight - margin;
    setPos((p) => {
      const top = Math.max(margin, Math.min(p.top, maxTop));
      return top === p.top ? p : { ...p, top };
    });
  }, [open]);

  return (
    <SidebarMenuItem onMouseEnter={(e) => openFrom(e.currentTarget)} onMouseLeave={scheduleClose}>
      {trigger}
      {open &&
        createPortal(
          <nav
            ref={flyoutRef}
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
            {/* Inside the flyout the items are no longer in the icon rail: they
                show their labels (the portal escapes the rail's icon-collapse
                styling) and drop their own redundant icon-rail tooltips. */}
            <SidebarRailContext.Provider value={false}>
              <ul className="astw:flex astw:min-w-0 astw:flex-col astw:gap-0.5">{children}</ul>
            </SidebarRailContext.Provider>
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
    // The label span is CSS-hidden at icon width, so give the trigger an
    // explicit accessible name (the hover flyout's aria-label only mounts on
    // hover).
    const trigger = to ? (
      <SidebarMenuButton
        render={
          <Link
            to={to}
            aria-label={resolvedTitle}
            className={isActive ? "astw:bg-sidebar-accent astw:font-medium" : undefined}
          />
        }
      >
        {icon}
        <span>{resolvedTitle}</span>
      </SidebarMenuButton>
    ) : (
      <SidebarMenuButton render={<button type="button" aria-label={resolvedTitle} />}>
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
