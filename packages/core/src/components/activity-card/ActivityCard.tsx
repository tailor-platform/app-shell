import * as React from "react";
import { Dialog } from "../dialog";
import { cn } from "../../lib/utils";

import type {
  ActivityCardBaseItem,
  ActivityCardRootProps,
  ActivityCardItemsProps,
  ActivityCardItemProps,
} from "./types";

// ============================================================================
// HELPERS (exported for standalone wrapper)
// ============================================================================

export function getDayKey(ts: Date | string): string {
  const d = typeof ts === "string" ? new Date(ts) : ts;
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const t = d.toDateString();
  if (t === today.toDateString()) return "TODAY";
  if (t === yesterday.toDateString()) return "YESTERDAY";
  return d.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatTimestamp(ts: Date | string): string {
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

export function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

// ============================================================================
// CONTEXT
// ============================================================================

interface ActivityCardContextValue<T extends ActivityCardBaseItem = ActivityCardBaseItem> {
  activities: T[];
  maxVisible: number;
  overflowLabel: "more" | "count";
  groupBy: "none" | "day";
}

const ActivityCardContext = React.createContext<ActivityCardContextValue | null>(null);

function useActivityCardContext<T extends ActivityCardBaseItem>(): ActivityCardContextValue<T> {
  const ctx = React.useContext(ActivityCardContext);
  if (!ctx) {
    throw new Error("ActivityCard compound components must be used within ActivityCard.Root");
  }
  return ctx as ActivityCardContextValue<T>;
}

// ============================================================================
// ROOT
// ============================================================================

function Root<T extends ActivityCardBaseItem>({
  activities,
  title,
  maxVisible = 6,
  overflowLabel = "more",
  groupBy = "none",
  className,
  children,
}: ActivityCardRootProps<T>) {
  const contextValue = React.useMemo<ActivityCardContextValue<T>>(
    () => ({ activities, maxVisible, overflowLabel, groupBy }),
    [activities, maxVisible, overflowLabel, groupBy],
  );

  return (
    <ActivityCardContext.Provider value={contextValue as ActivityCardContextValue}>
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
        {children}
      </div>
    </ActivityCardContext.Provider>
  );
}
Root.displayName = "ActivityCard.Root";

// ============================================================================
// ITEMS
// ============================================================================

function renderSection<T extends ActivityCardBaseItem>(
  items: T[],
  renderItem: (item: T) => React.ReactNode,
  dayLabel: string | null,
) {
  return (
    <div key={dayLabel ?? "single"} className="astw:flex astw:flex-col astw:gap-5">
      {dayLabel != null && (
        <p className="astw:text-xs astw:font-semibold astw:leading-none astw:opacity-60 astw:text-foreground">
          {dayLabel}
        </p>
      )}
      <div className="astw:relative astw:flex astw:flex-col astw:gap-5">
        {items.map((item, index) => (
          <div key={item.id} className="astw:relative">
            {/* Upper connector: from top of wrapper to indicator center */}
            {index > 0 && (
              <div
                aria-hidden
                className="astw:absolute astw:left-3.5 astw:-translate-x-1/2 astw:top-0 astw:h-3.5 astw:w-px astw:bg-border"
              />
            )}
            {/* Lower connector: from indicator center through gap to next item */}
            {index < items.length - 1 && (
              <div
                aria-hidden
                className="astw:absolute astw:left-3.5 astw:-translate-x-1/2 astw:top-3.5 astw:-bottom-5 astw:w-px astw:bg-border"
              />
            )}
            {renderItem(item)}
          </div>
        ))}
      </div>
    </div>
  );
}

function renderList<T extends ActivityCardBaseItem>(
  items: T[],
  renderItem: (item: T) => React.ReactNode,
  groupBy: "none" | "day",
) {
  if (groupBy === "day") {
    const byDay = new Map<string, T[]>();
    for (const a of items) {
      const key = getDayKey(a.timestamp);
      if (!byDay.has(key)) byDay.set(key, []);
      byDay.get(key)!.push(a);
    }
    const entries = Array.from(byDay.entries());
    return (
      <div className="astw:flex astw:flex-col astw:gap-8">
        {entries.map(([dayLabel, dayItems]) => renderSection(dayItems, renderItem, dayLabel))}
      </div>
    );
  }
  return (
    <div className="astw:flex astw:flex-col astw:gap-5">
      {renderSection(items, renderItem, null)}
    </div>
  );
}

function Items<T extends ActivityCardBaseItem>({ children }: ActivityCardItemsProps<T>) {
  const { activities, maxVisible, overflowLabel, groupBy } = useActivityCardContext<T>();

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

  return (
    <>
      <div className="astw:relative astw:px-6 astw:pb-5">
        <div className="astw:relative astw:flex astw:flex-col">
          {visible.length === 0 ? (
            <p className="astw:text-sm astw:text-muted-foreground">No activities yet</p>
          ) : (
            renderList(visible, children, groupBy)
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
            {renderList(activities, children, groupBy)}
          </div>
        </Dialog.Content>
      </Dialog.Root>
    </>
  );
}
Items.displayName = "ActivityCard.Items";

// ============================================================================
// ITEM
// ============================================================================

function Item({ indicator, children, className }: ActivityCardItemProps) {
  const hasCustomIndicator = indicator != null;

  return (
    <div
      data-slot="activity-card-item"
      className={cn("astw:relative astw:flex astw:gap-3 astw:min-w-0", className)}
    >
      <div
        data-slot="activity-card-indicator"
        className={cn(
          "astw:relative astw:z-10 astw:flex astw:size-7 astw:shrink-0 astw:items-center astw:justify-center astw:rounded-full",
          hasCustomIndicator ? "astw:bg-card" : "astw:bg-transparent",
        )}
      >
        {indicator ?? <div className="astw:size-2.5 astw:rounded-full astw:bg-border" />}
      </div>
      <div className="astw:flex astw:min-w-0 astw:flex-1 astw:flex-col astw:gap-1">{children}</div>
    </div>
  );
}
Item.displayName = "ActivityCard.Item";

// ============================================================================
// PARTS EXPORT
// ============================================================================

export { Root, Items, Item };
