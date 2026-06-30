import { DocumentProgressCard } from "../document-progress-card";
import type { ProcurementFulfilmentProgressCardProps } from "./types";

// ============================================================================
// CONSTANTS
// ============================================================================

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
// PROCUREMENT FULFILMENT PROGRESS CARD
// ============================================================================

/**
 * ProcurementFulfilmentProgressCard — opinionated wrapper over
 * `DocumentProgressCard` for the goods-receipt model: items received,
 * returned, and yet to receive against a purchase order.
 *
 * Owns the receiving business logic — derives the completion percentage,
 * clamps `returned` to `received`, and splits the bar into a net-received
 * segment plus a returned segment — while delegating all rendering to the
 * generic card. Labels and colors remain overridable per bucket.
 *
 * @example
 * ```tsx
 * <ProcurementFulfilmentProgressCard
 *   received={{ value: 12 }}
 *   returned={{ value: 2 }}
 *   yetToReceive={{ value: 28 }}
 * />
 * ```
 */
export function ProcurementFulfilmentProgressCard({
  received,
  returned,
  yetToReceive,
  title = "Fulfilment rate",
  returnedCountsAsComplete = true,
  className,
}: ProcurementFulfilmentProgressCardProps) {
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

  const receivedLabel = received.label ?? RECEIVED_DEFAULTS.label;
  const returnedLabel = returned.label ?? RETURNED_DEFAULTS.label;
  const yetToReceiveLabel = yetToReceive.label ?? YET_TO_RECEIVE_DEFAULTS.label;

  const receivedColor = received.color ?? RECEIVED_DEFAULTS.color;
  const returnedColor = returned.color ?? RETURNED_DEFAULTS.color;
  const yetToReceiveColor = yetToReceive.color ?? YET_TO_RECEIVE_DEFAULTS.color;

  return (
    <DocumentProgressCard
      title={title}
      percent={percent}
      total={total}
      className={className}
      // Bar: net-received (received − returned) + returned. The yet-to-receive
      // remainder shows as the unfilled track via `total`.
      segments={[
        { label: receivedLabel, value: receivedValue - effectiveReturned, color: receivedColor },
        { label: returnedLabel, value: effectiveReturned, color: returnedColor },
      ]}
      // Legend: the three buckets as provided (received shows the full amount).
      legend={[
        { label: receivedLabel, value: receivedValue, color: receivedColor },
        { label: returnedLabel, value: returnedValue, color: returnedColor },
        { label: yetToReceiveLabel, value: yetToReceiveValue, color: yetToReceiveColor },
      ]}
    />
  );
}

// ============================================================================
// EXPORTS
// ============================================================================

export default ProcurementFulfilmentProgressCard;
