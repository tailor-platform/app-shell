import type { ReactNode } from "react";

// ============================================================================
// ACTION ITEM
// ============================================================================

/**
 * A single action row in the ActionPanel (icon + label, triggered by onClick or href).
 */
export interface ActionItem {
  /** Unique key for React */
  key: string;
  /** Visible label */
  label: string;
  /** Icon: any component or SVG; rendered in a fixed-size slot (e.g. 16px) */
  icon: ReactNode;
  /** Called when the row is clicked (run a function, modal, navigate, etc.) */
  onClick?: () => void | Promise<void>;
  /** If set, render as `<a>` for navigation; use when the action is "go to URL" */
  href?: string;
  /** Optional; disable the row */
  disabled?: boolean;
  /** When true, show loading indicator in the row and make it non-interactive (e.g. while executing) */
  loading?: boolean;
}

// ============================================================================
// COMPONENT PROPS
// ============================================================================

/**
 * Props for the ActionPanel component.
 */
export interface ActionPanelProps {
  /** Card title */
  title: string;
  /** List of actions to render */
  actions: ActionItem[];
  /** Additional CSS classes for the card container */
  className?: string;
}
