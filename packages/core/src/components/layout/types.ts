import type { ReactNode } from "react";

// ============================================================================
// LAYOUT TYPES
// ============================================================================

/**
 * Props for the Layout component.
 * Composition only: children must be Layout.Left, Layout.Main, and/or Layout.Right.
 * Column dimensions via className on each slot.
 */
export interface LayoutProps {
  /** Additional CSS classes for the flex container */
  className?: string;
}

/**
 * Props for Layout.Left (composition API)
 */
export interface LayoutLeftProps {
  /** Column content */
  children?: ReactNode;
  /** CSS classes for the left column wrapper (e.g. width overrides) */
  className?: string;
}

/**
 * Props for Layout.Main (composition API)
 */
export interface LayoutMainProps {
  /** Column content */
  children?: ReactNode;
  /** CSS classes for the main column wrapper */
  className?: string;
}

/**
 * Props for Layout.Right (composition API)
 */
export interface LayoutRightProps {
  /** Column content */
  children?: ReactNode;
  /** CSS classes for the right column wrapper (e.g. width overrides) */
  className?: string;
}

/**
 * Resource-level layout configuration (metadata only)
 */
export interface ResourceLayoutConfig {
  /** Number of columns for documentation purposes */
  columns: 1 | 2 | 3;
}
