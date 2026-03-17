// ============================================================================
// ACTIVITY ITEM
// ============================================================================

/**
 * A single activity entry in the ActivityCard timeline.
 */
export interface ActivityCardActivity {
  id: string;
  userDisplayName: string;
  userAvatarUrl?: string;
  description: string;
  timestamp: Date | string;
}

// ============================================================================
// COMPONENT PROPS
// ============================================================================

/**
 * Props for the ActivityCard component.
 */
export interface ActivityCardProps {
  /** List of activities (newest first). */
  activities: ActivityCardActivity[];
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
