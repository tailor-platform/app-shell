import type { ReactNode } from "react";

import { cn } from "../../lib/utils";
import { Card } from "../card";
import type { DocumentProgressCardProps, DocumentProgressColor } from "./types";

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

/** Coerce an input amount to a non-negative, finite number (NaN/Infinity/negative → 0). */
const sanitizeValue = (value: number) => (Number.isFinite(value) ? Math.max(0, value) : 0);

// ============================================================================
// DOCUMENT PROGRESS CARD
// ============================================================================

/**
 * DocumentProgressCard — visualises a transactional document's fulfilment state:
 * a completion percentage, a stacked progress bar, and a status legend.
 *
 * Presentational only — pass in the raw `received` / `returned` / `yetToReceive`
 * amounts and the component derives the percentage and bar widths. `total` is
 * `received + yetToReceive` (returned is a subset of received). Amounts are
 * expected to be non-negative numbers; non-finite or negative inputs are
 * coerced to 0, and `returned` is clamped to `received`.
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
  const receivedValue = sanitizeValue(received.value);
  const returnedValue = sanitizeValue(returned.value);
  const yetToReceiveValue = sanitizeValue(yetToReceive.value);

  const total = receivedValue + yetToReceiveValue;

  // Returned is a subset of received; clamp so the breakdown can never exceed it.
  const effectiveReturned = Math.min(returnedValue, receivedValue);

  const completeCount = returnedCountsAsComplete
    ? receivedValue
    : receivedValue - effectiveReturned;
  const percent = Math.round(100 * calculateRate(completeCount, total));

  // The colored fill always sums to `percent`: the net-received segment (indigo) is
  // always complete; the returned segment (pink) is part of the fill only when it
  // counts as complete. The unfilled remainder represents the yet-to-receive amount.
  const fractionNetReceived = calculateRate(receivedValue - effectiveReturned, total);
  const fractionReturned = returnedCountsAsComplete ? calculateRate(effectiveReturned, total) : 0;

  const legend: Array<{
    key: string;
    label: string;
    color: DocumentProgressColor;
    value: number;
  }> = [
    {
      key: "received",
      label: received.label ?? RECEIVED_DEFAULTS.label,
      color: received.color ?? RECEIVED_DEFAULTS.color,
      value: receivedValue,
    },
    {
      key: "returned",
      label: returned.label ?? RETURNED_DEFAULTS.label,
      color: returned.color ?? RETURNED_DEFAULTS.color,
      value: returnedValue,
    },
    {
      key: "yetToReceive",
      label: yetToReceive.label ?? YET_TO_RECEIVE_DEFAULTS.label,
      color: yetToReceive.color ?? YET_TO_RECEIVE_DEFAULTS.color,
      value: yetToReceiveValue,
    },
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
          {fractionNetReceived > 0 && (
            <div
              data-slot="document-progress-segment"
              data-segment="received"
              className={cn("astw:h-full", colorFill[received.color ?? RECEIVED_DEFAULTS.color])}
              style={{ width: `${fractionNetReceived * 100}%` }}
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
          {legend.map(({ key, label, color, value }) => (
            <LegendRow key={key} label={label} color={color} value={value} />
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
