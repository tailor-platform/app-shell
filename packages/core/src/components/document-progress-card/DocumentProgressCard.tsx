import type { ReactNode } from "react";

import { cn } from "../../lib/utils";
import { Card } from "../card";
import type {
  DocumentProgressCardProps,
  DocumentProgressColor,
  DocumentProgressItem,
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

const RECEIVED_DEFAULTS = { label: "Received items", color: "indigo" as const };
const RETURNED_DEFAULTS = { label: "Returned items", color: "pink" as const };
const YET_TO_RECEIVE_DEFAULTS = { label: "Yet to receive", color: "neutral" as const };

// ============================================================================
// HELPERS
// ============================================================================

/** Clamp a fraction to the [0, 1] range, guarding against a zero denominator. */
const calculateRate = (numerator: number, denominator: number) =>
  denominator > 0 ? Math.min(1, Math.max(0, numerator / denominator)) : 0;

// ============================================================================
// DOCUMENT PROGRESS CARD
// ============================================================================

/**
 * DocumentProgressCard — visualises a transactional document's fulfilment state:
 * a completion percentage, a stacked progress bar, and a status legend.
 *
 * Presentational only — pass in the raw `received` / `returned` / `yetToReceive`
 * amounts and the component derives the percentage and bar widths. `total` is
 * `received + yetToReceive` (returned is a subset of received).
 *
 * @example
 * ```tsx
 * <DocumentProgressCard
 *   received={{ value: 12 }}
 *   returned={{ value: 2 }}
 *   yetToReceive={{ value: 28 }}
 * />
 * ```
 */
export function DocumentProgressCard({
  received,
  returned,
  yetToReceive,
  title = "Fulfilment rate",
  returnedCountsAsComplete = true,
  className,
}: DocumentProgressCardProps) {
  const receivedValue = received.value;
  const returnedValue = returned.value;
  const yetToReceiveValue = yetToReceive.value;

  const total = receivedValue + yetToReceiveValue;

  const completeCount = returnedCountsAsComplete ? receivedValue : receivedValue - returnedValue;
  const percent = Math.round(100 * calculateRate(completeCount, total));

  // Bar splits the received portion into "net received" (received − returned) and
  // "returned"; the unfilled remainder represents the yet-to-receive amount.
  const fractionReceived = calculateRate(receivedValue - returnedValue, total);
  const fractionReturned = calculateRate(returnedValue, total);

  const legend: Array<{
    key: string;
    item: DocumentProgressItem;
    defaults: { label: string; color: DocumentProgressColor };
  }> = [
    { key: "received", item: received, defaults: RECEIVED_DEFAULTS },
    { key: "returned", item: returned, defaults: RETURNED_DEFAULTS },
    { key: "yetToReceive", item: yetToReceive, defaults: YET_TO_RECEIVE_DEFAULTS },
  ];

  return (
    <Card.Root
      data-slot="document-progress-card"
      data-percent={percent}
      className={cn("astw:gap-5 astw:px-6 astw:py-5", className)}
    >
      {/* Header: title + completion percentage */}
      <div className="astw:flex astw:items-start astw:justify-between astw:gap-4 astw:text-lg astw:font-semibold astw:leading-none astw:text-card-foreground">
        <span className="astw:min-w-0">{title}</span>
        <span className="astw:shrink-0 astw:text-right" data-slot="document-progress-percent">
          {percent}%
        </span>
      </div>

      {/* Bar + legend */}
      <div className="astw:flex astw:flex-col astw:gap-4">
        {/* Decorative — the percentage and legend convey the same values as text. */}
        <div
          className="astw:bg-muted astw:flex astw:h-2 astw:w-full astw:overflow-hidden astw:rounded-full"
          data-slot="document-progress-bar"
          aria-hidden
        >
          {fractionReceived > 0 && (
            <div
              data-slot="document-progress-segment"
              data-segment="received"
              className={cn("astw:h-full", colorFill[received.color ?? RECEIVED_DEFAULTS.color])}
              style={{ width: `${fractionReceived * 100}%` }}
            />
          )}
          {fractionReturned > 0 && (
            <div
              data-slot="document-progress-segment"
              data-segment="returned"
              className={cn("astw:h-full", colorFill[returned.color ?? RETURNED_DEFAULTS.color])}
              style={{ width: `${fractionReturned * 100}%` }}
            />
          )}
        </div>

        <div className="astw:flex astw:flex-col astw:gap-2">
          {legend.map(({ key, item, defaults }) => (
            <LegendRow
              key={key}
              label={item.label ?? defaults.label}
              color={item.color ?? defaults.color}
              value={item.value}
            />
          ))}
        </div>
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
