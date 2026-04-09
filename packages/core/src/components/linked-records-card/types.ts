import type * as React from "react";

/**
 * A single linked record to display in the card.
 */
export interface LinkedRecord {
  /** Unique identifier. */
  id: string;
  /** Record type key. */
  type: string;
  /** Display label (e.g. "PO-105539"). */
  label: string;
  /** Optional icon to display before the label. */
  icon?: React.ReactNode;
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
}

/**
 * Props for the LinkedRecordsCard component.
 */
export interface LinkedRecordsCardProps {
  /** Card header. String renders as title, ReactNode for custom content. */
  title?: React.ReactNode;
  /** Flat list of linked records to display as compact rows. */
  records: LinkedRecord[];
  /** Additional CSS classes on the root card. */
  className?: string;
}
