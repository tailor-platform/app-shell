import type * as React from "react";

// ============================================================================
// BASE ITEM CONSTRAINT
// ============================================================================

/**
 * Minimum shape required for items passed to ActivityCard.
 * Consumers can extend this with any additional fields.
 */
export interface ActivityCardBaseItem {
  id: string;
  timestamp: Date | string;
}

// ============================================================================
// ACTIVITY ITEM (standalone API)
// ============================================================================

/**
 * A single activity entry used by the standalone ActivityCard component.
 */
export interface ActivityCardItem extends ActivityCardBaseItem {
  /**
   * The subject of the activity. Optional — omit for system events with no specific actor
   * (e.g. "Status automatically changed to EXPIRED").
   */
  actor?: {
    /** Display name of the actor (user, bot, service account, etc.). */
    name: string;
    /** Avatar image URL. Falls back to initials derived from `name`. */
    avatarUrl?: string;
  };
  description: string;
}

// ============================================================================
// COMPOUND COMPONENT PROPS
// ============================================================================

/**
 * Props for ActivityCard.Root — the outermost card container.
 */
export interface ActivityCardRootProps<T extends ActivityCardBaseItem> {
  /** List of items (newest first). */
  items: T[];
  /** Card title, e.g. "Updates". */
  title?: string;
  /** Max number of activities shown in the card before overflow. Default 6. */
  maxVisible?: number;
  /** Overflow label style: "more" = "N more activities", "count" = "+N". Default "more". */
  overflowLabel?: "more" | "count";
  /** Optional grouping by day (TODAY / YESTERDAY / date). */
  groupBy?: "none" | "day";
  className?: string;
  children: React.ReactNode;
}

/**
 * Props for ActivityCard.Items — iterates over items and renders each via children render function.
 */
export interface ActivityCardItemsProps<T extends ActivityCardBaseItem> {
  children: (item: T) => React.ReactNode;
}

/**
 * Props for ActivityCard.Item — a single row in the timeline.
 */
export interface ActivityCardItemProps {
  /** Element rendered in the left column (e.g. Avatar, Icon). The timeline connector line
   *  passes through the center of this element. Omit for rows without a connector. */
  indicator?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

// ============================================================================
// STANDALONE COMPONENT PROPS (backwards-compatible)
// ============================================================================

/**
 * Props for the standalone (pre-assembled) ActivityCard component.
 */
export interface ActivityCardProps {
  /** List of items (newest first). */
  items: ActivityCardItem[];
  /** Card title, e.g. "Updates". */
  title?: string;
  /** Max number of activities shown in the card before overflow. Default 6. */
  maxVisible?: number;
  /** Overflow label style: "more" = "N more activities", "count" = "+N". Default "more". */
  overflowLabel?: "more" | "count";
  /** Optional grouping by day (TODAY / YESTERDAY / date). */
  groupBy?: "none" | "day";
  className?: string;
}
