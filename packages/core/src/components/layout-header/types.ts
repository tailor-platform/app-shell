import type { ReactNode } from "react";

// ============================================================================
// LAYOUT HEADER TYPES
// ============================================================================

/**
 * Props for the LayoutHeader component.
 * Standalone header for page title and actions; compose with Layout.
 */
export interface LayoutHeaderProps {
  /** Page title (left side) */
  title?: string;
  /** Action buttons or nodes (right side). Use ReactNode (e.g. Fragment or single element). */
  actions?: ReactNode;
  /** Renders full-width below the title/actions row (e.g. tabs) */
  children?: ReactNode;
}
