import type { ReactNode } from "react";

// ============================================================================
// LAYOUT V2 TYPES
// ============================================================================

/**
 * Props for the LayoutV2 component.
 * Slot-based API: pass main, columnLeft, and/or columnRight to get 1-, 2-, or 3-column layouts.
 * main is required when any side column is present.
 */
export interface LayoutV2Props {
  /** Main content (required for 2- and 3-column; when alone, renders 1 column) */
  main?: ReactNode;
  /** Left column content (with main → 2 columns; with main + columnRight → 3 columns) */
  columnLeft?: ReactNode;
  /** Right column content (with main → 2 columns; with columnLeft + main → 3 columns) */
  columnRight?: ReactNode;
  /** Additional CSS classes for the flex container */
  className?: string;
  /** Gap between columns as a CSS length (e.g. "16px", "1.5rem"). Default 16px. */
  gap?: string;

  // Column dimension overrides (CSS length strings, e.g. "320px", "20rem")
  /** Override width for columnLeft (default 320px) */
  columnLeftWidth?: string;
  columnLeftMinWidth?: string;
  columnLeftMaxWidth?: string;
  /** Override width for columnRight (default 320px) */
  columnRightWidth?: string;
  columnRightMinWidth?: string;
  columnRightMaxWidth?: string;
  /** Override width for main (default: flex) */
  mainWidth?: string;
  mainMinWidth?: string;
  mainMaxWidth?: string;
}
