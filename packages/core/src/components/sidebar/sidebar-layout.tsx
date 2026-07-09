import { useRef, type RefObject } from "react";
import { SidebarProvider, SidebarInset } from "@/components/sidebar";
import { AppShellOutlet } from "@/components/content";
import { AppShellScrollContainerProvider } from "@/contexts/scroll-container-context";
import { DefaultSidebar } from "./default-sidebar";
import { DefaultHeader } from "./default-header";
import { cn } from "@/lib/utils";

export type SidebarLayoutProps = {
  /**
   * Custom content renderer.
   *
   * @example
   * ```tsx
   * <SidebarLayout>
   *   {({ Outlet }) => (
   *     <>
   *       <CustomHeader />
   *       <Outlet />
   *       <CustomFooter />
   *     </>
   *   )}
   * </SidebarLayout>
   * ```
   */
  children?: (props: { Outlet: () => React.ReactNode }) => React.ReactNode;

  /**
   * Custom sidebar content. Replaces the whole sidebar region.
   *
   * @default <SidebarLayout.DefaultSidebar />
   * @example
   * ```tsx
   * <SidebarLayout sidebar={<MyCustomSidebar />} />
   * ```
   */
  sidebar?: React.ReactNode;

  /**
   * Custom header content. Replaces the whole top-bar region.
   *
   * Omit it for the built-in header. To slightly extend the built-in header
   * (e.g. add a notification bell), pass `<SidebarLayout.DefaultHeader />` with
   * its `actions` slot rather than reconstructing the header from scratch.
   *
   * @default <SidebarLayout.DefaultHeader />
   * @example
   * ```tsx
   * // Extend the built-in header:
   * <SidebarLayout
   *   header={
   *     <SidebarLayout.DefaultHeader
   *       actions={[<NotificationBell key="bell" />, <AppearanceSwitcher key="appearance" />]}
   *     />
   *   }
   * />
   *
   * // Or replace it entirely:
   * <SidebarLayout header={<MyCustomHeader />} />
   * ```
   */
  header?: React.ReactNode;

  /**
   * Whether the sidebar is open by default on desktop.
   *
   * @default true
   */
  defaultOpen?: boolean;

  /**
   * Whether the sidebar can be collapsed.
   * When set to `false`, the sidebar is always visible and cannot be toggled.
   * `defaultOpen` is ignored when this is `false`.
   *
   * @default true
   */
  collapsible?: boolean;
};

export function SidebarLayout(props: SidebarLayoutProps) {
  const Children = props.children ? props.children({ Outlet: AppShellOutlet }) : null;
  // Handle to the content scroll region, exposed to pages via
  // `useAppShellScrollContainer()`. The shell is viewport-bounded, so this is
  // the element that scrolls page content (what `window` used to be).
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  return (
    <SidebarProvider
      defaultOpen={props.defaultOpen}
      collapsible={props.collapsible}
      className="astw:flex astw:flex-col"
    >
      <div className="astw:flex astw:flex-1 astw:min-h-0">
        {props.sidebar ?? <DefaultSidebar />}
        <SidebarInset className="astw:w-[calc(100%-var(--sidebar-width))]">
          {props.header ?? <DefaultHeader />}
          {/* Content scroll region. The shell is viewport-bounded (h-svh on the
              sidebar wrapper), so regular pages scroll here; pages that pin
              their own chrome (e.g. <Layout fill> with a DataTable) size to fit
              and don't scroll this area. Exposed to pages via
              `useAppShellScrollContainer()` and the `data-appshell-scroll-container`
              marker — the supported handle for what used to be `window` scroll. */}
          <AppShellScrollContainerProvider
            value={scrollContainerRef as RefObject<HTMLElement | null>}
          >
            <div
              ref={scrollContainerRef}
              data-appshell-scroll-container=""
              className={cn(
                "astw:flex astw:flex-col astw:gap-4 astw:flex-1 astw:min-h-0 astw:overflow-y-auto",
                // Full-bleed: break out of SidebarInset's right padding so the
                // scrollbar sits at the window edge, then restore the padding
                // inside so content stays aligned with the header. Mirrors
                // SidebarInset's responsive padding (px-4 → px-8 at md for the
                // inset variant).
                "astw:-mr-4 astw:pr-4",
                "astw:md:group-has-data-[variant=inset]/sidebar-wrapper:-mr-8 astw:md:group-has-data-[variant=inset]/sidebar-wrapper:pr-8",
                // Scroll-fade: a scroll-driven animation masks the top edge as
                // content scrolls under the pinned header, ramping over the first
                // 2rem then holding. The alpha mask reveals the real themed
                // backdrop; keyframes live in globals.css. No JS scroll listener.
                "astw:[animation:appshell-content-fade_auto_linear_both] astw:[animation-timeline:scroll(self_block)] astw:[animation-range:0_2rem]",
                // A <Layout fill> page bounds everything internally, so this area
                // never needs to scroll: clip instead. This also makes the fade
                // inert (no scroll range) and avoids any sub-pixel-overflow bar.
                "astw:has-data-[layout-fill]:overflow-hidden",
                // Reserve the scrollbar gutter so content doesn't shift when the
                // bar toggles across navigations (no-op with overlay scrollbars).
                "astw:[scrollbar-gutter:stable]",
              )}
            >
              {Children ?? <AppShellOutlet />}
            </div>
          </AppShellScrollContainerProvider>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}

// Namespaced building blocks for composing the default layout. `DefaultSidebar`
// remains available as a top-level export for backwards compatibility.
SidebarLayout.DefaultSidebar = DefaultSidebar;
SidebarLayout.DefaultHeader = DefaultHeader;
