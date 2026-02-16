import type { ReactNode } from "react";

// ============================================================================
// LAYOUT TYPES
// ============================================================================

/**
 * Supported column count options
 */
export type ColumnCount = 1 | 2 | 3;

/**
 * Props for the Layout component
 */
export interface LayoutProps {
  /**
   * Number of columns (1, 2, or 3).
   *
   * **Required.** Must match the exact number of `Layout.Column` children.
   * The component will throw an error in development if there's a mismatch.
   */
  columns: ColumnCount;
  /** Additional CSS classes */
  className?: string;
  /** Gap between columns (default: 4 = 16px) */
  gap?: number;
  /** Header title - displayed at the top of the layout */
  title?: string;
  /** Header actions - array of action components (e.g., buttons) displayed on the right side of the header.
   * Layout and spacing are handled automatically. */
  actions?: ReactNode[];
  /** Child elements - must be exactly `columns` number of Layout.Column components */
  children: ReactNode;
}

/**
 * Props for individual Layout.Column component
 */
export interface ColumnProps {
  /** Additional CSS classes */
  className?: string;
  /** Child content */
  children?: ReactNode;
}

/**
 * Resource-level layout configuration (metadata only)
 */
export interface ResourceLayoutConfig {
  /** Number of columns for documentation purposes */
  columns: ColumnCount;
}
