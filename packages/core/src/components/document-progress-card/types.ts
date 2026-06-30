import type { ReactNode } from "react";

// ============================================================================
// COLOR
// ============================================================================

/**
 * Curated palette for progress segments. Each value maps to a fixed fill used
 * for both the stacked bar and the legend marker.
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
// SEGMENT
// ============================================================================

/**
 * A single status segment: its amount, a legend label, and an optional color.
 * When no color is given, one is assigned from a default palette by position.
 */
export interface DocumentProgressSegment {
  /** Legend label (e.g. "Shipped"). */
  label: string;
  /** Amount — shown in the legend and used to size the bar. */
  value: number;
  /** Bar / legend-marker color. Defaults to a palette color by position. */
  color?: DocumentProgressColor;
}

// ============================================================================
// COMPONENT PROPS
// ============================================================================

/**
 * Props for the generic DocumentProgressCard.
 */
export interface DocumentProgressCardProps {
  /** Optional card title shown top-left. */
  title?: ReactNode;
  /**
   * Headline percentage shown top-right (0–100). Optional and explicit — the
   * generic card has no notion of "complete", so the consumer supplies it.
   */
  percent?: number;
  /** Status segments rendered as a single stacked bar (and, by default, the legend). */
  segments: DocumentProgressSegment[];
  /**
   * Legend rows. Defaults to `segments`. Provide this only when the legend
   * should differ from the bar (e.g. overlapping buckets shown distinctly).
   */
  legend?: DocumentProgressSegment[];
  /**
   * Denominator used to size the bar. Defaults to the sum of segment values
   * (the bar is fully tiled). A larger value leaves an unfilled track remainder.
   */
  total?: number;
  /** Additional CSS classes for the card root. */
  className?: string;
}
