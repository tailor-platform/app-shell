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
  /** Metric label (e.g. "Net total payment") */
  label: string;
  /** Primary value (e.g. formatted currency or number) */
  value: ReactNode;
  /** Optional trend indicator */
  trend?: MetricCardTrend;
  /** Optional comparison text (e.g. "vs last period") */
  comparison?: string;
  /** Optional leading icon */
  icon?: ReactNode;
  /** Additional CSS classes for the card container */
  className?: string;
}
