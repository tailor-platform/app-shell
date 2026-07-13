import * as React from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

type TimeValue = Date | number;
type Anchor = "start" | "center" | "end";

/**
 * A labeled time range rendered inside an axis level.
 *
 * Use spans for "timeboxes" such as months, half-hours, sprints, or any
 * other interval that should be labeled between boundary guides.
 */
export interface TimelineAxisSpan {
  /** Stable React key. Falls back to a start/end-based key when omitted. */
  key?: React.Key;
  /** Start of the timebox. Accepts a `Date` or a millisecond timestamp. */
  start: TimeValue;
  /** End of the timebox. Accepts a `Date` or a millisecond timestamp. */
  end: TimeValue;
  /** Label rendered inside the span. */
  label?: React.ReactNode;
  /** Optional class applied to the positioned span element. */
  className?: string;
  /** Optional inline style applied to the positioned span element. */
  style?: React.CSSProperties;
}

/**
 * A labeled point in an axis level.
 *
 * Ticks are useful for point-in-time labels such as milestones or specific
 * timestamps. For boxed labels between boundaries, prefer `TimelineAxisSpan`.
 */
export interface TimelineAxisTick {
  /** Stable React key. Falls back to an `at`-based key when omitted. */
  key?: React.Key;
  /** Point in time represented by this tick. */
  at: TimeValue;
  /** Label rendered for the tick. */
  label?: React.ReactNode;
  /**
   * Optional custom label position.
   *
   * Defaults to `at`. Use this when the tick represents one time but its label
   * should be positioned elsewhere.
   */
  labelAt?: TimeValue;
  /** Optional class applied to the tick container. */
  className?: string;
  /** Optional inline style applied to the tick container. */
  style?: React.CSSProperties;
}

/**
 * A vertical guide line projected onto the axis and/or the timeline body.
 *
 * Guides are the timeline's "boundaries". Apps usually derive them from their
 * own scale logic, then pair them with axis spans to label the ranges between
 * those boundaries.
 */
export interface TimelineGuide {
  /** Stable React key. Falls back to an `at`-based key when omitted. */
  key?: React.Key;
  /** Time position for the guide line. */
  at: TimeValue;
  /** Optional class applied to the guide inside the axis area. */
  axisClassName?: string;
  /** Optional inline style applied to the guide inside the axis area. */
  axisStyle?: React.CSSProperties;
  /** Optional class applied to the guide inside the body area. */
  bodyClassName?: string;
  /** Optional inline style applied to the guide inside the body area. */
  bodyStyle?: React.CSSProperties;
}

type TimelineAxisLevelBase = {
  /** Height of this axis level in pixels. Defaults to `28`. */
  height?: number;
  /** Optional class applied to the level container. */
  className?: string;
};

/**
 * One stacked axis level.
 *
 * Levels let an app compose multi-level headers such as year → month or a
 * single timebox row such as half-hour slots.
 */
export type TimelineAxisLevel =
  | (TimelineAxisLevelBase & {
      /** Interval labels rendered across a time range. */
      kind: "spans";
      /** Span items to render in this level. */
      items: TimelineAxisSpan[];
      /** Optional class applied to every span in the level. */
      itemClassName?: string;
      /** Optional style applied to every span in the level. */
      itemStyle?: React.CSSProperties;
    })
  | (TimelineAxisLevelBase & {
      /** Point labels rendered at specific times. */
      kind: "ticks";
      /** Tick items to render in this level. */
      items: TimelineAxisTick[];
      /** Horizontal anchor used when placing each tick label. */
      labelAlign?: Anchor;
    });

/**
 * Axis configuration owned by `Timeline.Viewport`.
 *
 * Example:
 * ```tsx
 * axis={{
 *   guides: boundaries.map((at) => ({
 *     at,
 *     axisStyle: { background: "var(--border)" },
 *     bodyStyle: { background: "var(--border)" },
 *   })),
 *   levels: [
 *     {
 *       kind: "spans",
 *       items: timeboxes,
 *     },
 *   ],
 * }}
 * ```
 */
export interface TimelineAxis {
  /** Boundary lines rendered in the axis and/or body. */
  guides?: TimelineGuide[];
  /** Stacked header levels rendered above the body. Defaults to `[]` when omitted. */
  levels?: TimelineAxisLevel[];
  /** Optional class applied to the axis container. */
  className?: string;
}

/**
 * A decorative band rendered behind the timeline body.
 *
 * Useful for blackout windows, maintenance ranges, release freezes, or any
 * other highlighted interval.
 */
export interface TimelineBand {
  /** Stable React key. Falls back to a start/end-based key when omitted. */
  key?: React.Key;
  /** Start of the band. */
  start: TimeValue;
  /** End of the band. */
  end: TimeValue;
  /** Optional background color convenience prop. */
  color?: string;
  /** Optional class applied to the band element. */
  className?: string;
  /** Optional inline style applied to the band element. */
  style?: React.CSSProperties;
}

/**
 * A decorative vertical marker rendered in the axis and/or body.
 */
export interface TimelineMarker {
  /** Stable React key. Falls back to an `at`-based key when omitted. */
  key?: React.Key;
  /** Time position for the marker. */
  at: TimeValue;
  /** Optional line color convenience prop. */
  color?: string;
  /** Optional marker label. */
  label?: React.ReactNode;
  /** Optional class applied to the outer marker wrapper. */
  className?: string;
  /** Optional inline style applied to the outer marker wrapper. */
  style?: React.CSSProperties;
  /** Optional class applied to the marker line. */
  lineClassName?: string;
  /** Optional inline style applied to the marker line. */
  lineStyle?: React.CSSProperties;
  /** Optional class applied to the marker label. */
  labelClassName?: string;
  /** Optional inline style applied to the marker label. */
  labelStyle?: React.CSSProperties;
  /** Controls where the marker is rendered. Defaults to `"body"`. */
  placement?: "axis" | "body" | "both";
}

/**
 * Decorative layers rendered by `Timeline.Viewport`.
 */
export interface TimelineDecorations {
  /** Background range highlights rendered behind rows. */
  bands?: TimelineBand[];
  /** Vertical markers rendered in the axis and/or body. */
  markers?: TimelineMarker[];
}

/**
 * Shared defaults for `Timeline.Link` instances inside one viewport.
 */
export interface TimelineLinkDefaults {
  /** Link routing strategy. Only orthogonal routing is currently supported. */
  routing?: "orthogonal";
  /** Whether links end with an arrow marker. Defaults to `true`. */
  arrow?: boolean;
  /** Horizontal gap used when routing out of and into items. Defaults to `16`. */
  gap?: number;
  /** Optional class applied to each link SVG when the link does not override it. */
  className?: string;
  /**
   * Optional inline style applied to each link SVG when the link does not override it.
   *
   * Prefer an opaque `color` here over alpha-based text colors when overlapping links
   * should not appear darker.
   */
  style?: React.CSSProperties;
  /** Optional stroke width used by each link when the link does not override it. */
  strokeWidth?: number;
}

/**
 * Background content rendered for a `Timeline.Row` in a dedicated layer.
 *
 * Use this when a row background should sit behind guides but in front of body
 * bands. This is different from `Timeline.Row`'s own `style`, which affects the
 * row content container itself.
 */
export interface TimelineRowBackground {
  /** Optional class applied to the background layer element. */
  className?: string;
  /** Optional inline style applied to the background layer element. */
  style?: React.CSSProperties;
}

// Timeline-wide time-domain state shared by every primitive under <Timeline.Root>.
// This context stays intentionally small: only the absolute range and the helper that
// projects a timestamp into percentage space. Anything tied to one rendered viewport
// (scroll body size, link metadata, row positions) lives in ViewportContext instead.
interface TimelineContextValue {
  start: number;
  end: number;
  timeToPercent: (time: number) => number;
}

type TimelineItemLayout = {
  start: number;
  end: number;
  insetY: number;
  rowTop: number;
  rowHeight: number;
};

type TimelineRowBackgroundLayout = {
  top: number;
  height: number;
  background: TimelineRowBackground;
};

type TimelineItemRect = {
  left: number;
  right: number;
  top: number;
  bottom: number;
};

// Viewport-local render state shared by nodes inside one <Timeline.Viewport>.
// This owns runtime facts that depend on one concrete rendered body: interval metadata
// used by links, measured body size for pixel-based routing, viewport-level link
// defaults, and the overlay/background hosts used by composed rows and links.
interface ViewportContextValue {
  registerItem: (id: string, layout: TimelineItemLayout) => void;
  unregisterItem: (id: string) => void;
  itemLayouts: ReadonlyMap<string, TimelineItemLayout>;
  bodySize: { width: number; height: number };
  linkDefaults: TimelineLinkDefaults;
  overlayElement: HTMLDivElement | null;
  registerRowBackground: (id: string, layout: TimelineRowBackgroundLayout) => void;
  unregisterRowBackground: (id: string) => void;
}

interface RowContextValue {
  top: number;
  height: number;
}

const TimelineContext = React.createContext<TimelineContextValue | null>(null);
const ViewportContext = React.createContext<ViewportContextValue | null>(null);
const RowContext = React.createContext<RowContextValue | null>(null);

function toMs(value: TimeValue) {
  return typeof value === "number" ? value : value.getTime();
}

function useTimelineContext() {
  const ctx = React.useContext(TimelineContext);
  if (!ctx) throw new Error("Timeline components must be used within <Timeline.Root>");
  return ctx;
}

function useViewportContext() {
  const ctx = React.useContext(ViewportContext);
  if (!ctx) throw new Error("Timeline row items must be used within <Timeline.Viewport>");
  return ctx;
}

function useRowContext() {
  const ctx = React.useContext(RowContext);
  if (!ctx) throw new Error("Timeline row items must be used within <Timeline.Row>");
  return ctx;
}

export type TimelineRootProps = {
  /** Inclusive start of the overall timeline range. */
  start: TimeValue;
  /** Inclusive end of the overall timeline range. */
  end: TimeValue;
  /** Timeline subtree. Usually contains one `Timeline.Viewport`. */
  children: React.ReactNode;
  /** Optional class applied to the root container. */
  className?: string;
  /** Optional inline style applied to the root container. */
  style?: React.CSSProperties;
};

/**
 * Provides the shared time range used by all timeline primitives.
 *
 * Example:
 * ```tsx
 * <Timeline.Root start={projectStart} end={projectEnd}>
 *   <Timeline.Viewport axis={axis}>
 *     <Timeline.Row height={40}>
 *       <Timeline.Interval start={task.start} end={task.end}>…</Timeline.Interval>
 *     </Timeline.Row>
 *   </Timeline.Viewport>
 * </Timeline.Root>
 * ```
 */
function Root({ start, end, children, className, style }: TimelineRootProps) {
  const startMs = toMs(start);
  const endMs = toMs(end);
  const range = Math.max(1, endMs - startMs);

  const value = React.useMemo<TimelineContextValue>(
    () => ({
      start: startMs,
      end: endMs,
      timeToPercent: (time: number) => ((time - startMs) / range) * 100,
    }),
    [startMs, endMs, range],
  );

  return (
    <TimelineContext.Provider value={value}>
      <div
        data-slot="timeline"
        className={cn("astw:relative astw:w-full", className)}
        style={style}
      >
        {children}
      </div>
    </TimelineContext.Provider>
  );
}
Root.displayName = "Timeline.Root";

function anchorX(anchor: Anchor, left: number, right: number) {
  if (anchor === "start") return left;
  if (anchor === "center") return left + (right - left) / 2;
  return right;
}

function resolveDirection(anchor: Anchor, fromX: number, toX: number, fallback: 1 | -1) {
  if (anchor === "start") return -1;
  if (anchor === "end") return 1;
  return toX >= fromX ? 1 : fallback;
}

function markerKey(marker: TimelineMarker, index: number) {
  return marker.key ?? `${toMs(marker.at)}-${index}`;
}

function getTickLabelTransform(align: Anchor | undefined) {
  if (align === "center") return "translateX(-50%)";
  if (align === "end") return "translateX(-100%)";
  return undefined;
}

function bandKey(band: TimelineBand, index: number) {
  return band.key ?? `${toMs(band.start)}-${toMs(band.end)}-${index}`;
}

function tickKey(tick: TimelineAxisTick, index: number) {
  return tick.key ?? `${toMs(tick.at)}-${index}`;
}

function guideKey(guide: TimelineGuide, index: number) {
  return guide.key ?? `${toMs(guide.at)}-${index}`;
}

function spanKey(span: TimelineAxisSpan, index: number) {
  return span.key ?? `${toMs(span.start)}-${toMs(span.end)}-${index}`;
}

function sameItemLayout(a: TimelineItemLayout | undefined, b: TimelineItemLayout) {
  return (
    a?.start === b.start &&
    a.end === b.end &&
    a.insetY === b.insetY &&
    a.rowTop === b.rowTop &&
    a.rowHeight === b.rowHeight
  );
}

function sameRowBackgroundLayout(
  a: TimelineRowBackgroundLayout | undefined,
  b: TimelineRowBackgroundLayout,
) {
  return a?.top === b.top && a.height === b.height && a.background === b.background;
}

function parseInlinePixels(value: string | null | undefined) {
  if (!value) return 0;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function measureElementHeight(element: HTMLElement) {
  return element.offsetHeight || element.clientHeight || parseInlinePixels(element.style.height);
}

function measureElementTop(element: HTMLElement) {
  if (element.offsetTop) return element.offsetTop;

  let top = 0;
  let sibling = element.previousElementSibling as HTMLElement | null;
  // JSDOM does not lay out offsetTop, so fall back to the fixed heights that Timeline.Row
  // writes inline.
  while (sibling) {
    top += measureElementHeight(sibling);
    sibling = sibling.previousElementSibling as HTMLElement | null;
  }

  return top;
}

function rangesOverlap(startA: number, endA: number, startB: number, endB: number) {
  return Math.max(startA, startB) < Math.min(endA, endB);
}

function toItemRect(
  item: TimelineItemLayout,
  bodyWidth: number,
  timeToPercent: (time: number) => number,
): TimelineItemRect {
  return {
    left: (timeToPercent(item.start) * bodyWidth) / 100,
    right: (timeToPercent(item.end) * bodyWidth) / 100,
    top: item.rowTop + item.insetY,
    bottom: item.rowTop + item.rowHeight - item.insetY,
  };
}

// Builds one orthogonal SVG path between two interval boxes.
//
// Coordinate space:
// - x is measured in body pixels, not percentages, because the route mixes time-based
//   positions with a fixed px `gap` used to leave/enter each interval cleanly.
// - y is measured from the top of the timeline body.
// - each interval contributes an inner box (`top/bottom`) after applying `insetY`, and
//   links connect to the vertical center of that inner box.
//
// Route shape:
// 1. pick the actual anchor point on each interval (`start`/`center`/`end`)
// 2. move horizontally by `gap` so the line exits and enters outside the interval box
// 3. if those exit/entry columns do not overlap, use a simple 3-segment elbow
// 4. otherwise, route through a shared horizontal lane halfway through the row gap
// 5. stop the path at the arrow base, not the target anchor itself, so the marker head
//    stays outside the interval instead of visually biting into it
function buildLinkPath(
  fromItem: TimelineItemLayout,
  toItem: TimelineItemLayout,
  allItems: readonly TimelineItemLayout[],
  bodyWidth: number,
  fromAnchor: Anchor,
  toAnchor: Anchor,
  gap: number,
  targetInset: number,
  timeToPercent: (time: number) => number,
) {
  // Convert each interval from time-space into the pixel box used by routing.
  const fromRect = toItemRect(fromItem, bodyWidth, timeToPercent);
  const toRect = toItemRect(toItem, bodyWidth, timeToPercent);
  const fromLeft = fromRect.left;
  const fromRight = fromRect.right;
  const fromTop = fromRect.top;
  const fromBottom = fromRect.bottom;
  const toLeft = toRect.left;
  const toRight = toRect.right;
  const toTop = toRect.top;
  const toBottom = toRect.bottom;

  // Anchor x comes from the chosen side of the interval. y always uses the visual center
  // of the interval's inner box so links stay vertically balanced.
  const x1 = anchorX(fromAnchor, fromLeft, fromRight);
  const y1 = fromTop + (fromBottom - fromTop) / 2;
  const x2 = anchorX(toAnchor, toLeft, toRight);
  const y2 = toTop + (toBottom - toTop) / 2;

  // Decide which horizontal direction each side should leave/enter from. Explicit
  // start/end anchors force left/right; center anchors choose based on the other side.
  const exitDirection = resolveDirection(fromAnchor, x1, x2, 1);
  const entryDirection = resolveDirection(toAnchor, x2, x1, -1);
  const xExit = x1 + gap * exitDirection;
  const intermediateRects = allItems
    .filter((item) => item !== fromItem && item !== toItem)
    .map((item) => toItemRect(item, bodyWidth, timeToPercent))
    .filter((itemRect) => itemRect.top < Math.max(y1, y2) && itemRect.bottom > Math.min(y1, y2));
  const xEntry = x2 + gap * entryDirection;
  const xEnd = x2 + targetInset * entryDirection;

  // Best case: after stepping out by `gap`, the source column is still left of the target
  // column. Then a simple elbow works: out, down/up, back in. The last horizontal segment
  // stops at `xEnd`, leaving room for the arrow head (when enabled) to occupy the target
  // side without overlapping the interval itself.
  const noOverlap = exitDirection === 1 && entryDirection === -1 && xExit < xEntry;
  if (noOverlap) {
    return `M ${x1} ${y1} L ${xExit} ${y1} L ${xExit} ${y2} L ${xEnd} ${y2}`;
  }

  // Otherwise the exit/entry columns would cross, so use a shared horizontal lane. For
  // downward links, bias that lane toward the gap immediately above the target row so the
  // second bend does not cut through intermediate rows. For upward links, do the mirrored
  // thing below the target row. Same-row overlaps still route outside both items.
  const verticalGap = y2 >= y1 ? toTop - fromBottom : fromTop - toBottom;
  let yRoute = Math.min(fromTop, toTop) - gap;
  if (verticalGap > 0) {
    const routeLeft = Math.min(xExit, xEntry);
    const routeRight = Math.max(xExit, xEntry);
    const blockedRects = intermediateRects.filter((itemRect) =>
      rangesOverlap(itemRect.left, itemRect.right, routeLeft, routeRight),
    );

    if (y2 >= y1) {
      const lowerBound = Math.max(fromBottom, ...blockedRects.map((itemRect) => itemRect.bottom));
      yRoute = lowerBound + (toTop - lowerBound) / 2;
    } else {
      const upperBound = Math.min(fromTop, ...blockedRects.map((itemRect) => itemRect.top));
      yRoute = toBottom + (upperBound - toBottom) / 2;
    }
  }
  return `M ${x1} ${y1} L ${xExit} ${y1} L ${xExit} ${yRoute} L ${xEntry} ${yRoute} L ${xEntry} ${y2} L ${xEnd} ${y2}`;
}

function renderAxisLevel(
  axisLevel: TimelineAxisLevel,
  levelIndex: number,
  timeToPercent: (time: number) => number,
) {
  const height = axisLevel.height ?? 28;

  if (axisLevel.kind === "spans") {
    return (
      <div
        key={levelIndex}
        data-slot="timeline-axis-level"
        className={cn("astw:relative", axisLevel.className)}
        style={{ height }}
      >
        {axisLevel.items.map((item, itemIndex) => {
          const left = timeToPercent(toMs(item.start));
          const width = timeToPercent(toMs(item.end)) - left;
          return (
            <div
              key={spanKey(item, itemIndex)}
              data-slot="timeline-axis-span"
              className={cn(
                "astw:absolute astw:top-0 astw:bottom-0 astw:flex astw:items-center astw:justify-center",
                axisLevel.itemClassName,
                item.className,
              )}
              style={{
                ...axisLevel.itemStyle,
                ...item.style,
                left: `${left}%`,
                width: `${width}%`,
              }}
            >
              {item.label}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div
      key={levelIndex}
      data-slot="timeline-axis-level"
      className={cn("astw:relative", axisLevel.className)}
      style={{ height }}
    >
      {axisLevel.items.map((item, itemIndex) => {
        const labelLeft = timeToPercent(toMs(item.labelAt ?? item.at));
        return (
          <div
            key={tickKey(item, itemIndex)}
            data-slot="timeline-axis-tick"
            className={cn("astw:absolute astw:inset-0", item.className)}
            style={item.style}
          >
            <div
              className="astw:absolute astw:top-0 astw:bottom-0 astw:flex astw:items-center astw:whitespace-nowrap"
              style={{
                left: `${labelLeft}%`,
                transform: getTickLabelTransform(axisLevel.labelAlign),
              }}
            >
              {item.label}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export type TimelineViewportProps = {
  /** Timeline content. Rows and links can be passed in any order. */
  children: React.ReactNode;
  /** Optional fixed canvas width in pixels for horizontally scrollable timelines. */
  canvasWidth?: number;
  /** Keeps the axis pinned to the top of the viewport when scrolling vertically. */
  stickyAxis?: boolean;
  /** Axis configuration for guides and header levels. */
  axis?: TimelineAxis;
  /** Decorative layers such as bands and markers. */
  decorations?: TimelineDecorations;
  /** Shared defaults applied to `Timeline.Link` nodes inside this viewport. */
  linkDefaults?: TimelineLinkDefaults;
  /** Optional class applied to the scroll viewport. */
  className?: string;
  /** Optional inline style applied to the scroll viewport. */
  style?: React.CSSProperties;
};

/**
 * Owns scrolling, axis rendering, decoration layers, and link layering.
 *
 * Example:
 * ```tsx
 * <Timeline.Viewport
 *   canvasWidth={1200}
 *   axis={{ guides, levels }}
 *   decorations={{ bands }}
 *   linkDefaults={{ style: { color: "var(--muted-foreground)" }, strokeWidth: 1.5 }}
 * >
 *   {rows}
 *   {links}
 * </Timeline.Viewport>
 * ```
 */
function Viewport({
  children,
  canvasWidth,
  stickyAxis = false,
  axis,
  decorations,
  linkDefaults,
  className,
  style,
}: TimelineViewportProps) {
  const { timeToPercent } = useTimelineContext();
  const bodyRef = React.useRef<HTMLDivElement>(null);
  const [bodySize, setBodySize] = React.useState({ width: 0, height: 0 });
  const [overlayElement, setOverlayElement] = React.useState<HTMLDivElement | null>(null);
  const [itemLayouts, setItemLayouts] = React.useState<Map<string, TimelineItemLayout>>(
    () => new Map(),
  );
  const [rowBackgrounds, setRowBackgrounds] = React.useState<
    Map<string, TimelineRowBackgroundLayout>
  >(() => new Map());
  const resolvedLinkDefaults = React.useMemo<TimelineLinkDefaults>(
    () => ({ routing: "orthogonal", arrow: true, gap: 16, ...linkDefaults }),
    [linkDefaults],
  );

  const registerItem = React.useCallback((id: string, layout: TimelineItemLayout) => {
    setItemLayouts((current) => {
      if (sameItemLayout(current.get(id), layout)) return current;
      const next = new Map(current);
      next.set(id, layout);
      return next;
    });
  }, []);

  const unregisterItem = React.useCallback((id: string) => {
    setItemLayouts((current) => {
      if (!current.has(id)) return current;
      const next = new Map(current);
      next.delete(id);
      return next;
    });
  }, []);

  const registerRowBackground = React.useCallback(
    (id: string, layout: TimelineRowBackgroundLayout) => {
      setRowBackgrounds((current) => {
        if (sameRowBackgroundLayout(current.get(id), layout)) return current;
        const next = new Map(current);
        next.set(id, layout);
        return next;
      });
    },
    [],
  );

  const unregisterRowBackground = React.useCallback((id: string) => {
    setRowBackgrounds((current) => {
      if (!current.has(id)) return current;
      const next = new Map(current);
      next.delete(id);
      return next;
    });
  }, []);

  // Timeline.Link paths need the committed body box before the first painted frame. Using
  // `useLayoutEffect` here lets the initial measurement land before paint so links do not
  // pop in one tick late, and the same effect also wires `ResizeObserver` for later resizes.
  React.useLayoutEffect(() => {
    const body = bodyRef.current;
    if (!body) return;

    const update = () => {
      const next = { width: body.clientWidth, height: body.clientHeight };
      setBodySize((current) =>
        current.width === next.width && current.height === next.height ? current : next,
      );
    };

    update();

    if (typeof ResizeObserver === "undefined") return;

    const observer = new ResizeObserver(update);
    observer.observe(body);
    return () => observer.disconnect();
  }, []);

  const axisMarkers = (decorations?.markers ?? []).filter(
    (marker) => marker.placement === "axis" || marker.placement === "both",
  );
  const bodyMarkers = (decorations?.markers ?? []).filter((marker) => marker.placement !== "axis");
  const backgroundLayouts = React.useMemo(
    () => Array.from(rowBackgrounds.entries()).sort((a, b) => a[1].top - b[1].top),
    [rowBackgrounds],
  );
  const guides = axis?.guides ?? [];
  const viewportValue = React.useMemo<ViewportContextValue>(
    () => ({
      registerItem,
      unregisterItem,
      itemLayouts,
      bodySize,
      linkDefaults: resolvedLinkDefaults,
      overlayElement,
      registerRowBackground,
      unregisterRowBackground,
    }),
    [
      bodySize,
      itemLayouts,
      overlayElement,
      registerItem,
      registerRowBackground,
      resolvedLinkDefaults,
      unregisterItem,
      unregisterRowBackground,
    ],
  );

  return (
    <ViewportContext.Provider value={viewportValue}>
      <div
        data-slot="timeline-viewport"
        className={cn("astw:w-full astw:overflow-x-auto astw:overflow-y-hidden", className)}
        style={style}
      >
        <div
          data-slot="timeline-canvas"
          className="astw:relative astw:min-w-full"
          style={{ width: canvasWidth ? `${canvasWidth}px` : undefined }}
        >
          {axis ? (
            <div
              data-slot="timeline-axis"
              className={cn(
                "astw:relative astw:z-20 astw:overflow-hidden",
                stickyAxis && "astw:sticky astw:top-0",
                axis.className,
              )}
            >
              <div className="astw:absolute astw:inset-0 astw:pointer-events-none">
                {guides.map((guide, index) => {
                  const left = timeToPercent(toMs(guide.at));
                  if (left <= 0 || left >= 100) return null;
                  return (
                    <div
                      key={guideKey(guide, index)}
                      data-slot="timeline-axis-guide"
                      className={cn("astw:absolute astw:inset-y-0 astw:w-px", guide.axisClassName)}
                      style={{ ...guide.axisStyle, left: `${left}%` }}
                    />
                  );
                })}
                {axisMarkers.map((marker, index) => {
                  const left = timeToPercent(toMs(marker.at));
                  return (
                    <div
                      key={markerKey(marker, index)}
                      data-slot="timeline-axis-marker"
                      className={cn("astw:absolute astw:inset-y-0", marker.className)}
                      style={{ ...marker.style, left: `${left}%` }}
                    >
                      <div
                        aria-hidden
                        className={cn(
                          "astw:absolute astw:inset-y-0 astw:w-px",
                          marker.lineClassName,
                        )}
                        style={{ ...marker.lineStyle, background: marker.color }}
                      />
                      {marker.label ? (
                        <div
                          className={cn(
                            "astw:absolute astw:top-0 astw:left-0 astw:whitespace-nowrap",
                            marker.labelClassName,
                          )}
                          style={marker.labelStyle}
                        >
                          {marker.label}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
              {(axis.levels ?? []).map((axisLevel, levelIndex) =>
                renderAxisLevel(axisLevel, levelIndex, timeToPercent),
              )}
            </div>
          ) : null}

          <div
            ref={bodyRef}
            data-slot="timeline-body"
            className="astw:relative astw:isolate astw:overflow-visible"
          >
            <div
              data-slot="timeline-underlay"
              className="astw:absolute astw:inset-0 astw:z-0 astw:pointer-events-none"
            >
              {(decorations?.bands ?? []).map((band, index) => {
                const left = timeToPercent(toMs(band.start));
                const width = timeToPercent(toMs(band.end)) - left;
                return (
                  <div
                    key={bandKey(band, index)}
                    data-slot="timeline-band"
                    className={cn("astw:absolute astw:inset-y-0", band.className)}
                    style={{
                      ...band.style,
                      left: `${left}%`,
                      width: `${width}%`,
                      background: band.color,
                    }}
                  />
                );
              })}
            </div>

            <div
              data-slot="timeline-row-backgrounds"
              className="astw:absolute astw:inset-0 astw:z-10 astw:pointer-events-none"
            >
              {backgroundLayouts.map(([key, layout]) => (
                <div
                  key={key}
                  data-slot="timeline-row-background"
                  className={cn(
                    "astw:absolute astw:left-0 astw:right-0",
                    layout.background.className,
                  )}
                  style={{
                    ...layout.background.style,
                    top: layout.top,
                    height: layout.height,
                  }}
                />
              ))}
            </div>

            <div
              data-slot="timeline-guides"
              className="astw:absolute astw:inset-0 astw:z-20 astw:pointer-events-none"
            >
              {guides.map((guide, index) => {
                const left = timeToPercent(toMs(guide.at));
                if (left <= 0 || left >= 100) return null;
                return (
                  <div
                    key={`line-${guideKey(guide, index)}`}
                    data-slot="timeline-body-line"
                    className={cn("astw:absolute astw:inset-y-0 astw:w-px", guide.bodyClassName)}
                    style={{ ...guide.bodyStyle, left: `${left}%` }}
                  />
                );
              })}

              {bodyMarkers.map((marker, index) => {
                const left = timeToPercent(toMs(marker.at));
                const showBodyLabel = marker.placement !== "both";
                return (
                  <div
                    key={markerKey(marker, index)}
                    data-slot="timeline-marker"
                    className={cn("astw:absolute astw:inset-y-0", marker.className)}
                    style={{ ...marker.style, left: `${left}%` }}
                  >
                    <div
                      aria-hidden
                      className={cn("astw:absolute astw:inset-y-0 astw:w-px", marker.lineClassName)}
                      style={{ ...marker.lineStyle, background: marker.color }}
                    />
                    {showBodyLabel && marker.label ? (
                      <div
                        className={cn(
                          "astw:absolute astw:top-0 astw:left-0 astw:whitespace-nowrap",
                          marker.labelClassName,
                        )}
                        style={marker.labelStyle}
                      >
                        {marker.label}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>

            <div data-slot="timeline-content" className="astw:relative astw:z-30">
              {children}
            </div>

            <div
              ref={setOverlayElement}
              data-slot="timeline-overlay"
              className="astw:absolute astw:inset-0 astw:z-[25] astw:pointer-events-none"
            />
          </div>
        </div>
      </div>
    </ViewportContext.Provider>
  );
}
Viewport.displayName = "Timeline.Viewport";

export type TimelineRowProps = {
  /** Row contents, typically intervals. */
  children: React.ReactNode;
  /** Optional class applied to the row content container. */
  className?: string;
  /** Optional inline style applied to the row content container. */
  style?: React.CSSProperties;
  /** Row height in pixels. Defaults to `32`. */
  height?: number;
  /**
   * Optional background rendered in a dedicated layer.
   *
   * Use this instead of `style.background` when guides should remain visible in
   * front of the row background.
   */
  background?: TimelineRowBackground | null;
};

/**
 * A single body row.
 *
 * Rows control vertical sizing and can optionally provide a background layer:
 * ```tsx
 * <Timeline.Row
 *   height={40}
 *   background={{ style: { background: "var(--muted)" } }}
 * >
 *   <Timeline.Interval start={task.start} end={task.end}>…</Timeline.Interval>
 * </Timeline.Row>
 * ```
 */
function Row({ children, className, style, height = 32, background }: TimelineRowProps) {
  const { registerRowBackground, unregisterRowBackground } = useViewportContext();
  const rowId = React.useId();
  const ref = React.useRef<HTMLDivElement>(null);
  const [rowTop, setRowTop] = React.useState(0);
  const rowLayout = React.useMemo<RowContextValue>(
    () => ({ top: rowTop, height }),
    [rowTop, height],
  );

  // Row height is fixed by the owner-provided prop, so we only need to refresh the row's
  // vertical offset after each commit.
  React.useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;

    const nextTop = measureElementTop(element);
    setRowTop((current) => (current === nextTop ? current : nextTop));
  });

  // Row backgrounds live in a separate layer owned by the viewport. Registering them in
  // `useLayoutEffect` keeps that layer synchronized with the row position before paint,
  // so the background does not visibly lag behind the row that owns it.
  React.useLayoutEffect(() => {
    if (!background) {
      unregisterRowBackground(rowId);
      return;
    }

    registerRowBackground(rowId, {
      top: rowLayout.top,
      height: rowLayout.height,
      background,
    });

    return () => unregisterRowBackground(rowId);
  }, [
    background,
    registerRowBackground,
    rowId,
    rowLayout.height,
    rowLayout.top,
    unregisterRowBackground,
  ]);

  return (
    <RowContext.Provider value={rowLayout}>
      <div
        ref={ref}
        data-slot="timeline-row"
        className={cn("astw:relative astw:w-full astw:overflow-visible", className)}
        style={{ ...style, height }}
      >
        {children}
      </div>
    </RowContext.Provider>
  );
}
Row.displayName = "Timeline.Row";

export type TimelineIntervalProps = {
  /** Start of the interval. */
  start: TimeValue;
  /** End of the interval. */
  end: TimeValue;
  /** Rendered content for the interval. */
  children: React.ReactNode;
  /** Optional stable id used by `Timeline.Link`. */
  id?: string;
  /** Top and bottom inset in pixels within the row. Defaults to `0`. */
  insetY?: number;
  /** Optional class applied to the positioned interval container. */
  className?: string;
  /** Optional inline style applied to the positioned interval container. */
  style?: React.CSSProperties;
};

/**
 * Positions content across a time range inside a row.
 */
function Interval({
  start,
  end,
  children,
  id,
  insetY = 0,
  className,
  style,
}: TimelineIntervalProps) {
  const { timeToPercent } = useTimelineContext();
  const { registerItem, unregisterItem } = useViewportContext();
  const row = useRowContext();
  const startMs = toMs(start);
  const endMs = toMs(end);
  const normalizedStart = Math.min(startMs, endMs);
  const normalizedEnd = Math.max(startMs, endMs);
  const left = timeToPercent(normalizedStart);
  const width = Math.max(0, timeToPercent(normalizedEnd) - left);

  // Link discovery is runtime-based on purpose. `Timeline.Viewport` can walk direct
  // `Timeline.Interval` children, but it cannot see through wrapper components such as
  // `<TaskBar />` that render an interval internally, and future Gantt-style screens may
  // add/remove intervals dynamically. We use `useLayoutEffect` so the registration lands
  // before paint; otherwise links would need to wait for a passive effect and could appear
  // one frame late relative to the interval bars they connect.
  React.useLayoutEffect(() => {
    if (!id) return;

    registerItem(id, {
      start: normalizedStart,
      end: normalizedEnd,
      insetY,
      rowTop: row.top,
      rowHeight: row.height,
    });

    return () => unregisterItem(id);
  }, [
    id,
    insetY,
    normalizedEnd,
    normalizedStart,
    registerItem,
    row.height,
    row.top,
    unregisterItem,
  ]);

  return (
    <div
      data-slot="timeline-interval"
      data-timeline-item-id={id}
      className={cn("astw:absolute astw:min-w-0", className)}
      style={{
        ...style,
        left: `${left}%`,
        width: `${width}%`,
        top: insetY,
        bottom: insetY,
      }}
    >
      {children}
    </div>
  );
}
Interval.displayName = "Timeline.Interval";

export type TimelineLinkProps = {
  /** Source `Timeline.Interval` id. */
  from: string;
  /** Target `Timeline.Interval` id. */
  to: string;
  /** Source anchor used for routing. Defaults to `"end"`. */
  fromAnchor?: Anchor;
  /** Target anchor used for routing. Defaults to `"start"`. */
  toAnchor?: Anchor;
  /** Overrides the viewport default arrow visibility. */
  arrow?: boolean;
  /** Overrides the viewport default routing gap. */
  gap?: number;
  /** Optional class applied to the link SVG. */
  className?: string;
  /** Optional inline style applied to the link SVG. */
  style?: React.CSSProperties;
  /** Optional stroke width for the link path. */
  strokeWidth?: number;
};

/**
 * Draws an orthogonal connector between two row items.
 *
 * If either referenced `Timeline.Interval` id is unresolved, nothing is rendered.
 */
function Link({
  from,
  to,
  fromAnchor = "end",
  toAnchor = "start",
  arrow,
  gap,
  className,
  style,
  strokeWidth,
}: TimelineLinkProps) {
  const { timeToPercent } = useTimelineContext();
  const { bodySize, itemLayouts, linkDefaults, overlayElement } = useViewportContext();
  const markerId = React.useId().replace(/:/g, "");
  const resolvedArrow = arrow ?? linkDefaults.arrow ?? true;
  const resolvedGap = gap ?? linkDefaults.gap ?? 16;
  const resolvedClassName = className ?? linkDefaults.className;
  const resolvedStyle = style ?? linkDefaults.style;
  const resolvedStrokeWidth = strokeWidth ?? linkDefaults.strokeWidth;
  // Keep this in sync with the marker geometry below: the arrow head is 6px long and we
  // leave an extra 2px of breathing room before the target interval.
  const arrowInset = resolvedArrow ? 8 : 0;
  const path = React.useMemo(() => {
    const fromItem = itemLayouts.get(from);
    const toItem = itemLayouts.get(to);
    if (!fromItem || !toItem || bodySize.width <= 0 || bodySize.height <= 0) return "";
    return buildLinkPath(
      fromItem,
      toItem,
      Array.from(itemLayouts.values()),
      bodySize.width,
      fromAnchor,
      toAnchor,
      resolvedGap,
      arrowInset,
      timeToPercent,
    );
  }, [
    arrowInset,
    bodySize.height,
    bodySize.width,
    from,
    fromAnchor,
    itemLayouts,
    resolvedGap,
    timeToPercent,
    to,
    toAnchor,
  ]);

  if (!path || !overlayElement) return null;

  return createPortal(
    <svg
      data-slot="timeline-link"
      className={cn(
        "astw:absolute astw:inset-0 astw:h-full astw:w-full astw:overflow-visible",
        resolvedClassName,
      )}
      width={bodySize.width}
      height={bodySize.height}
      style={resolvedStyle}
    >
      {resolvedArrow ? (
        <defs>
          <marker
            id={`timeline-link-arrow-${markerId}`}
            markerWidth="6"
            markerHeight="6"
            refX="0"
            refY="3"
            orient="auto"
          >
            <path d="M 0 0 L 6 3 L 0 6 Z" fill="currentColor" />
          </marker>
        </defs>
      ) : null}
      <path
        d={path}
        fill="none"
        stroke="currentColor"
        strokeWidth={resolvedStrokeWidth}
        markerEnd={resolvedArrow ? `url(#timeline-link-arrow-${markerId})` : undefined}
      />
    </svg>,
    overlayElement,
  );
}
Link.displayName = "Timeline.Link";

/**
 * Timeline primitives for building app-specific schedule, trace, and dependency UIs.
 *
 * Typical usage:
 * ```tsx
 * <Timeline.Root start={start} end={end}>
 *   <Timeline.Viewport axis={axis} decorations={decorations}>
 *     <Timeline.Row height={40} background={{ style: { background: "var(--muted)" } }}>
 *       <Timeline.Interval id="task-1" start={task.start} end={task.end}>…</Timeline.Interval>
 *     </Timeline.Row>
 *     <Timeline.Link from="task-1" to="task-2" />
 *   </Timeline.Viewport>
 * </Timeline.Root>
 * ```
 */
export const Timeline = {
  Root,
  Viewport,
  Row,
  Interval,
  Link,
};
