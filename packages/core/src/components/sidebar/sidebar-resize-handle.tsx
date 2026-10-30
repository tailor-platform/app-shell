import * as React from "react";
import { GripVerticalIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export const DEFAULT_SIDEBAR_WIDTH = 256;
export const MIN_WIDTH = 192;
const MAX_WIDTH = 480;
const CLICK_SLOP = 8;
const RESISTANCE_GAIN = 0.25;
const SNAP_START = 0.75;
const COLLAPSE_EARLY_RATIO = 0.2;
const DRAG_WIDTH_PROPERTY = "--sidebar-drag-width";

export function getSidebarDragWidth(
  pointerWidth: number,
  collapsedWidth: number,
  collapsed: boolean,
  collapseAt = collapsedWidth,
) {
  if (pointerWidth >= MIN_WIDTH || collapsedWidth >= MIN_WIDTH) {
    return Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, pointerWidth));
  }
  const progress = Math.max(0, (pointerWidth - collapseAt) / (MIN_WIDTH - collapseAt));
  const t = collapsed ? progress : 1 - progress;
  const resisted =
    ((t * (MIN_WIDTH - collapseAt)) / (MIN_WIDTH - collapsedWidth)) * RESISTANCE_GAIN;
  const snap = Math.max(0, (t - SNAP_START) / (1 - SNAP_START));
  // Keep a low gain in the resistance zone; blend to 1:1 only near the opposite edge.
  const blend = snap * snap * (3 - 2 * snap);
  const eased = resisted + (t - resisted) * blend;
  return collapsedWidth + (MIN_WIDTH - collapsedWidth) * (collapsed ? eased : 1 - eased);
}

export function SidebarResizeHandle({
  width,
  onWidthChange,
  sidebarRef,
  onOpenChange,
  collapsed = false,
  side,
}: {
  width: number;
  onWidthChange: (width: number) => void;
  sidebarRef: React.RefObject<HTMLDivElement | null>;
  onOpenChange?: (open: boolean) => void;
  collapsed?: boolean;
  side: "left" | "right";
}) {
  const drag = React.useRef<{
    pointerId: number;
    x: number;
    width: number;
    collapsedWidth: number;
    collapseAt: number;
    nextWidth: number;
    sidebar: HTMLDivElement;
  } | null>(null);
  const collapsedSize = React.useRef<HTMLSpanElement>(null);
  const moved = React.useRef(false);
  const [dragOrigin, setDragOrigin] = React.useState<"collapsed" | "expanded" | null>(null);
  const resizing = dragOrigin !== null;
  const insetHandle = (dragOrigin ?? (collapsed ? "collapsed" : "expanded")) === "collapsed";
  const direction = side === "left" ? 1 : -1;
  const resize = (next: number) => {
    onWidthChange(Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, next)));
    if (next <= MIN_WIDTH) onOpenChange?.(false);
  };
  const clearDrag = () => {
    drag.current?.sidebar.style.removeProperty(DRAG_WIDTH_PROPERTY);
    drag.current = null;
    setDragOrigin(null);
  };
  const stopResizing = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (event.pointerId !== drag.current?.pointerId) return;
    onWidthChange(drag.current.nextWidth);
    clearDrag();
  };

  React.useEffect(
    () => () => {
      const active = drag.current;
      if (!active) return;
      active.sidebar.style.removeProperty(DRAG_WIDTH_PROPERTY);
      drag.current = null;
      setDragOrigin(null);
      onWidthChange(active.nextWidth);
    },
    [onWidthChange],
  );

  return (
    <button
      type="button"
      // eslint-disable-next-line jsx-a11y/prefer-tag-over-role -- Unlike a static hr, this splitter is a keyboard/pointer control.
      role={collapsed ? undefined : "separator"}
      aria-label={collapsed ? "Expand sidebar" : "Resize sidebar"}
      aria-expanded={collapsed ? false : undefined}
      aria-orientation={collapsed ? undefined : "vertical"}
      aria-valuemin={collapsed ? undefined : MIN_WIDTH}
      aria-valuemax={collapsed ? undefined : MAX_WIDTH}
      aria-valuenow={collapsed ? undefined : width}
      aria-valuetext={collapsed ? undefined : `${width} pixels`}
      title={
        collapsed ? "Drag or click to expand sidebar" : "Drag or use arrow keys to resize sidebar"
      }
      data-slot="sidebar-resize-handle"
      data-resizing={resizing}
      className={cn(
        "astw:group/resize astw:absolute astw:top-1/2 astw:z-(--z-sidebar-rail) astw:flex astw:h-10 astw:w-6 astw:-translate-y-1/2 astw:touch-none astw:select-none astw:items-center astw:justify-center astw:outline-none",
        side === "left" ? "astw:-right-3" : "astw:-left-3",
        !collapsed && "astw:cursor-col-resize",
        collapsed && side === "left" && "astw:cursor-e-resize",
        collapsed && side === "right" && "astw:cursor-w-resize",
        insetHandle && side === "left" && "astw:group-data-[resize-mode=offcanvas]:translate-x-1/2",
        insetHandle &&
          side === "right" &&
          "astw:group-data-[resize-mode=offcanvas]:-translate-x-1/2",
      )}
      onClick={(event) => {
        if (collapsed && (event.detail === 0 || !moved.current)) onOpenChange?.(true);
      }}
      onPointerDown={(event) => {
        if (event.button !== 0 || !event.isPrimary || !sidebarRef.current) return;
        moved.current = false;
        event.preventDefault();
        event.currentTarget.focus();
        event.currentTarget.setPointerCapture(event.pointerId);
        const collapsedWidth = collapsedSize.current!.getBoundingClientRect().width;
        const startWidth = collapsed ? collapsedWidth : width;
        drag.current = {
          pointerId: event.pointerId,
          x: event.clientX,
          width: startWidth,
          collapsedWidth,
          collapseAt: collapsedWidth,
          nextWidth: width,
          sidebar: sidebarRef.current,
        };
        sidebarRef.current.style.setProperty(DRAG_WIDTH_PROPERTY, `${startWidth}px`);
        setDragOrigin(collapsed ? "collapsed" : "expanded");
      }}
      onPointerMove={(event) => {
        const start = drag.current;
        if (!start || event.pointerId !== start.pointerId) return;
        const delta = (event.clientX - start.x) * direction;
        if (Math.abs(delta) > CLICK_SLOP) moved.current = true;
        const pointerWidth = start.width + delta;
        const collapseAt =
          start.collapsedWidth + (MIN_WIDTH - start.collapsedWidth) * COLLAPSE_EARLY_RATIO;
        const nextWidth = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, pointerWidth));
        let nextCollapsed = collapsed;
        if (collapsed && pointerWidth >= MIN_WIDTH && onOpenChange) {
          nextCollapsed = false;
          onOpenChange(true);
          onWidthChange(nextWidth);
        }
        if (!collapsed && pointerWidth <= collapseAt && onOpenChange) {
          nextCollapsed = true;
          moved.current = true;
          start.collapseAt = collapseAt;
          onOpenChange(false);
          onWidthChange(nextWidth);
        }
        start.nextWidth = nextWidth;
        const visualWidth = onOpenChange
          ? getSidebarDragWidth(
              pointerWidth,
              start.collapsedWidth,
              collapsed,
              collapsed ? start.collapseAt : collapseAt,
            )
          : nextWidth;
        // Transient pixels bypass React; commit only mode changes and the final width.
        start.sidebar.style.setProperty(DRAG_WIDTH_PROPERTY, `${visualWidth}px`);
        if (!nextCollapsed) {
          event.currentTarget.setAttribute("aria-valuenow", String(nextWidth));
          event.currentTarget.setAttribute("aria-valuetext", `${nextWidth} pixels`);
        }
      }}
      onPointerUp={stopResizing}
      onPointerCancel={stopResizing}
      onLostPointerCapture={stopResizing}
      onKeyDown={(event) => {
        if (collapsed) return;
        const currentWidth = drag.current?.nextWidth ?? width;
        switch (event.key) {
          case "ArrowLeft":
            resize(currentWidth - 16 * direction);
            break;
          case "ArrowRight":
            resize(currentWidth + 16 * direction);
            break;
          case "Home":
            resize(MIN_WIDTH);
            break;
          case "End":
            resize(MAX_WIDTH);
            break;
          default:
            return;
        }
        clearDrag();
        event.preventDefault();
      }}
    >
      {/* Measure the theme-sized rail instead of assuming a 16px root font. */}
      <span
        ref={collapsedSize}
        aria-hidden="true"
        data-slot="sidebar-collapsed-size"
        className="astw:pointer-events-none astw:invisible astw:absolute astw:h-0 astw:w-[var(--sidebar-collapsed-width,0px)]"
      />
      <span className="astw:relative astw:z-10 astw:flex astw:h-8 astw:w-3 astw:items-center astw:justify-center astw:rounded-sm astw:border astw:border-border astw:bg-background astw:text-muted-foreground astw:shadow-xs astw:group-hover/resize:border-ring astw:group-focus-visible/resize:ring-2 astw:group-focus-visible/resize:ring-ring astw:group-data-[resizing=true]/resize:border-ring">
        <GripVerticalIcon aria-hidden="true" className="astw:size-3 astw:shrink-0" />
      </span>
    </button>
  );
}
