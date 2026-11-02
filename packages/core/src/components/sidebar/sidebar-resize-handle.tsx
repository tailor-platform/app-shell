import * as React from "react";
import { cn } from "@/lib/utils";

export const DEFAULT_SIDEBAR_WIDTH = 256;
export const MIN_WIDTH = 192;
const MAX_WIDTH = 480;
const CLICK_SLOP = 8;
const RESISTANCE_GAIN = 0.25;
const SNAP_START = 0.75;
const COLLAPSE_EARLY_RATIO = 0.2;
const DRAG_WIDTH_PROPERTY = "--sidebar-drag-width";
const HANDLE_Y_PROPERTY = "--sidebar-handle-y";
const RESIZE_KEYS = new Set(["ArrowLeft", "ArrowRight", "Home", "End", "Enter", " "]);

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
  onOpenChange: (open: boolean) => void;
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
    top: number;
  } | null>(null);
  const collapsedSize = React.useRef<HTMLSpanElement>(null);
  const moved = React.useRef(false);
  const [dragOrigin, setDragOrigin] = React.useState<"collapsed" | "expanded" | null>(null);
  // Pointer-down focuses the handle so the arrow keys work afterwards, and browsers treat that as
  // :focus-visible; track the source so the indicator shows for keyboard focus only.
  const [focusSource, setFocusSource] = React.useState<"keyboard" | "pointer" | null>(null);
  const resizing = dragOrigin !== null;
  const insetHandle = (dragOrigin ?? (collapsed ? "collapsed" : "expanded")) === "collapsed";
  const direction = side === "left" ? 1 : -1;
  const resize = (next: number) => {
    onWidthChange(Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, next)));
    if (next <= MIN_WIDTH) onOpenChange(false);
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
        collapsed
          ? "Drag or double-click to expand sidebar"
          : "Drag or use arrow keys to resize sidebar; double-click to reset or collapse"
      }
      data-slot="sidebar-resize-handle"
      data-resizing={resizing}
      data-focus={focusSource ?? undefined}
      className={cn(
        "astw:group/resize astw:absolute astw:inset-y-0 astw:z-(--z-sidebar-rail) astw:w-5 astw:touch-none astw:select-none astw:outline-none",
        // 6px over the sidebar, 14px over the content so the pill beside the border stays hoverable.
        side === "left" ? "astw:-right-3.5" : "astw:-left-3.5",
        !collapsed && "astw:cursor-ew-resize",
        collapsed && side === "left" && "astw:cursor-e-resize",
        collapsed && side === "right" && "astw:cursor-w-resize",
        insetHandle && side === "left" && "astw:group-data-[resize-mode=offcanvas]:translate-x-1/2",
        insetHandle &&
          side === "right" &&
          "astw:group-data-[resize-mode=offcanvas]:-translate-x-1/2",
      )}
      onClick={(event) => {
        // Double-click toggles through the default width: collapsed → 256px, any other width →
        // 256px, 256px → collapsed. Enter/Space (detail 0) still expands the collapsed handle.
        const doubleClick = event.detail === 2 && !moved.current;
        if (collapsed) {
          if (event.detail === 0 || doubleClick) onOpenChange(true);
        } else if (doubleClick) {
          if (width === DEFAULT_SIDEBAR_WIDTH) onOpenChange(false);
          else onWidthChange(DEFAULT_SIDEBAR_WIDTH);
        }
      }}
      onPointerDown={(event) => {
        if (event.button !== 0 || !event.isPrimary || !sidebarRef.current) return;
        moved.current = false;
        event.preventDefault();
        event.currentTarget.focus();
        setFocusSource("pointer");
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
          top: event.currentTarget.getBoundingClientRect().top,
        };
        sidebarRef.current.style.setProperty(DRAG_WIDTH_PROPERTY, `${startWidth}px`);
        setDragOrigin(collapsed ? "collapsed" : "expanded");
      }}
      // A window switch blurs and refocuses the handle; keep the source it had.
      onFocus={() => setFocusSource((source) => source ?? "keyboard")}
      onBlur={(event) => {
        if (document.activeElement === event.currentTarget) return;
        event.currentTarget.style.removeProperty(HANDLE_Y_PROPERTY);
        setFocusSource(null);
      }}
      onPointerMove={(event) => {
        const start = drag.current;
        // Keep the pill under the pointer; like the drag width, this bypasses React. The strip's
        // top is fixed during a drag, so use the value measured on pointer-down rather than
        // forcing layout after each width write.
        const top = start?.top ?? event.currentTarget.getBoundingClientRect().top;
        event.currentTarget.style.setProperty(HANDLE_Y_PROPERTY, `${event.clientY - top}px`);
        if (!start || event.pointerId !== start.pointerId) return;
        const delta = (event.clientX - start.x) * direction;
        if (Math.abs(delta) > CLICK_SLOP) moved.current = true;
        const pointerWidth = start.width + delta;
        const collapseAt =
          start.collapsedWidth + (MIN_WIDTH - start.collapsedWidth) * COLLAPSE_EARLY_RATIO;
        const nextWidth = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, pointerWidth));
        let nextCollapsed = collapsed;
        if (collapsed && pointerWidth >= MIN_WIDTH) {
          nextCollapsed = false;
          onOpenChange(true);
          onWidthChange(nextWidth);
        }
        if (!collapsed && pointerWidth <= collapseAt) {
          nextCollapsed = true;
          moved.current = true;
          start.collapseAt = collapseAt;
          onOpenChange(false);
          onWidthChange(nextWidth);
        }
        start.nextWidth = nextWidth;
        const visualWidth = getSidebarDragWidth(
          pointerWidth,
          start.collapsedWidth,
          collapsed,
          collapsed ? start.collapseAt : collapseAt,
        );
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
        // Only the handle's own keys count, so shortcuts pressed after a drag keep the pointer look.
        if (!RESIZE_KEYS.has(event.key)) return;
        setFocusSource("keyboard");
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
      {/* Hidden until the edge is hovered, focused or dragged; sits 4px outside the 2px edge (see
          Sidebar) and follows the pointer, centred when focused by keyboard. */}
      <span
        aria-hidden="true"
        data-slot="sidebar-resize-indicator"
        className={cn(
          // Slides out from the border as it fades in.
          side === "left" ? "astw:left-3 astw:-translate-x-1" : "astw:right-3 astw:translate-x-1",
          "astw:pointer-events-none astw:absolute astw:top-[clamp(1rem,var(--sidebar-handle-y,50%),calc(100%_-_1rem))] astw:h-8 astw:w-1 astw:-translate-y-1/2 astw:rounded-full astw:bg-muted-foreground/40 astw:opacity-0 astw:transition-[opacity,translate] astw:duration-150 astw:ease-out astw:motion-reduce:transition-opacity astw:group-hover/resize:translate-x-0 astw:group-hover/resize:opacity-100 astw:group-data-[focus=keyboard]/resize:translate-x-0 astw:group-data-[focus=keyboard]/resize:opacity-100 astw:group-data-[focus=keyboard]/resize:bg-ring astw:group-data-[resizing=true]/resize:bg-muted-foreground/70 astw:group-data-[resizing=true]/resize:translate-x-0 astw:group-data-[resizing=true]/resize:opacity-100",
        )}
      />
    </button>
  );
}
