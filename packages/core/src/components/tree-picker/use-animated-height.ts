import * as React from "react";

const RESIZE_DURATION_MS = 200;
const RESIZE_EASING = "cubic-bezier(0.2, 0, 0, 1)";

/**
 * Eases `outer`'s height when `inner`'s content grows or shrinks — rows
 * expanding, collapsing, or filtering — so the dialog resizes smoothly instead
 * of jumping. CSS can't transition a height change driven by content, so this
 * uses the native Web Animations API (no animation library). Skipped under
 * `prefers-reduced-motion`, and a no-op where `animate` or `ResizeObserver` is
 * unavailable (tests, old browsers).
 *
 * Takes the elements themselves (from callback refs held in state), so the
 * observer attaches whenever they mount — e.g. once a dialog's portal opens.
 */
export function useAnimatedHeight(outer: HTMLElement | null, inner: HTMLElement | null): void {
  React.useEffect(() => {
    if (!outer || !inner || typeof ResizeObserver === "undefined") return;
    if (typeof outer.animate !== "function") return;
    if (globalThis.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

    let last = outer.getBoundingClientRect().height;
    let running: Animation | null = null;

    const observer = new ResizeObserver(() => {
      // Mid-animation, start from where the height visibly is, not from the
      // previous target, so a quick expand-then-collapse doesn't jump.
      const from = running ? outer.getBoundingClientRect().height : last;
      running?.cancel();
      running = null;
      const to = outer.getBoundingClientRect().height;
      last = to;
      if (Math.abs(to - from) < 1) return;
      // Held out of flex sizing while it runs: a `flex: 1` item's zero basis
      // would otherwise override the animated height.
      const pinned = { flexGrow: 0, flexShrink: 0, flexBasis: "auto" };
      running = outer.animate(
        [
          { ...pinned, height: `${from}px` },
          { ...pinned, height: `${to}px` },
        ],
        {
          duration: RESIZE_DURATION_MS,
          easing: RESIZE_EASING,
        },
      );
      running.onfinish = () => {
        running = null;
      };
    });
    observer.observe(inner);

    return () => {
      observer.disconnect();
      running?.cancel();
    };
  }, [outer, inner]);
}
