import * as React from "react";

/** How long a sidebar scroll area's scrollbar stays visible after the last scroll. */
const SCROLLBAR_HIDE_DELAY = 800;

/**
 * Classes for a scroll area in the sidebar (the item list and the icon rail's
 * flyout). Pair them with `useScrolling`, setting `data-scrolling` from it.
 *
 * - A thin scrollbar with no track, visible only while `data-scrolling` is set,
 *   like an overlay scrollbar, so it doesn't draw a stripe down the list at rest.
 * - A bottom fade while there is more to scroll, mirroring the content area's
 *   top fade: it clears over the last 2rem of scroll, and a list that fits has
 *   no scroll range, so no fade. Keyframes live in globals.css.
 * - Scroll padding as tall as the fade, so an item scrolled into view by
 *   keyboard focus stops clear of it.
 */
export const SIDEBAR_SCROLL_AREA_CLASS = [
  "astw:[scrollbar-width:thin] astw:[scrollbar-color:transparent_transparent]",
  "astw:data-scrolling:[scrollbar-color:color-mix(in_oklab,var(--muted-foreground)_45%,transparent)_transparent]",
  "astw:[animation:appshell-sidebar-fade_auto_linear_both] astw:[animation-timeline:scroll(self_block)] astw:[animation-range:calc(100%_-_2rem)_100%]",
  "astw:scroll-pb-8",
].join(" ");

/**
 * Whether the element is scrolling: true from a scroll event until
 * `SCROLLBAR_HIDE_DELAY` after the last one. Spread `onScroll` on the scroll
 * area and set `data-scrolling={scrolling || undefined}`.
 */
export function useScrolling() {
  const [scrolling, setScrolling] = React.useState(false);
  const hideTimer = React.useRef<ReturnType<typeof setTimeout>>(undefined);
  React.useEffect(() => () => clearTimeout(hideTimer.current), []);

  const onScroll = React.useCallback(() => {
    setScrolling(true);
    clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setScrolling(false), SCROLLBAR_HIDE_DELAY);
  }, []);

  return { scrolling, onScroll };
}
