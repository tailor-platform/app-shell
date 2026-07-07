import { SidebarProvider, SidebarInset } from "@/components/sidebar";
import { AppShellOutlet } from "@/components/content";
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
          {/* overflow-y-auto: with the shell viewport-bounded (h-svh on the
              sidebar wrapper), this is where regular page content scrolls.
              Pages that pin their own chrome (e.g. <Layout fill> with a
              DataTable) size themselves to fit so this never scrolls.

              Full-bleed: break out of SidebarInset's right padding with a
              negative margin so the scrollbar sits at the window edge instead
              of floating ~32px in, then restore the same padding inside so
              content stays aligned with the breadcrumb header. The negative
              margin / padding pair mirrors SidebarInset's own responsive
              padding (px-4, → px-8 at md when the sidebar is the inset
              variant). */}
          {/* SPIKE (demo): scroll-fade with NO JS listener. A mask fades the top
              edge of the content so it dissolves into the pinned breadcrumb; the
              fade is driven by a scroll-driven animation (`scroll(self block)`
              timeline over the first 2rem of scroll) instead of an onScroll +
              useState toggle. Masking (alpha, not a matching colour) reveals the
              real theme-gradient backdrop, so it's seamless on every theme.
              Keyframes: `appshell-content-fade` in globals.css. */}
          <div
            className={cn(
              "astw:flex astw:flex-col astw:gap-4 astw:flex-1 astw:min-h-0 astw:overflow-y-auto",
              "astw:-mr-4 astw:pr-4",
              "astw:md:group-has-data-[variant=inset]/sidebar-wrapper:-mr-8 astw:md:group-has-data-[variant=inset]/sidebar-wrapper:pr-8",
              "astw:[animation:appshell-content-fade_auto_linear_both] astw:[animation-timeline:scroll(self_block)] astw:[animation-range:0_2rem]",
              // A `<Layout fill>` page bounds everything internally (its DataTable
              // scrolls on its own), so this area never needs to scroll. Clip
              // instead of scroll when it contains a fill layout — makes that an
              // explicit guarantee and removes any sub-pixel-overflow scrollbar.
              // (Also makes the scroll timeline inert on fill pages: no scroll
              // range ⇒ no fade.)
              "astw:has-data-[layout-fill]:overflow-hidden",
              // Reserve the scrollbar gutter so content doesn't shift sideways
              // when the bar appears/disappears across navigations (no-op with
              // overlay scrollbars; moot on fill pages where overflow is hidden).
              "astw:[scrollbar-gutter:stable]",
            )}
          >
            {Children ?? <AppShellOutlet />}
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}

// Namespaced building blocks for composing the default layout. `DefaultSidebar`
// remains available as a top-level export for backwards compatibility.
SidebarLayout.DefaultSidebar = DefaultSidebar;
SidebarLayout.DefaultHeader = DefaultHeader;
