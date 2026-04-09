import * as React from "react";
import {
  FileTextIcon,
  TruckIcon,
  ReceiptIcon,
  PackageIcon,
  ExternalLinkIcon,
} from "lucide-react";

import { cn } from "../../lib/utils";
import { Badge } from "../badge";
import { Card } from "../card";
import type { LinkedRecordsCardProps, LinkedRecord, MatchScoreConfig } from "./types";

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
// SCORE COLOR
// ============================================================================

function scoreColor(score: number): string {
  if (score >= 90) return "astw:text-green-700 astw:dark:text-green-500";
  if (score >= 70) return "astw:text-yellow-700 astw:dark:text-yellow-500";
  return "astw:text-destructive";
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function ScoreTitle({ matchScore }: { matchScore: MatchScoreConfig }) {
  return (
    <div className="astw:flex astw:items-center astw:gap-2">
      <span
        className={cn(
          "astw:text-lg astw:font-bold astw:tabular-nums astw:leading-none",
          scoreColor(matchScore.value),
        )}
      >
        {matchScore.value}% {matchScore.statusLabel}
      </span>
    </div>
  );
}

function RecordRow({
  record,
  icon,
}: {
  record: LinkedRecord;
  icon: React.ReactNode;
}) {
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
      <Badge
        variant={record.statusVariant ?? "outline-neutral"}
        className="astw:shrink-0"
      >
        {record.status}
      </Badge>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

/**
 * LinkedRecordsCard displays linked records as compact rows with an optional
 * match score. Designed for the right sidebar of detail pages.
 *
 * Reusable across Reconciliation, Purchase Order, Goods Receipt, and Invoice pages.
 *
 * @example
 * ```tsx
 * <LinkedRecordsCard
 *   records={[
 *     { id: "po-1", type: "purchase_order", label: "PO-105539", href: "/po/105539", status: "Approved", statusVariant: "outline-success" },
 *     { id: "gr-1", type: "goods_receipt", label: "GR-200145", href: "/gr/200145", status: "Received", statusVariant: "outline-success" },
 *   ]}
 *   matchScore={{ value: 100, statusLabel: "Matched", statusVariant: "success" }}
 * />
 * ```
 */
export function LinkedRecordsCard({
  title = "Related Documents",
  records,
  matchScore,
  typeIcons,
  className,
}: LinkedRecordsCardProps) {
  const mergedIcons = typeIcons
    ? { ...DEFAULT_TYPE_ICONS, ...typeIcons }
    : DEFAULT_TYPE_ICONS;

  // Group records by their group key, preserving order
  const groups: LinkedRecord[][] = [];
  let currentGroup: string | undefined;
  for (const record of records) {
    if (groups.length === 0 || record.group !== currentGroup) {
      groups.push([record]);
      currentGroup = record.group;
    } else {
      groups[groups.length - 1].push(record);
    }
  }

  return (
    <Card.Root className={className}>
      <Card.Header>
        {matchScore ? (
          <ScoreTitle matchScore={matchScore} />
        ) : (
          <h3 className="astw:leading-none astw:font-semibold">{title}</h3>
        )}
      </Card.Header>
      <Card.Content>
        {records.length === 0 ? (
          <p className="astw:text-sm astw:text-muted-foreground">No linked records</p>
        ) : (
          <div className="astw:flex astw:flex-col astw:gap-2">
            {groups.map((group, i) => {
              const label = group[0].groupLabel;
              return (
                <React.Fragment key={group[0].id}>
                  {i > 0 && (
                    <div className="astw:border-t astw:border-border astw:my-1" />
                  )}
                  {label && (
                    <p className="astw:text-xs astw:text-muted-foreground">{label}</p>
                  )}
                  {group.map((record) => (
                    <RecordRow
                      key={record.id}
                      record={record}
                      icon={mergedIcons[record.type] ?? FALLBACK_ICON}
                    />
                  ))}
                </React.Fragment>
              );
            })}
          </div>
        )}
      </Card.Content>
    </Card.Root>
  );
}

export default LinkedRecordsCard;
