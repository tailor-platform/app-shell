import type * as React from "react";

/**
 * A single linked record to display in the card.
 */
export interface LinkedRecord {
  /** Unique identifier. */
  id: string;
  /** Record type key, used for icon selection (e.g. "purchase_order", "goods_receipt"). */
  type: string;
  /** Display label (e.g. "PO-105539"). */
  label: string;
  /** Navigation href. */
  href: string;
  /** Human-readable status text (e.g. "Approved", "Draft"). */
  status: string;
  /** Badge variant for the status. Falls back to "outline-neutral" if omitted. */
  statusVariant?:
    | "outline-success"
    | "outline-warning"
    | "outline-error"
    | "outline-info"
    | "outline-neutral";
  /** Group key for visual separation. Records with different groups are separated by a divider. */
  group?: string;
  /** Label for the group section (e.g. "Created Invoice", "Related Documents"). Shown once per group. */
  groupLabel?: string;
}

/**
 * Optional match score display config.
 */
export interface MatchScoreConfig {
  /** Numeric score 0-100. */
  value: number;
  /** Human-readable status label (e.g. "Matched", "Partial Match"). */
  statusLabel?: string;
  /** Badge variant for the status label. */
  statusVariant?: "default" | "success" | "warning" | "error";
}

/**
 * Props for the LinkedRecordsCard component.
 */
export interface LinkedRecordsCardProps {
  /** Card title. Default: "Related Documents". */
  title?: string;
  /** List of linked records to display as compact rows. */
  records: LinkedRecord[];
  /** Optional match score displayed in the card header. */
  matchScore?: MatchScoreConfig;
  /** Override the default icon for a record type. Key = type string. */
  typeIcons?: Record<string, React.ReactNode>;
  /** Additional CSS classes on the root card. */
  className?: string;
}
