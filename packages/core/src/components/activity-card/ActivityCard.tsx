import * as React from "react";
import { Avatar } from "../avatar";
import { Dialog } from "../dialog";
import { cn } from "../../lib/utils";

import type { ActivityCardProps, ActivityCardActivity } from "./types";

// ============================================================================
// HELPERS
// ============================================================================

function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function formatTimestamp(ts: Date | string): string {
  const d = typeof ts === "string" ? new Date(ts) : ts;
  if (Number.isNaN(d.getTime())) {
    return typeof ts === "string" ? ts : "";
  }
  return d.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function getDayKey(ts: Date | string): string {
  const d = typeof ts === "string" ? new Date(ts) : ts;
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const t = d.toDateString();
  if (t === today.toDateString()) return "TODAY";
  if (t === yesterday.toDateString()) return "YESTERDAY";
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

// ============================================================================
// TIMELINE CONNECTOR (measures row heights so line connects avatar centers)
// ============================================================================

const AVATAR_SIZE = 28;
const AVATAR_CENTER_OFFSET = AVATAR_SIZE / 2; // 14px
const ROW_GAP = 20; // gap-5

function TimelineConnector() {
  const wrapperRef = React.useRef<HTMLDivElement>(null);
  const [lineStyle, setLineStyle] = React.useState<{
    top: number;
    height: number;
  } | null>(null);

  React.useLayoutEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    const prev = wrapper.previousElementSibling as HTMLElement | null;
    const next = wrapper.nextElementSibling as HTMLElement | null;
    if (!prev || !next) return;

    const update = () => {
      const prevRect = prev.getBoundingClientRect();
      const nextRect = next.getBoundingClientRect();
      const wrapperRect = wrapper.getBoundingClientRect();
      const top = prevRect.top + AVATAR_CENTER_OFFSET - wrapperRect.top;
      const bottom = nextRect.top + AVATAR_CENTER_OFFSET - wrapperRect.top;
      const height = bottom - top;
      if (height > 0) {
        setLineStyle({ top, height });
      }
    };

    update();
    const ro = new ResizeObserver(update);
    ro.observe(prev);
    ro.observe(next);
    return () => ro.disconnect();
  }, []);

  return (
    <div
      ref={wrapperRef}
      className="astw:relative astw:z-0 astw:h-5 astw:shrink-0 astw:flex-none"
      aria-hidden
    >
      <div
        className="astw:absolute astw:left-[14px] astw:z-0 astw:w-px astw:rounded-md astw:bg-border"
        style={
          lineStyle
            ? { top: lineStyle.top, height: lineStyle.height }
            : {
                top: -AVATAR_CENTER_OFFSET,
                height: AVATAR_CENTER_OFFSET + ROW_GAP + AVATAR_CENTER_OFFSET,
              }
        }
        aria-hidden
      />
    </div>
  );
}

// ============================================================================
// ACTIVITY ROW (internal)
// ============================================================================

function ActivityRow({ activity }: { activity: ActivityCardActivity }) {
  return (
    <div className="astw:relative astw:z-10 astw:flex astw:gap-3 astw:min-w-0">
      <Avatar.Root aria-hidden>
        {activity.userAvatarUrl ? <Avatar.Image src={activity.userAvatarUrl} alt="" /> : null}
        <Avatar.Fallback>{getInitials(activity.userDisplayName)}</Avatar.Fallback>
      </Avatar.Root>
      <div className="astw:flex astw:min-w-0 astw:flex-1 astw:flex-col astw:gap-1">
        <p className="astw:text-sm astw:font-medium astw:leading-normal astw:text-foreground">
          <span>{activity.userDisplayName}</span>{" "}
          <span className="astw:text-muted-foreground">{activity.description}</span>
        </p>
        <p className="astw:text-xs astw:leading-none astw:text-muted-foreground">
          {formatTimestamp(activity.timestamp)}
        </p>
      </div>
    </div>
  );
}

/** One section: day label + activities with line segments between rows only */
function renderActivitySection(dayLabel: string | null, dayActivities: ActivityCardActivity[]) {
  return (
    <div key={dayLabel ?? "single"} className="astw:flex astw:flex-col astw:gap-5">
      {dayLabel != null && (
        <p className="astw:text-xs astw:font-semibold astw:leading-none astw:opacity-60 astw:text-foreground">
          {dayLabel}
        </p>
      )}
      <div className="astw:flex astw:flex-col astw:gap-0">
        {dayActivities.map((activity, index) => (
          <React.Fragment key={activity.id}>
            <ActivityRow activity={activity} />
            {index < dayActivities.length - 1 && <TimelineConnector />}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// ACTIVITY CARD
// ============================================================================

/**
 * Displays a timeline of recent activities (e.g. doc changes for PO, SO, GR).
 * Shows avatars, configurable visible count, and an overflow that opens a
 * dialog with the full scrollable list.
 */
function ActivityCard({
  activities,
  title,
  maxVisible = 6,
  overflowLabel = "more",
  groupBy = "none",
  className,
}: ActivityCardProps) {
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [isScrolling, setIsScrolling] = React.useState(false);
  const scrollTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const visible = activities.slice(0, maxVisible);
  const overflowCount = activities.length - maxVisible;
  const hasOverflow = overflowCount > 0;

  const handleScroll = React.useCallback(() => {
    setIsScrolling(true);
    if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    scrollTimeoutRef.current = setTimeout(() => {
      setIsScrolling(false);
      scrollTimeoutRef.current = null;
    }, 600);
  }, []);

  React.useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    };
  }, []);

  const renderActivityList = (list: ActivityCardActivity[]) => {
    if (groupBy === "day") {
      const byDay = new Map<string, ActivityCardActivity[]>();
      for (const a of list) {
        const key = getDayKey(a.timestamp);
        if (!byDay.has(key)) byDay.set(key, []);
        byDay.get(key)!.push(a);
      }
      const entries = Array.from(byDay.entries());
      return (
        <div className="astw:flex astw:flex-col astw:gap-8">
          {entries.map(([dayLabel, dayActivities]) =>
            renderActivitySection(dayLabel, dayActivities),
          )}
        </div>
      );
    }
    return (
      <div className="astw:flex astw:flex-col astw:gap-5">{renderActivitySection(null, list)}</div>
    );
  };

  return (
    <>
      <div
        data-slot="activity-card"
        className={cn(
          "astw:min-w-[278px] astw:w-full astw:bg-card astw:text-card-foreground astw:rounded-xl astw:border",
          className,
        )}
      >
        {title != null && (
          <div className="astw:flex astw:items-center astw:px-6 astw:pt-5 astw:pb-2">
            <h3 className="astw:text-lg astw:font-semibold astw:leading-7 astw:text-card-foreground">
              {title}
            </h3>
          </div>
        )}
        <div className="astw:relative astw:px-6 astw:pb-5">
          <div className="astw:relative astw:flex astw:flex-col">
            {visible.length === 0 ? (
              <p className="astw:text-sm astw:text-muted-foreground">No activities yet</p>
            ) : (
              renderActivityList(visible)
            )}
          </div>
        </div>
        {hasOverflow && (
          <button
            type="button"
            onClick={() => setDialogOpen(true)}
            className="astw:cursor-pointer astw:w-full astw:border-t astw:border-border astw:py-4 astw:text-sm astw:font-medium astw:text-center astw:text-foreground astw:opacity-60 astw:transition-colors astw:hover:opacity-100 astw:hover:bg-secondary/50 astw:focus:outline-none astw:focus-visible:ring-2 astw:focus-visible:ring-ring astw:focus-visible:ring-inset"
          >
            {overflowLabel === "count" ? `+${overflowCount}` : `${overflowCount} more activities`}
          </button>
        )}
      </div>

      <Dialog.Root open={dialogOpen} onOpenChange={setDialogOpen}>
        <Dialog.Content className="astw:max-w-md astw:max-h-[85vh] astw:flex astw:flex-col">
          <Dialog.Header>
            <Dialog.Title>All activities</Dialog.Title>
          </Dialog.Header>
          <div
            onScroll={handleScroll}
            className={cn(
              "astw:overflow-y-auto astw:flex-1 astw:min-h-0 astw:-mr-6 astw:pr-6 astw:pl-1",
              "astw:[scrollbar-width:thin]",
              "astw:[&::-webkit-scrollbar]:w-1.5",
              "astw:[&::-webkit-scrollbar-track]:bg-transparent",
              "astw:[&::-webkit-scrollbar-thumb]:rounded-full astw:[&::-webkit-scrollbar-thumb]:bg-border",
              "astw:[&::-webkit-scrollbar-thumb]:transition-opacity astw:[&::-webkit-scrollbar-thumb]:duration-300",
              isScrolling
                ? "astw:[&::-webkit-scrollbar-thumb]:opacity-100"
                : "astw:[&::-webkit-scrollbar-thumb]:opacity-0 astw:hover:[&::-webkit-scrollbar-thumb]:opacity-100",
            )}
          >
            {renderActivityList(activities)}
          </div>
        </Dialog.Content>
      </Dialog.Root>
    </>
  );
}

export { ActivityCard };
