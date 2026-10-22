import type { ReactNode } from "react";

// ============================================================================
// ACTION ITEM
// ============================================================================

/**
 * A single action row in the ActionPanel (icon + label, triggered by onClick).
 * For navigation, call useNavigate() inside onClick (e.g. navigate("/path")).
 */
export interface ActionItem {
  /** Unique key for React */
  key: string;
  /** Visible label */
  label: string;
  /** Icon: any component or SVG; rendered in a fixed-size slot (e.g. 16px) */
  icon: ReactNode;
  /** Called when the row is clicked. For navigation, use useNavigate() inside the callback. */
  onClick?: () => void | Promise<void>;
  /** Optional; disable the row */
  disabled?: boolean;
  /** When true, show loading indicator in the row and make it non-interactive */
  loading?: boolean;
  /** Visual variant. Use "destructive" for dangerous actions like delete. */
  variant?: "default" | "destructive";
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
  /**
   * Content shown with consistent padding when actions is empty. Defaults to a styled "No actions available" message.
   * Pass null to hide the empty content and its additional vertical spacing while keeping the card and title.
   */
  emptyContent?: ReactNode;
  /** Additional CSS classes for the card container */
  className?: string;
}
