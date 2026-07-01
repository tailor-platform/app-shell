import type { ReactNode } from "react";

import { cn } from "../../lib/utils";
import { Card } from "../card";
import type {
  DocumentProgressCardProps,
  DocumentProgressColor,
  DocumentProgressSegment,
} from "./types";

// ============================================================================
// CONSTANTS
// ============================================================================

/** Maps a palette color to its fill class (used for the bar and legend marker). */
const colorFill: Record<DocumentProgressColor, string> = {
  indigo: "astw:bg-indigo-500",
  pink: "astw:bg-pink-500",
  green: "astw:bg-green-500",
  amber: "astw:bg-amber-500",
  red: "astw:bg-red-500",
  blue: "astw:bg-blue-500",
  neutral: "astw:bg-muted-foreground/40",
};

// ============================================================================
// HELPERS
// ============================================================================

/** Clamp a fraction to the [0, 1] range, guarding against a zero denominator. */
const calculateRate = (numerator: number, denominator: number) =>
  denominator > 0 ? Math.min(1, Math.max(0, numerator / denominator)) : 0;

/** Coerce an input amount to a non-negative, finite number (NaN/Infinity/negative → 0). */
const sanitizeValue = (value: number) => (Number.isFinite(value) ? Math.max(0, value) : 0);

/** Sanitize each segment's value. */
const resolveSegments = (segments: DocumentProgressSegment[]) =>
  segments.map((segment) => ({
    label: segment.label,
    value: sanitizeValue(segment.value),
    color: segment.color,
  }));

// ============================================================================
// DOCUMENT PROGRESS CARD
// ============================================================================

/**
 * DocumentProgressCard — a generic, presentational card for a document's
 * lifecycle/fulfilment state: an optional headline percentage, a stacked
 * progress bar, and a status legend.
 *
 * View-only and domain-agnostic — pass an arbitrary set of `segments` (e.g.
 * shipped / returned / pending, or cancelled / blocked / …) plus an explicit
 * `percent`. Derive the percentage and, where buckets overlap, the bar
 * breakdown in the consumer (see the docs for a purchase-order example).
 *
 * @example
 * ```tsx
 * <DocumentProgressCard
 *   title="Shipment status"
 *   percent={60}
 *   segments={[
 *     { label: "Shipped", value: 30, color: "green" },
 *     { label: "Returned", value: 3, color: "red" },
 *     { label: "Pending", value: 17, color: "neutral" },
 *   ]}
 * />
 * ```
 */
export function DocumentProgressCard({
  title,
  percent,
  segments,
  legend,
  total,
  className,
}: DocumentProgressCardProps) {
  const barSegments = resolveSegments(segments);
  const legendItems = resolveSegments(legend ?? segments);

  const segmentSum = barSegments.reduce((sum, segment) => sum + segment.value, 0);
  const requestedTotal = total != null && Number.isFinite(total) ? total : 0;
  // Never let the denominator fall below the segment sum (would overflow the bar).
  const denominator = Math.max(segmentSum, requestedTotal);

  const hasPercent = percent != null && Number.isFinite(percent);
  const clampedPercent = hasPercent ? Math.round(Math.min(100, Math.max(0, percent))) : null;

  return (
    <Card.Root
      data-slot="document-progress-card"
      data-percent={clampedPercent ?? undefined}
      className={cn("astw:gap-5 astw:px-6 astw:py-5", className)}
    >
      {/* Header: optional title + optional completion percentage */}
      {(title != null || hasPercent) && (
        <div className="astw:flex astw:items-start astw:justify-between astw:gap-4 astw:text-lg astw:font-semibold astw:leading-none astw:text-card-foreground">
          <span className="astw:min-w-0">{title}</span>
          {hasPercent && (
            <span className="astw:shrink-0 astw:text-right" data-slot="document-progress-percent">
              {clampedPercent}%
            </span>
          )}
        </div>
      )}

      {/* Bar + legend */}
      <div className="astw:flex astw:flex-col astw:gap-4">
        {/* Decorative — the percentage and legend convey the same values as text. */}
        <div
          className="astw:bg-muted astw:flex astw:h-2 astw:w-full astw:overflow-hidden astw:rounded-full"
          data-slot="document-progress-bar"
          aria-hidden
        >
          {barSegments.map((segment, index) => {
            const fraction = calculateRate(segment.value, denominator);
            if (fraction <= 0) return null;
            return (
              <div
                key={index}
                data-slot="document-progress-segment"
                data-color={segment.color}
                className={cn("astw:h-full", colorFill[segment.color])}
                style={{ width: `${fraction * 100}%` }}
              />
            );
          })}
        </div>

        {legendItems.length > 0 && (
          <div className="astw:flex astw:flex-col astw:gap-2">
            {legendItems.map((segment, index) => (
              <LegendRow
                key={index}
                label={segment.label}
                color={segment.color}
                value={segment.value}
              />
            ))}
          </div>
        )}
      </div>
    </Card.Root>
  );
}

// ============================================================================
// LEGEND ROW
// ============================================================================

function LegendRow({
  label,
  color,
  value,
}: {
  label: ReactNode;
  color: DocumentProgressColor;
  value: ReactNode;
}) {
  return (
    <div
      data-slot="document-progress-legend-row"
      className="astw:flex astw:items-center astw:justify-between astw:gap-4"
    >
      <div className="astw:flex astw:min-w-0 astw:items-center astw:gap-1.5">
        <span
          aria-hidden
          className={cn("astw:h-3.5 astw:w-0.5 astw:shrink-0 astw:rounded-md", colorFill[color])}
        />
        <span className="astw:text-muted-foreground astw:truncate astw:text-sm">{label}</span>
      </div>
      <span className="astw:text-card-foreground astw:shrink-0 astw:text-sm">{value}</span>
    </div>
  );
}

// ============================================================================
// EXPORTS
// ============================================================================

export default DocumentProgressCard;
