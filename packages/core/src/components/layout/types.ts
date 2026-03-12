import type { ReactNode } from "react";

// ============================================================================
// LAYOUT TYPES
// ============================================================================

/**
 * Supported column count options
 */
export type ColumnCount = 1 | 2 | 3;

/**
 * Supported area values for Layout.Column
 */
export type ColumnArea = "left" | "main" | "right";

/**
 * Props for the Layout component
 */
export interface LayoutProps {
  /**
   * Number of columns (1, 2, or 3).
   *
   * @deprecated Auto-detected from Layout.Column children count when omitted.
   */
  columns?: ColumnCount;
  /** Additional CSS classes */
  className?: string;
  /**
   * Gap between columns (default: 4 = 16px)
   *
   * @deprecated Use className (e.g. className="gap-6") instead.
   */
  gap?: number;
  /** Header title - displayed at the top of the layout */
  title?: string;
  /** Header actions displayed on the right side of the header.
   * Layout and spacing are handled automatically.
   *
   * @deprecated Use `<Layout.Header actions={...}>` instead.
   */
  actions?: ReactNode[];
  /** Child elements - Layout.Header and/or Layout.Column components */
  children: ReactNode;
}

/**
 * Props for individual Layout.Column component
 */
export interface ColumnProps {
  /** Additional CSS classes */
  className?: string;
  /**
   * Column area role. When specified on all columns, determines width template
   * based on role rather than position.
   * - "left": fixed 320px
   * - "main": flex-1
   * - "right": fixed 280px
   */
  area?: ColumnArea;
  /** Child content */
  children?: ReactNode;
}

/**
 * Props for Layout.Header component
 */
export interface LayoutHeaderProps {
  /** Page title (left side) */
  title?: string;
  /** Action buttons or nodes (right side) */
  actions?: ReactNode[];
  /** Renders full-width below the title/actions row (e.g. tabs) */
  children?: ReactNode;
}

/**
 * Resource-level layout configuration (metadata only)
 */
export interface ResourceLayoutConfig {
  /** Number of columns for documentation purposes */
  columns: ColumnCount;
}
