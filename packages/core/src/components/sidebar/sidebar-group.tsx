import {
  type MouseEvent,
  type ReactNode,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
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
} from "./primitives";
import { SidebarButtonIcon } from "./sidebar-button-icon";
import { useHasHover } from "@/hooks/use-has-hover";
import { cn } from "@/lib/utils";
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
 * swaps its inline collapsible submenu for a flyout. `SidebarRailContext` is
 * true wherever the sidebar renders as a collapsed icon rail, at any width.
 */
function useIsIconRail(): boolean {
  return useContext(SidebarRailContext);
}

/**
 * Flyout for a group in the icon rail: the group icon reveals its child pages
 * in a portaled popover. With a mouse it opens on hover. On a device that
 * cannot hover (touch), the icon is a button that opens and closes it on tap;
 * the flyout also closes on a tap outside, on Escape, and when a page in it is
 * opened. The popover is portaled to `document.body` so it escapes the rail's
 * `overflow-hidden`, and its content runs under an `expanded` sidebar context
 * so the child items show labels and drop their own icon-rail tooltips.
 */
const IconRailFlyout = ({
  icon,
  title,
  to,
  isActive,
  children,
}: {
  icon: ReactNode;
  title: string;
  to?: string;
  isActive: boolean;
  children: ReactNode;
}) => {
  const hasHover = useHasHover();
  const flyoutId = useId();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const itemRef = useRef<HTMLLIElement>(null);
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
  const toggle = () => {
    if (open) setOpen(false);
    else if (itemRef.current) openFrom(itemRef.current);
  };

  // Opening a page from the flyout closes it. Only a navigation after mount
  // counts, so this is a no-op on first render.
  const lastPathname = useRef(pathname);
  useEffect(() => {
    if (pathname !== lastPathname.current) {
      lastPathname.current = pathname;
      setOpen(false);
    }
  }, [pathname]);

  // While open: a pointer down outside the group and its flyout closes it (so a
  // tap on another group's icon closes this one as it opens that one), and
  // Escape closes it and returns focus to the group icon.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (itemRef.current?.contains(target) || flyoutRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      itemRef.current?.querySelector<HTMLElement>('[data-slot="sidebar-menu-button"]')?.focus();
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  // The label span is CSS-hidden at icon width, so the trigger gets an explicit
  // accessible name (the flyout's aria-label only mounts while it is open).
  // With a mouse the trigger is the group's link when it has one; without hover
  // it is always a button, because the tap is needed to open the flyout.
  const triggerAria = {
    "aria-label": title,
    "aria-expanded": open,
    "aria-controls": open ? flyoutId : undefined,
  };
  const trigger = (
    <SidebarMenuButton
      render={
        hasHover && to ? (
          <Link to={to} aria-current={isActive ? "page" : undefined} {...triggerAria} />
        ) : (
          <button type="button" {...triggerAria} />
        )
      }
      isActive={isActive}
      onClick={hasHover ? undefined : toggle}
    >
      <SidebarButtonIcon icon={icon} title={title} />
      <span>{title}</span>
    </SidebarMenuButton>
  );

  // Keep the flyout on screen: if a long menu (or one anchored low in the rail)
  // would spill past the viewport bottom, shift it up to fit. A menu taller than
  // the viewport is capped and scrolled by `max-h`/`overflow-y-auto` on the nav
  // below, so `offsetHeight` here is always something that can fit on screen.
  useLayoutEffect(() => {
    if (!open) return;
    const el = flyoutRef.current;
    if (!el) return;
    // Matches the 1rem the flyout's `max-h` reserves (0.5rem top + 0.5rem bottom).
    const margin = 8;
    const maxTop = window.innerHeight - el.offsetHeight - margin;
    setPos((p) => {
      const top = Math.max(margin, Math.min(p.top, maxTop));
      return top === p.top ? p : { ...p, top };
    });
  }, [open]);

  // Hover handlers only on a hover device: a touch tap also fires mouseenter,
  // which would open the flyout a moment before the tap's click toggles it shut.
  const hoverProps = hasHover
    ? {
        onMouseEnter: (e: MouseEvent<HTMLElement>) => openFrom(e.currentTarget),
        onMouseLeave: scheduleClose,
      }
    : {};
  const headingClass =
    "astw:block astw:px-2 astw:py-1.5 astw:text-label-sm astw:text-muted-foreground";

  return (
    <SidebarMenuItem ref={itemRef} {...hoverProps}>
      {trigger}
      {open &&
        createPortal(
          <nav
            ref={flyoutRef}
            id={flyoutId}
            data-slot="sidebar-group-flyout"
            aria-label={title}
            onMouseEnter={hasHover ? cancelClose : undefined}
            onMouseLeave={hasHover ? scheduleClose : undefined}
            style={{ top: pos.top, left: pos.left }}
            className="astw:fixed astw:z-(--z-popup) astw:max-h-[calc(100dvh-1rem)] astw:min-w-48 astw:overflow-y-auto astw:rounded-md astw:border astw:border-border astw:bg-popover astw:p-1 astw:text-popover-foreground astw:shadow-md"
          >
            {/* A group with its own page links to it from the heading, so the
                page is reachable from the flyout on every device. */}
            {to ? (
              <Link
                to={to}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  headingClass,
                  "astw:rounded-sm astw:hover:text-foreground astw:focus-visible:outline-2 astw:focus-visible:outline-ring",
                )}
              >
                {title}
              </Link>
            ) : (
              <div className={headingClass}>{title}</div>
            )}
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

  // Icon rail: swap the inline collapsible submenu for a flyout. The group icon
  // is the trigger; hovering it (or tapping it on a touch device) reveals the
  // child pages in a popover.
  if (isIconRail) {
    return (
      <IconRailFlyout icon={icon} title={resolvedTitle} to={to} isActive={isActive}>
        {children}
      </IconRailFlyout>
    );
  }

  // Render with clickable header (has `to` prop)
  if (to) {
    return (
      <Collapsible.Root render={<SidebarMenuItem />} defaultOpen={defaultOpen}>
        <SidebarMenuButton
          render={<Link to={to} aria-current={isActive ? "page" : undefined} />}
          isActive={isActive}
          tooltip={resolvedTitle}
        >
          <SidebarButtonIcon icon={icon} title={resolvedTitle} />
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
          <SidebarButtonIcon icon={icon} title={resolvedTitle} />
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
