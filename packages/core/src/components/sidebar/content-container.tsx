import { useRef, type RefObject } from "react";
import { SidebarInset } from "@/components/sidebar";
import { AppShellScrollContainerProvider } from "@/contexts/scroll-container-context";
import { cn } from "@/lib/utils";

export type ContentContainerProps = {
  /**
   * Pinned chrome rendered above the scroll region — it stays put while the
   * content below it scrolls. Pass `<SidebarLayout.DefaultHeader />` for the
   * built-in top bar, your own node to replace it, or omit it entirely for a
   * bare content column.
   */
  header?: React.ReactNode;

  /** Extra classes for the content column itself (the `<main>` element). */
  className?: string;

  /** Scrolling page content. Usually `<SidebarLayout.Outlet />`. */
  children?: React.ReactNode;
};

/**
 * ContentContainer — the stock AppShell content column.
 *
 * This is what `SidebarLayout` renders beside the sidebar by default: the
 * padded `<main>` inset, a pinned `header` slot, and the scroll region that
 * owns vertical scrolling for page content (and backs
 * `useAppShellScrollContainer()`).
 *
 * You only reach for it directly when using the `body` slot to lay out your own
 * columns — drop it in among them and the main column keeps its normal inset
 * chrome and scroll behaviour, instead of you rebuilding both by hand.
 *
 * @example
 * ```tsx
 * <SidebarLayout
 *   body={
 *     <>
 *       <TableOfContents />
 *       <SidebarLayout.ContentContainer header={<SidebarLayout.DefaultHeader />}>
 *         <SidebarLayout.Outlet />
 *       </SidebarLayout.ContentContainer>
 *       <AssistantPanel />
 *     </>
 *   }
 * />
 * ```
 */
export function ContentContainer({ header, className, children }: ContentContainerProps) {
  // Handle to the content scroll region, exposed to pages via
  // `useAppShellScrollContainer()`. The shell is viewport-bounded, so this is
  // the element that scrolls page content (what `window` used to be).
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  return (
    <SidebarInset className={className}>
      {header}
      {/* Content scroll region. The shell is viewport-bounded (h-svh on the
          sidebar wrapper), so regular pages scroll here; pages that pin
          their own chrome (e.g. <Layout fill> with a DataTable) size to fit
          and don't scroll this area. Exposed to pages via
          `useAppShellScrollContainer()` and the `data-appshell-scroll-container`
          marker — the supported handle for what used to be `window` scroll. */}
      <AppShellScrollContainerProvider value={scrollContainerRef as RefObject<HTMLElement | null>}>
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
          {children}
        </div>
      </AppShellScrollContainerProvider>
    </SidebarInset>
  );
}
ContentContainer.displayName = "SidebarLayout.ContentContainer";
