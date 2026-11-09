import { type ReactNode, useContext, useEffect, useRef, useState } from "react";
import { useLocation, Link } from "react-router";
import { ChevronRight } from "lucide-react";
import { Collapsible } from "@base-ui/react/collapsible";
import { Popover } from "@base-ui/react/popover";
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
 * in a popover anchored to its right. Built on Base UI `Popover`, which owns
 * the positioning (with collision shifting), the hover open/close delays, the
 * outside-press and Escape dismissal, and focus: opening from the keyboard
 * moves focus into the flyout, closing it returns focus to the icon, and a
 * hover-opened flyout never touches focus.
 *
 * - With a mouse it opens on hover. A group with its own page keeps its link as
 *   the trigger, so a click goes to the page; the flyout only opens on hover.
 * - On a device that cannot hover (touch), the icon is a button that opens and
 *   closes it on tap, and the group's page is linked from the flyout heading.
 *
 * The flyout also closes when a page is opened from it. Its content runs under
 * an `expanded` sidebar context so the child items show labels and drop their
 * own icon-rail tooltips.
 */
const FLYOUT_POPUP_CLASS =
  "astw:z-(--z-popup) astw:max-h-[calc(100dvh-1rem)] astw:min-w-48 astw:overflow-y-auto astw:rounded-md astw:border astw:border-border astw:bg-popover astw:p-1 astw:text-popover-foreground astw:shadow-md astw:outline-none";
const FLYOUT_HEADING_CLASS =
  "astw:block astw:px-2 astw:py-1.5 astw:text-label-sm astw:text-muted-foreground";

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
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const itemRef = useRef<HTMLLIElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  // On a hover device the group's own page is the trigger's link.
  const linkTrigger = hasHover && to !== undefined;

  // Opening a page from the flyout closes it. `location.key` changes on every
  // navigation, including to the current page or a query/hash variant, which
  // `pathname` alone would miss. The flyout starts closed, so the run on mount
  // is a no-op.
  useEffect(() => {
    setOpen(false);
  }, [location.key]);

  const handleOpenChange = (next: boolean, details: Popover.Root.ChangeEventDetails) => {
    // Base UI closes on Escape pressed anywhere in the document. Only honour it
    // while focus is in the group or its flyout, so Escape in a text field or
    // the command palette does not dismiss a hover-opened flyout.
    if (!next && details.reason === "escape-key") {
      const active = document.activeElement;
      if (!itemRef.current?.contains(active) && !popupRef.current?.contains(active)) {
        details.cancel();
        // Let the keypress keep bubbling to whatever it was meant for.
        details.allowPropagation();
        return;
      }
    }
    // A link trigger navigates on press; the flyout opens on hover only.
    if (linkTrigger && details.reason === "trigger-press") {
      details.cancel();
      return;
    }
    setOpen(next);
  };

  return (
    <Popover.Root open={open} onOpenChange={handleOpenChange}>
      <SidebarMenuItem ref={itemRef}>
        {/* The label span is CSS-hidden at icon width, so the trigger gets an
            explicit accessible name (the flyout's aria-label only mounts while
            it is open). */}
        <Popover.Trigger
          openOnHover={hasHover}
          delay={0}
          closeDelay={150}
          nativeButton={!linkTrigger}
          // Base UI gives a non-native trigger `role="button"`; the link keeps its own role.
          role={linkTrigger ? "link" : undefined}
          aria-label={title}
          render={
            <SidebarMenuButton
              render={
                linkTrigger ? (
                  <Link to={to} aria-current={isActive ? "page" : undefined} />
                ) : (
                  <button type="button" />
                )
              }
              isActive={isActive}
            />
          }
        >
          <SidebarButtonIcon icon={icon} title={title} />
          <span>{title}</span>
        </Popover.Trigger>
      </SidebarMenuItem>
      {/* Same stacking recipe as BadgeList: the portal container forms the
          stacking context above the app, the popup carries the token. */}
      <Popover.Portal style={{ position: "relative", zIndex: "var(--z-popup)" }}>
        {/* Fixed, like the rail itself: an absolute popup would be laid out at
            the end of the document until positioned, so focusing it on a
            keyboard open scrolled the page down and back, and while open it
            stretched the document's scroll height. 8px from the viewport
            edges matches the 1rem the popup's max-height reserves. */}
        <Popover.Positioner
          side="right"
          align="start"
          sideOffset={8}
          collisionPadding={8}
          positionMethod="fixed"
        >
          <Popover.Popup
            ref={popupRef}
            aria-label={title}
            data-slot="sidebar-group-flyout"
            className={FLYOUT_POPUP_CLASS}
          >
            {/* A group with its own page links to it from the heading, so the
                page is reachable from the flyout on every device. */}
            {to ? (
              <Link
                to={to}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  FLYOUT_HEADING_CLASS,
                  "astw:rounded-sm astw:hover:text-foreground astw:focus-visible:outline-2 astw:focus-visible:outline-ring",
                )}
              >
                {title}
              </Link>
            ) : (
              <div className={FLYOUT_HEADING_CLASS}>{title}</div>
            )}
            {/* Inside the flyout the items are no longer in the icon rail: they
                show their labels (the popover escapes the rail's icon-collapse
                styling) and drop their own redundant icon-rail tooltips. */}
            <SidebarRailContext.Provider value={false}>
              <ul className="astw:flex astw:min-w-0 astw:flex-col astw:gap-0.5">{children}</ul>
            </SidebarRailContext.Provider>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
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
