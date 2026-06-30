import type { ReactNode } from "react";

import type { DocumentProgressColor } from "../document-progress-card/types";

// ============================================================================
// ITEM
// ============================================================================

/**
 * A receiving bucket: its amount, an optional legend label, and an optional
 * color override. Labels and colors fall back to per-bucket defaults.
 */
export interface ProcurementFulfilmentItem {
  /** Numeric amount. */
  value: number;
  /** Legend label. Defaults per bucket (e.g. "Received items"). */
  label?: string;
  /** Marker / bar color. Defaults per bucket (received → indigo, etc.). */
  color?: DocumentProgressColor;
}

// ============================================================================
// COMPONENT PROPS
// ============================================================================

/**
 * Props for the ProcurementFulfilmentProgressCard component.
 */
export interface ProcurementFulfilmentProgressCardProps {
  /** Items received so far (default label "Received items", color "indigo"). */
  received: ProcurementFulfilmentItem;
  /** Items received then returned (default label "Returned items", color "pink"). */
  returned: ProcurementFulfilmentItem;
  /** Items not yet received (default label "Yet to receive", color "neutral"). */
  yetToReceive: ProcurementFulfilmentItem;
  /** Card title shown top-left. Defaults to "Fulfilment rate". */
  title?: ReactNode;
  /**
   * Whether returned items count toward the completion percentage.
   * - `true` (default): `percent = received / total` — returned items still count
   *   as received/complete.
   * - `false`: `percent = (received − returned) / total` — returned items are
   *   subtracted from progress.
   *
   * `total` is `received + yetToReceive` (returned is a subset of received and
   * does not affect the denominator).
   */
  returnedCountsAsComplete?: boolean;
  /** Additional CSS classes for the card root. */
  className?: string;
}
