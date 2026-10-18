// The rail's narrow-screen form: a left sheet behind a "Filters" button.
//
// "Always visible" cannot hold below `lg` — the left column would either eat
// the table or push every row off the fold. Like the Sidebar, the rail detects
// this itself: apps write no breakpoint code. The active count on the button
// keeps "is anything filtering?" answered without opening anything.
//
// The button is `FilterRail.Trigger`, placed wherever the app wants (inside
// `FilterRail.Provider`). If the app places none, `FilterRail.Root` renders a
// fallback button in its own spot, so the filters are never unreachable.

import { useLayoutEffect, useSyncExternalStore, type ReactNode } from "react";
import { SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "../button";
import { useFilterRailContext } from "./filter-rail-context";
import { useFilterRailT } from "./i18n";

/** Below Tailwind's `lg`, where `Layout` stops placing columns side by side. */
const COMPACT_QUERY = "(max-width: 1023.98px)";

const subscribe = (onChange: () => void) => {
  if (typeof window === "undefined" || !window.matchMedia) return () => {};
  const list = window.matchMedia(COMPACT_QUERY);
  list.addEventListener("change", onChange);
  return () => list.removeEventListener("change", onChange);
};

const getSnapshot = () =>
  typeof window !== "undefined" && window.matchMedia?.(COMPACT_QUERY).matches === true;

/**
 * Internal. A media query rather than CSS: rendering the rail twice and hiding
 * one copy would duplicate every input in the accessibility tree. The server
 * snapshot is "wide", so server and first client render agree.
 */
export const useIsCompact = (): boolean =>
  useSyncExternalStore(subscribe, getSnapshot, () => false);

// ─── Button ──────────────────────────────────────────────────────────────────

type TriggerButtonProps = {
  children?: ReactNode;
  className?: string;
};

/** The visual button, shared by `FilterRail.Trigger` and Root's fallback. */
export function TriggerButton({ children, className }: TriggerButtonProps) {
  const t = useFilterRailT();
  const { activeCount, setSheetOpen } = useFilterRailContext("Trigger");
  const label = children ?? t("title");
  const text = typeof label === "string" ? label : t("title");
  return (
    <Button
      data-slot="filter-rail-trigger"
      variant="outline"
      size="sm"
      onClick={() => setSheetOpen(true)}
      aria-label={activeCount > 0 ? t("activeCount", { label: text, count: activeCount }) : text}
      className={cn("astw:self-start", className)}
    >
      <SlidersHorizontal className="astw:size-3.5" aria-hidden />
      {label}
      {activeCount > 0 && (
        <span
          aria-hidden
          className="astw:ml-0.5 astw:rounded-full astw:bg-primary astw:px-1.5 astw:text-xs astw:font-medium astw:text-primary-foreground astw:tabular-nums"
        >
          {activeCount}
        </span>
      )}
    </Button>
  );
}

type TriggerProps = TriggerButtonProps;

/**
 * Opens the rail on narrow screens, carrying the active filter count. Place it
 * anywhere inside `FilterRail.Provider` — a table toolbar, a page header. It
 * renders nothing on wide screens, where the rail is already visible, and while
 * it is mounted `FilterRail.Root` skips its own fallback button.
 */
function Trigger({ children, className }: TriggerProps) {
  const { compact, registerTrigger } = useFilterRailContext("Trigger");
  // Layout effect, so the fallback button never paints for a frame first.
  useLayoutEffect(() => registerTrigger(), [registerTrigger]);
  if (!compact) return null;
  return <TriggerButton className={className}>{children}</TriggerButton>;
}
Trigger.displayName = "FilterRail.Trigger";

export { Trigger };
export type { TriggerProps };
