import type { ReactNode } from "react";

// ============================================================================
// TREND
// ============================================================================

/**
 * Trend direction for metric display (e.g. up = positive, down = negative).
 */
export type MetricCardTrendDirection = "up" | "down" | "neutral";

export interface MetricCardTrend {
  /** Visual and semantic direction */
  direction: MetricCardTrendDirection;
  /** Display value (e.g. "+12%", "-5%") */
  value: string;
}

// ============================================================================
// COMPONENT PROPS
// ============================================================================

/**
 * Props for the MetricCard component.
 */
export interface MetricCardProps {
  /** Metric title / header (e.g. "Net total payment") */
  title: string;
  /** Primary value (e.g. formatted currency or number) */
  value: ReactNode;
  /** Optional trend indicator */
  trend?: MetricCardTrend;
  /**
   * Optional supplementary description (e.g. "vs last period", "this week").
   * Empty strings are treated as absent and the description is not rendered in the meta row.
   */
  description?: string;
  /** Optional leading icon */
  icon?: ReactNode;
  /** Additional CSS classes for the card container */
  className?: string;
}
