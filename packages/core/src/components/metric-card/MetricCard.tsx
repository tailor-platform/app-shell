import { cn } from "../../lib/utils";
import { Card } from "../card";
import type { MetricCardProps, MetricCardTrendDirection } from "./types";

// ============================================================================
// CONSTANTS
// ============================================================================

const iconSlotClasses =
  "astw:flex astw:size-4 astw:items-center astw:justify-center astw:shrink-0 astw:text-muted-foreground";

const trendDirectionClasses: Record<MetricCardTrendDirection, string> = {
  up: "astw:text-green-600 dark:astw:text-green-400",
  down: "astw:text-red-600 dark:astw:text-red-400",
  neutral: "astw:text-muted-foreground",
};

// ============================================================================
// METRIC CARD
// ============================================================================

/**
 * MetricCard — Compact card for dashboard KPI display (title, value, optional trend and description).
 *
 * Static display only in v1. Use for summary metrics (e.g. net total, discount total).
 * Styling follows existing card conventions (bg-card, border, rounded-xl).
 *
 * @example
 * ```tsx
 * <MetricCard
 *   title="Net total payment"
 *   value="$1,500.00"
 *   trend={{ direction: "up", value: "+5%" }}
 *   description="vs last month"
 * />
 * ```
 */
export function MetricCard({ title, value, trend, description, icon, className }: MetricCardProps) {
  const hasMeta = trend != null || (description != null && description !== "");

  return (
    <Card.Root
      data-slot="metric-card"
      className={cn("astw:min-w-0 astw:w-full astw:px-4 astw:py-4", className)}
    >
      {/* Top row: optional icon + title */}
      <div className="astw:flex astw:items-center astw:gap-2 astw:mb-6">
        {icon != null && (
          <span className={iconSlotClasses} aria-hidden>
            {icon}
          </span>
        )}
        <span className="astw:text-sm astw:font-medium astw:text-muted-foreground astw:min-w-0 astw:truncate">
          {title}
        </span>
      </div>

      {/* Main value */}
      <div className="astw:text-2xl astw:font-bold astw:tracking-tight astw:break-words">
        {value}
      </div>

      {/* Optional meta row: trend + description */}
      {hasMeta && (
        <div className="astw:mt-2 astw:flex astw:items-center astw:gap-2 astw:flex-wrap">
          {trend != null && (
            <span
              className={cn(
                "astw:text-sm astw:font-medium",
                trendDirectionClasses[trend.direction],
              )}
              data-direction={trend.direction}
            >
              {trend.value}
            </span>
          )}
          {description != null && description !== "" && (
            <span className="astw:text-sm astw:text-muted-foreground astw:truncate">
              {description}
            </span>
          )}
        </div>
      )}
    </Card.Root>
  );
}

// ============================================================================
// EXPORTS
// ============================================================================

export default MetricCard;
