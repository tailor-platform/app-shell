import { useEffect, type RefObject } from "react";

/** Scroll-gated freeze seams; shared by both adapters without owning their sizing. */
export function usePinShadows(containerRef: RefObject<HTMLDivElement | null>, layout: unknown) {
  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;
    const update = () => {
      const end = element.scrollWidth - element.clientWidth;
      element.toggleAttribute("data-pin-shadow-left", element.scrollLeft > 0);
      element.toggleAttribute("data-pin-shadow-right", element.scrollLeft < end - 1);
    };
    update();
    element.addEventListener("scroll", update, { passive: true });
    const observer = typeof ResizeObserver === "undefined" ? undefined : new ResizeObserver(update);
    observer?.observe(element);
    return () => {
      element.removeEventListener("scroll", update);
      observer?.disconnect();
    };
  }, [containerRef, layout]);
}
