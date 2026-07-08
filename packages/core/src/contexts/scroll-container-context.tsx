import { createContext, useContext, type RefObject } from "react";

/**
 * Holds a ref to the AppShell content scroll container. `null` when there is no
 * enclosing `SidebarLayout` (e.g. a fully custom layout), in which case the
 * hook hands back a stable empty ref rather than throwing.
 */
const AppShellScrollContainerContext = createContext<RefObject<HTMLElement | null> | null>(null);

export const AppShellScrollContainerProvider = AppShellScrollContainerContext.Provider;

// Stable fallback so the hook always returns a usable ref object, even when
// called outside a SidebarLayout. Its `current` stays `null` forever.
const EMPTY_SCROLL_REF: RefObject<HTMLElement | null> = { current: null };

/**
 * Ref to the AppShell **content scroll container** — the element that owns
 * vertical scrolling for page content.
 *
 * The shell is viewport-bounded (`h-svh`), so the document itself no longer
 * scrolls; the content area does. Use this wherever you would previously have
 * reached for `window`/document scroll — reading `scrollTop`, calling
 * `scrollTo`, attaching a `scroll` listener, or passing `root` to an
 * `IntersectionObserver`:
 *
 * ```tsx
 * const scrollRef = useAppShellScrollContainer();
 * useEffect(() => {
 *   const el = scrollRef.current;
 *   if (!el) return;
 *   const onScroll = () =>
 *     setProgress(el.scrollTop / (el.scrollHeight - el.clientHeight));
 *   el.addEventListener("scroll", onScroll, { passive: true });
 *   return () => el.removeEventListener("scroll", onScroll);
 * }, [scrollRef]);
 * ```
 *
 * The element mounts with the layout, above your page, so read `ref.current`
 * inside an effect (it is populated by the time effects run), not during
 * render.
 *
 * Notes:
 * - On a `<Layout fill>` page this element does not scroll — its children
 *   (e.g. a `DataTable`) manage their own scrolling.
 * - Outside a `SidebarLayout` the returned ref's `current` is always `null`.
 * - The same element carries a `data-appshell-scroll-container` attribute for
 *   non-React access (CSS, tests, `document.querySelector`).
 */
export function useAppShellScrollContainer(): RefObject<HTMLElement | null> {
  return useContext(AppShellScrollContainerContext) ?? EMPTY_SCROLL_REF;
}
