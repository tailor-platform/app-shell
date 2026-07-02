import { useRef, useState } from "react";
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

  // Toggle a scroll-fade under the pinned breadcrumb once the content area
  // has scrolled, so content dissolves into the header instead of cutting off
  // abruptly. State only flips when crossing 0, so this doesn't re-render on
  // every scroll frame.
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrolled, setScrolled] = useState(false);
  const handleScroll = () => {
    const next = (scrollRef.current?.scrollTop ?? 0) > 0;
    setScrolled((prev) => (prev === next ? prev : next));
  };

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
          {/* Scroll-fade: once scrolled, a mask fades the top edge of the
              content to transparent so it dissolves into the pinned breadcrumb
              rather than cutting off. Masking (rather than overlaying a matching
              colour) reveals the real page backdrop — which is a theme gradient
              with `background-attachment: fixed`, so no single colour could
              match it — making the fade seamless on every theme. Only applied
              when scrolled, so content isn't faded at rest. */}
          <div
            ref={scrollRef}
            onScroll={handleScroll}
            data-scrolled={scrolled ? "" : undefined}
            className={cn(
              "astw:flex astw:flex-col astw:gap-4 astw:flex-1 astw:min-h-0 astw:overflow-y-auto",
              "astw:-mr-4 astw:pr-4",
              "astw:md:group-has-data-[variant=inset]/sidebar-wrapper:-mr-8 astw:md:group-has-data-[variant=inset]/sidebar-wrapper:pr-8",
              "astw:data-[scrolled]:[mask-image:linear-gradient(to_bottom,transparent,black_2rem)]",
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
