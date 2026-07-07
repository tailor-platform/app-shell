import * as React from "react";
import { cn } from "@/lib/utils";

type TimeValue = Date | number;
type ItemEntry = { element: HTMLDivElement; start: number; end: number };
type ItemRegistry = Map<string, ItemEntry>;

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

/**
 * One stacked axis level.
 *
 * Levels let an app compose multi-level headers such as year → month or a
 * single timebox row such as half-hour slots.
 */
export type TimelineAxisLevel =
  | {
      /** Interval labels rendered across a time range. */
      kind: "spans";
      /** Height of this axis level in pixels. Defaults to `28`. */
      height?: number;
      /** Span items to render in this level. */
      items: TimelineAxisSpan[];
      /** Optional class applied to the level container. */
      className?: string;
      /** Optional class applied to every span in the level. */
      itemClassName?: string;
      /** Optional style applied to every span in the level. */
      itemStyle?: React.CSSProperties;
    }
  | {
      /** Point labels rendered at specific times. */
      kind: "ticks";
      /** Height of this axis level in pixels. Defaults to `28`. */
      height?: number;
      /** Tick items to render in this level. */
      items: TimelineAxisTick[];
      /** Optional class applied to the level container. */
      className?: string;
      /** Horizontal anchor used when placing each tick label. */
      labelAlign?: Anchor;
    };

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
  /** Stacked header levels rendered above the body. */
  levels: TimelineAxisLevel[];
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
  /** Optional inline style applied to each link SVG when the link does not override it. */
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

interface TimelineContextValue {
  start: number;
  end: number;
  timeToPercent: (time: number) => number;
}

interface ViewportContextValue {
  bodyRef: React.RefObject<HTMLDivElement | null>;
  itemRegistry: React.RefObject<ItemRegistry>;
  linkDefaults: TimelineLinkDefaults;
}

const TimelineContext = React.createContext<TimelineContextValue | null>(null);
const ViewportContext = React.createContext<ViewportContextValue | null>(null);

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

type RootProps = {
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
function Root({ start, end, children, className, style }: RootProps) {
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

function anchorTransform(anchor: Anchor) {
  if (anchor === "center") return "translateX(-50%)";
  if (anchor === "end") return "translateX(-100%)";
  return undefined;
}

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

type ViewportProps = {
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
 *   linkDefaults={{ className: "astw:text-foreground/60", strokeWidth: 1.5 }}
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
}: ViewportProps) {
  const { timeToPercent } = useTimelineContext();
  const bodyRef = React.useRef<HTMLDivElement>(null);
  const itemRegistry = React.useRef<ItemRegistry>(new Map());
  const resolvedLinkDefaults = React.useMemo<TimelineLinkDefaults>(
    () => ({ routing: "orthogonal", arrow: true, gap: 16, ...linkDefaults }),
    [linkDefaults],
  );

  const { rows, links, extraNodes } = React.useMemo(
    () => splitTimelineChildren(children),
    [children],
  );

  const axisMarkers = (decorations?.markers ?? []).filter(
    (marker) => marker.placement === "axis" || marker.placement === "both",
  );
  const bodyMarkers = (decorations?.markers ?? []).filter((marker) => marker.placement !== "axis");
  const guides = axis?.guides ?? [];

  return (
    <ViewportContext.Provider
      value={{
        bodyRef,
        itemRegistry,
        linkDefaults: resolvedLinkDefaults,
      }}
    >
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
              {axis.levels.map((axisLevel, levelIndex) =>
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
              {rows.map((row, index) => {
                const background = row.props.background;
                if (!background) {
                  return <div key={row.key ?? index} style={{ height: row.props.height ?? 32 }} />;
                }

                return (
                  <div
                    key={row.key ?? index}
                    data-slot="timeline-row-background"
                    className={cn("astw:w-full", background.className)}
                    style={{ ...background.style, height: row.props.height ?? 32 }}
                  />
                );
              })}
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
                  </div>
                );
              })}
            </div>

            <div data-slot="timeline-content" className="astw:relative astw:z-30">
              {rows}
              {extraNodes}
            </div>

            <div
              data-slot="timeline-overlay"
              className="astw:absolute astw:inset-0 astw:z-40 astw:pointer-events-none"
            >
              {links}
            </div>
          </div>
        </div>
      </div>
    </ViewportContext.Provider>
  );
}
Viewport.displayName = "Timeline.Viewport";

type RowProps = {
  /** Row contents, typically intervals or points. */
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
function Row({ children, className, style, height = 32 }: RowProps) {
  return (
    <div
      data-slot="timeline-row"
      className={cn("astw:relative astw:w-full astw:overflow-visible", className)}
      style={{ ...style, height }}
    >
      {children}
    </div>
  );
}
Row.displayName = "Timeline.Row";

type IntervalProps = {
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
function Interval({ start, end, children, id, insetY = 0, className, style }: IntervalProps) {
  const { timeToPercent } = useTimelineContext();
  const { itemRegistry } = useViewportContext();
  const ref = React.useRef<HTMLDivElement>(null);
  const startMs = toMs(start);
  const endMs = toMs(end);
  const normalizedStart = Math.min(startMs, endMs);
  const normalizedEnd = Math.max(startMs, endMs);
  const left = timeToPercent(normalizedStart);
  const width = Math.max(0, timeToPercent(normalizedEnd) - left);

  React.useEffect(() => {
    const registry = itemRegistry.current;
    const element = ref.current;

    if (id && element) {
      registry.set(id, {
        element,
        start: normalizedStart,
        end: normalizedEnd,
      });
    }

    return () => {
      if (id) registry.delete(id);
    };
  }, [id, itemRegistry, normalizedStart, normalizedEnd]);

  return (
    <div
      ref={ref}
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

type PointProps = {
  /** Time position for the point. */
  at: TimeValue;
  /** Rendered content for the point. */
  children: React.ReactNode;
  /** Optional stable id used by `Timeline.Link`. */
  id?: string;
  /** Top and bottom inset in pixels within the row. Defaults to `0`. */
  insetY?: number;
  /** Horizontal anchor relative to the point position. Defaults to `"center"`. */
  anchor?: Anchor;
  /** Optional class applied to the positioned point container. */
  className?: string;
  /** Optional inline style applied to the positioned point container. */
  style?: React.CSSProperties;
};

/**
 * Positions content at a single point in time inside a row.
 */
function Point({ at, children, id, insetY = 0, anchor = "center", className, style }: PointProps) {
  const { timeToPercent } = useTimelineContext();
  const { itemRegistry } = useViewportContext();
  const ref = React.useRef<HTMLDivElement>(null);
  const atMs = toMs(at);
  const left = timeToPercent(atMs);

  React.useEffect(() => {
    const registry = itemRegistry.current;
    const element = ref.current;

    if (id && element) {
      registry.set(id, {
        element,
        start: atMs,
        end: atMs,
      });
    }

    return () => {
      if (id) registry.delete(id);
    };
  }, [atMs, id, itemRegistry]);

  return (
    <div
      ref={ref}
      data-slot="timeline-point"
      data-timeline-item-id={id}
      className={cn("astw:absolute astw:flex astw:items-center", className)}
      style={{
        ...style,
        left: `${left}%`,
        top: insetY,
        bottom: insetY,
        transform: anchorTransform(anchor),
      }}
    >
      {children}
    </div>
  );
}
Point.displayName = "Timeline.Point";

type LinkProps = {
  /** Source `Timeline.Interval` or `Timeline.Point` id. */
  from: string;
  /** Target `Timeline.Interval` or `Timeline.Point` id. */
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
}: LinkProps) {
  const { bodyRef, itemRegistry, linkDefaults } = useViewportContext();
  const [path, setPath] = React.useState("");
  const [box, setBox] = React.useState({ width: 0, height: 0 });
  const markerId = React.useId().replace(/:/g, "");
  const resolvedArrow = arrow ?? linkDefaults.arrow ?? true;
  const resolvedGap = gap ?? linkDefaults.gap ?? 16;
  const resolvedClassName = className ?? linkDefaults.className;
  const resolvedStyle = style ?? linkDefaults.style;
  const resolvedStrokeWidth = strokeWidth ?? linkDefaults.strokeWidth;

  React.useEffect(() => {
    const body = bodyRef.current;
    if (!body) return;

    const compute = () => {
      const fromEntry = itemRegistry.current.get(from);
      const toEntry = itemRegistry.current.get(to);
      if (!fromEntry || !toEntry) {
        setPath("");
        return;
      }

      const bodyRect = body.getBoundingClientRect();
      const fromRect = fromEntry.element.getBoundingClientRect();
      const toRect = toEntry.element.getBoundingClientRect();

      const fromLeft = fromRect.left - bodyRect.left;
      const fromRight = fromRect.right - bodyRect.left;
      const fromTop = fromRect.top - bodyRect.top;
      const fromBottom = fromRect.bottom - bodyRect.top;
      const toLeft = toRect.left - bodyRect.left;
      const toRight = toRect.right - bodyRect.left;
      const toTop = toRect.top - bodyRect.top;
      const toBottom = toRect.bottom - bodyRect.top;

      const x1 = anchorX(fromAnchor, fromLeft, fromRight);
      const y1 = fromTop + fromRect.height / 2;
      const x2 = anchorX(toAnchor, toLeft, toRight);
      const y2 = toTop + toRect.height / 2;

      const exitDirection = resolveDirection(fromAnchor, x1, x2, 1);
      const entryDirection = resolveDirection(toAnchor, x2, x1, -1);
      const xExit = x1 + resolvedGap * exitDirection;
      const xEntry = x2 + resolvedGap * entryDirection;
      const noOverlap = exitDirection === 1 && entryDirection === -1 && xExit < xEntry;

      setBox({ width: bodyRect.width, height: bodyRect.height });

      if (noOverlap) {
        setPath(`M ${x1} ${y1} L ${xExit} ${y1} L ${xExit} ${y2} L ${x2} ${y2}`);
        return;
      }

      const yRoute =
        y2 >= y1 ? fromBottom + (toTop - fromBottom) / 2 : toBottom + (fromTop - toBottom) / 2;
      setPath(
        `M ${x1} ${y1} L ${xExit} ${y1} L ${xExit} ${yRoute} L ${xEntry} ${yRoute} L ${xEntry} ${y2} L ${x2} ${y2}`,
      );
    };

    compute();

    if (typeof ResizeObserver === "undefined") return;

    const observer = new ResizeObserver(compute);
    observer.observe(body);

    const fromEntry = itemRegistry.current.get(from);
    const toEntry = itemRegistry.current.get(to);
    if (fromEntry) observer.observe(fromEntry.element);
    if (toEntry) observer.observe(toEntry.element);

    return () => observer.disconnect();
  }, [bodyRef, from, fromAnchor, itemRegistry, resolvedGap, to, toAnchor]);

  if (!path) return null;

  return (
    <svg
      data-slot="timeline-link"
      className={cn(
        "astw:absolute astw:inset-0 astw:h-full astw:w-full astw:overflow-visible",
        resolvedClassName,
      )}
      width={box.width}
      height={box.height}
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
    </svg>
  );
}
Link.displayName = "Timeline.Link";

function splitTimelineChildren(children: React.ReactNode) {
  const rows: React.ReactElement<RowProps>[] = [];
  const links: React.ReactElement<LinkProps>[] = [];
  const extraNodes: React.ReactNode[] = [];

  const visit = (node: React.ReactNode) => {
    React.Children.forEach(node, (child) => {
      if (child == null || typeof child === "boolean") return;

      if (!React.isValidElement(child)) {
        extraNodes.push(child);
        return;
      }

      if (child.type === React.Fragment) {
        visit((child.props as { children?: React.ReactNode }).children);
        return;
      }

      if (child.type === Row) {
        rows.push(child as React.ReactElement<RowProps>);
        return;
      }

      if (child.type === Link) {
        links.push(child as React.ReactElement<LinkProps>);
        return;
      }

      extraNodes.push(child);
    });
  };

  visit(children);

  return { rows, links, extraNodes };
}

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
  Point,
  Link,
};
