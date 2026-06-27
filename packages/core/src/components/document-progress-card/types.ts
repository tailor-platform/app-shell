import type { ReactNode } from "react";

// ============================================================================
// COLOR
// ============================================================================

/**
 * Curated palette for progress segments. Each value maps to a fixed fill used
 * for both the stacked bar and the legend marker. Defaults follow the AppShell
 * design (received → indigo, returned → pink, yet-to-receive → neutral).
 */
export type DocumentProgressColor =
  | "indigo"
  | "pink"
  | "green"
  | "amber"
  | "red"
  | "blue"
  | "neutral";

// ============================================================================
// ITEM
// ============================================================================

/**
 * A single status bucket: its amount, an optional legend label, and an optional
 * color override. Labels and colors fall back to sensible defaults per bucket.
 */
export interface DocumentProgressItem {
  /** Numeric amount — shown in the legend and used to size the bar. */
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
 * Props for the DocumentProgressCard component.
 */
export interface DocumentProgressCardProps {
  /** Items received so far (default label "Received items", color "indigo"). */
  received: DocumentProgressItem;
  /** Items received then returned (default label "Returned items", color "pink"). */
  returned: DocumentProgressItem;
  /** Items not yet received (default label "Yet to receive", color "neutral"). */
  yetToReceive: DocumentProgressItem;
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
