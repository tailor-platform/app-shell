import * as React from "react";
import { FileTextIcon, ExternalLinkIcon } from "lucide-react";

import { Badge } from "../badge";
import { Card } from "../card";
import type { LinkedRecordsCardProps, LinkedRecord } from "./types";

const DEFAULT_ICON = <FileTextIcon className="astw:size-4" />;

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function RecordRow({ record }: { record: LinkedRecord }) {
  const icon = record.icon ?? DEFAULT_ICON;

  return (
    <div className="astw:flex astw:items-center astw:gap-2 astw:min-w-0">
      <span className="astw:text-muted-foreground astw:shrink-0">{icon}</span>
      <a
        href={record.href}
        title={record.label}
        className="astw:text-sm astw:font-medium astw:text-foreground astw:hover:underline astw:truncate astw:min-w-0 astw:flex-1"
      >
        {record.label}
        <ExternalLinkIcon className="astw:inline astw:size-3 astw:ml-1 astw:text-muted-foreground" />
      </a>
      <Badge variant={record.statusVariant ?? "outline-neutral"} className="astw:shrink-0">
        {record.status}
      </Badge>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

/**
 * LinkedRecordsCard displays a flat list of linked records as compact rows.
 * Designed for the right sidebar of detail pages.
 *
 * @example
 * ```tsx
 * <LinkedRecordsCard
 *   title="Related Documents"
 *   records={[
 *     { id: "1", type: "order", label: "ORD-001", href: "/orders/1", status: "Confirmed", statusVariant: "outline-success" },
 *     { id: "2", type: "receipt", label: "REC-001", href: "/receipts/1", status: "Received", statusVariant: "outline-success" },
 *   ]}
 * />
 * ```
 */
export function LinkedRecordsCard({
  title = "Related Documents",
  records,
  className,
}: LinkedRecordsCardProps) {
  return (
    <Card.Root data-slot="linked-records-card" className={className}>
      <Card.Header>
        {typeof title === "string" ? (
          <h3 className="astw:leading-none astw:font-semibold">{title}</h3>
        ) : (
          title
        )}
      </Card.Header>
      <Card.Content>
        {records.length === 0 ? (
          <p className="astw:text-sm astw:text-muted-foreground">No linked records</p>
        ) : (
          <div className="astw:flex astw:flex-col astw:gap-2">
            {records.map((record) => (
              <RecordRow key={record.id} record={record} />
            ))}
          </div>
        )}
      </Card.Content>
    </Card.Root>
  );
}

export default LinkedRecordsCard;
