import * as React from "react";
import { FileTextIcon, TruckIcon, ReceiptIcon, PackageIcon, ExternalLinkIcon } from "lucide-react";

import { Badge } from "../badge";
import { Card } from "../card";
import type { LinkedRecordsCardProps, LinkedRecord } from "./types";

// ============================================================================
// DEFAULT ICONS
// ============================================================================

const DEFAULT_TYPE_ICONS: Record<string, React.ReactNode> = {
  purchase_order: <FileTextIcon className="astw:size-4" />,
  goods_receipt: <TruckIcon className="astw:size-4" />,
  purchase_invoice: <ReceiptIcon className="astw:size-4" />,
  purchase_bill: <ReceiptIcon className="astw:size-4" />,
};

const FALLBACK_ICON = <PackageIcon className="astw:size-4" />;

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function RecordRow({ record }: { record: LinkedRecord }) {
  const icon = DEFAULT_TYPE_ICONS[record.type] ?? FALLBACK_ICON;

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
 *     { id: "po-1", type: "purchase_order", label: "PO-105539", href: "/po/105539", status: "Approved", statusVariant: "outline-success" },
 *     { id: "gr-1", type: "goods_receipt", label: "GR-200145", href: "/gr/200145", status: "Received", statusVariant: "outline-success" },
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
    <Card.Root className={className}>
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
