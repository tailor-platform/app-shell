import * as React from "react";
import {
  LoaderCircleIcon,
  FilePlusIcon,
  FileTextIcon,
  TruckIcon,
  ReceiptIcon,
  PencilIcon,
  CircleAlertIcon,
  RotateCwIcon,
} from "lucide-react";

import { cn } from "../../lib/utils";
import { scoreColor } from "../../lib/score-color";
import { formatCurrency } from "../../lib/format";
import { Badge } from "../badge";
import { Card } from "../card";
import { Table } from "../table";
import { DescriptionCard } from "../description-card";
import { ActivityCard } from "../activity-card";
import { ActionPanel } from "../action-panel";
import { Layout } from "../layout/Layout";
import { LinkedRecordsCard } from "../linked-records-card";
import type { LinkedRecord } from "../linked-records-card/types";
import type { ActivityCardBaseItem } from "../activity-card/types";
import type {
  ReconciliationDetailProps,
  ReconciliationRecord,
  Discrepancy,
  RelatedDocument,
  ProcessingStep,
  LineItemColumn,
} from "./types";

// ============================================================================
// FORMATTERS
// ============================================================================

function formatVariance(value: number): string {
  if (value === 0) return "0%";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%`;
}

// ============================================================================
// DOCUMENT LINK MAPPER
// ============================================================================

const STATUS_VARIANT_MAP: Record<string, LinkedRecord["statusVariant"]> = {
  Approved: "outline-success",
  Confirmed: "outline-success",
  Received: "outline-success",
  Draft: "outline-neutral",
  Pending: "outline-neutral",
  Rejected: "outline-error",
  Cancelled: "outline-error",
};

const TYPE_ICONS: Record<string, React.ReactNode> = {
  purchase_order: <FileTextIcon className="astw:size-4" />,
  goods_receipt: <TruckIcon className="astw:size-4" />,
  purchase_invoice: <ReceiptIcon className="astw:size-4" />,
  purchase_bill: <ReceiptIcon className="astw:size-4" />,
};

function toLinkedRecord(doc: RelatedDocument): LinkedRecord {
  return {
    id: doc.id,
    type: doc.type,
    label: doc.label,
    href: doc.href,
    status: doc.status,
    icon: TYPE_ICONS[doc.type],
    statusVariant: doc.statusVariant
      ? (`outline-${doc.statusVariant === "default" ? "neutral" : doc.statusVariant}` as LinkedRecord["statusVariant"])
      : (STATUS_VARIANT_MAP[doc.status] ?? "outline-neutral"),
  };
}

// ============================================================================
// SKELETON
// ============================================================================

function SkeletonLine({ className }: { className?: string }) {
  return (
    <div className={cn("astw:h-4 astw:rounded astw:bg-muted astw:animate-pulse", className)} />
  );
}

function DetailSkeleton() {
  return (
    <div className="astw:space-y-6">
      <Card.Root>
        <Card.Header>
          <SkeletonLine className="astw:w-48 astw:h-5" />
        </Card.Header>
        <Card.Content>
          <div className="astw:grid astw:grid-cols-3 astw:gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="astw:space-y-2">
                <SkeletonLine className="astw:w-20 astw:h-3" />
                <SkeletonLine className="astw:w-28" />
              </div>
            ))}
          </div>
        </Card.Content>
      </Card.Root>
      <Card.Root>
        <Card.Header>
          <SkeletonLine className="astw:w-32 astw:h-5" />
        </Card.Header>
        <Card.Content>
          <div className="astw:space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <SkeletonLine key={i} className="astw:w-full" />
            ))}
          </div>
        </Card.Content>
      </Card.Root>
    </div>
  );
}

// ============================================================================
// PROCESSING EMPTY STATE
// ============================================================================

function ProcessingState() {
  return (
    <Card.Root>
      <Card.Content>
        <div className="astw:flex astw:flex-col astw:items-center astw:justify-center astw:h-[500px] astw:text-center astw:gap-3">
          <LoaderCircleIcon className="astw:size-8 astw:text-muted-foreground astw:animate-spin" />
          <p className="astw:text-sm astw:text-muted-foreground">
            Processing... This may take a moment.
          </p>
        </div>
      </Card.Content>
    </Card.Root>
  );
}

// ============================================================================
// ERROR EMPTY STATE
// ============================================================================

function ErrorState({ summary }: { summary?: string }) {
  return (
    <Card.Root>
      <Card.Content>
        <div className="astw:flex astw:flex-col astw:items-center astw:justify-center astw:h-[500px] astw:text-center astw:gap-3">
          <CircleAlertIcon className="astw:size-8 astw:text-destructive" />
          <p className="astw:text-sm astw:text-muted-foreground">
            {summary || "An error occurred during processing."}
          </p>
        </div>
      </Card.Content>
    </Card.Root>
  );
}

// ============================================================================
// MATCH RESULT — DescriptionCard with consumer-provided fields
// ============================================================================

function MatchResultSection({
  data,
  fields,
  title,
}: {
  data: ReconciliationRecord;
  fields: ReconciliationDetailProps["fields"];
  title: string;
}) {
  return <DescriptionCard data={data.data} title={title} columns={3} fields={fields} />;
}

// ============================================================================
// PROCESSING ACTIVITY — ActivityCard compound API (right sidebar)
// ============================================================================

interface ActivityItem extends ActivityCardBaseItem {
  label: string;
  stepStatus: ProcessingStep["status"];
}

function stepToActivityItems(steps: ProcessingStep[]): ActivityItem[] {
  return steps.toReversed().map((step) => ({
    id: step.id,
    timestamp: step.timestamp ?? new Date(),
    label: step.label,
    stepStatus: step.status,
  }));
}

function StepDot({ status }: { status: ProcessingStep["status"] }) {
  if (status === "completed")
    return <div className="astw:size-2.5 astw:rounded-full astw:bg-green-500" />;
  if (status === "in_progress")
    return <div className="astw:size-2.5 astw:rounded-full astw:bg-primary astw:animate-pulse" />;
  return <div className="astw:size-2.5 astw:rounded-full astw:bg-muted-foreground/30" />;
}

function ProcessingActivitySection({ steps }: { steps: ProcessingStep[] }) {
  if (steps.length === 0) return null;

  const activityItems = stepToActivityItems(steps);

  return (
    <ActivityCard.Root<ActivityItem> items={activityItems} title="Activity" maxVisible={10}>
      <ActivityCard.Items<ActivityItem>>
        {(item) => (
          <ActivityCard.Item
            indicator={
              <div className="astw:flex astw:items-center astw:justify-center astw:size-7">
                <StepDot status={item.stepStatus} />
              </div>
            }
          >
            <div className="astw:flex astw:items-baseline astw:justify-between astw:gap-2">
              <p className="astw:text-sm">
                <span className="astw:font-medium">{item.label}</span>
              </p>
              {item.timestamp && (
                <p className="astw:text-xs astw:text-muted-foreground astw:shrink-0 astw:tabular-nums">
                  {new Date(item.timestamp).toLocaleTimeString("en-US", {
                    hour: "numeric",
                    minute: "2-digit",
                    second: "2-digit",
                  })}
                </p>
              )}
            </div>
          </ActivityCard.Item>
        )}
      </ActivityCard.Items>
    </ActivityCard.Root>
  );
}

// ============================================================================
// DISCREPANCIES (right sidebar card)
// ============================================================================

function DiscrepanciesCard({ discrepancies }: { discrepancies: Discrepancy[] }) {
  if (discrepancies.length === 0) return null;

  const unresolved = discrepancies.filter((d) => !d.resolved);

  return (
    <Card.Root>
      <Card.Header>
        <div className="astw:flex astw:items-baseline astw:gap-2">
          <h3 className="astw:leading-none astw:font-semibold">Discrepancies</h3>
          <span className="astw:text-xs astw:text-muted-foreground">
            {unresolved.length} unresolved
          </span>
        </div>
      </Card.Header>
      <Card.Content>
        <div className="astw:space-y-2">
          {unresolved.map((d) => (
            <div key={d.id} className="astw:relative astw:pl-3 astw:py-2">
              <span
                className={cn(
                  "astw:absolute astw:left-0 astw:top-2 astw:bottom-2 astw:w-0.5 astw:rounded-full",
                  d.severity === "error" ? "astw:bg-destructive" : "astw:bg-yellow-500",
                )}
              />
              <p className="astw:text-sm astw:font-semibold">{d.category}</p>
              <p className="astw:text-xs astw:text-muted-foreground astw:mt-0.5">{d.message}</p>
            </div>
          ))}
        </div>
      </Card.Content>
    </Card.Root>
  );
}

// ============================================================================
// LINE ITEMS COMPARISON TABLE
// ============================================================================

function varianceColor(value: number): string {
  if (value === 0) return "astw:text-green-700 astw:dark:text-green-500";
  if (Math.abs(value) < 5) return "astw:text-yellow-700 astw:dark:text-yellow-500";
  return "astw:text-destructive";
}

function renderCell(row: Record<string, unknown>, col: LineItemColumn): React.ReactNode {
  const value = row[col.key];
  const type = col.type ?? "text";

  switch (type) {
    case "badge": {
      const variant = col.meta?.badgeVariantMap?.[String(value)] ?? "neutral";
      return (
        <Badge variant={variant as Parameters<typeof Badge>[0]["variant"]}>{String(value)}</Badge>
      );
    }
    case "money": {
      const currency = col.meta?.currencyKey ? String(row[col.meta.currencyKey] ?? "USD") : "USD";
      return formatCurrency(Number(value), currency);
    }
    case "variance":
      return <span className={varianceColor(Number(value))}>{formatVariance(Number(value))}</span>;
    case "number":
      return String(value ?? "");
    default:
      return String(value ?? "");
  }
}

function LineItemsTable({
  lineItems,
  columns,
}: {
  lineItems: Record<string, unknown>[];
  columns: LineItemColumn[];
}) {
  if (lineItems.length === 0 || columns.length === 0) return null;

  return (
    <Card.Root>
      <div className="astw:px-6 astw:pt-6">
        <h3 className="astw:text-lg astw:font-semibold astw:leading-none">Line items comparison</h3>
      </div>
      <div className="astw:pt-2">
        <Table.Root>
          <Table.Header>
            <Table.Row className="astw:hover:bg-transparent">
              {columns.map((col, i) => (
                <Table.Head
                  key={col.key}
                  className={cn(
                    col.align === "right" && "astw:text-right",
                    i === 0 && "astw:pl-6",
                    i === columns.length - 1 && "astw:pr-6",
                  )}
                >
                  {col.header}
                </Table.Head>
              ))}
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {lineItems.map((item, rowIdx) => (
              <Table.Row key={String(item.id ?? rowIdx)}>
                {columns.map((col, i) => (
                  <Table.Cell
                    key={col.key}
                    className={cn(
                      col.align === "right" && "astw:text-right",
                      i === 0 && "astw:pl-6",
                      i === columns.length - 1 && "astw:pr-6",
                    )}
                  >
                    {renderCell(item, col)}
                  </Table.Cell>
                ))}
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Root>
      </div>
    </Card.Root>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

/**
 * ReconciliationDetail is the single-page hub for one reconciliation record.
 *
 * Composes from existing AppShell components:
 * - **DescriptionCard** for match result metadata
 * - **LinkedRecordsCard** for related documents + match score (right sidebar)
 * - **ActivityCard** compound API for processing timeline (right sidebar)
 * - **ActionPanel** for action buttons (right sidebar)
 * - **Layout** for responsive two-column layout
 *
 * Layout:
 * - **Left:** Match Result, Discrepancies, Line Items Comparison
 * - **Right:** Actions, LinkedRecordsCard, Activity
 *
 * @example
 * ```tsx
 * <ReconciliationDetail
 *   data={record}
 *   fields={matchResultFields}
 *   lineItemColumns={comparisonColumns}
 *   onCreate={() => navigate("/documents/new")}
 *   createLabel="Create document"
 *   onUpdate={() => navigate(`/documents/${record.id}/edit`)}
 *   updateLabel="Update reference"
 *   onRefresh={() => refetch()}
 * />
 * ```
 */
export function ReconciliationDetail({
  data,
  statusConfig,
  title = "Match Result",
  fields,
  lineItemColumns,
  onCreate,
  createLabel = "Create",
  onUpdate,
  updateLabel = "Update",
  onRefresh,
  refreshInterval = 5000,
  retryLabel = "Retry",
  actions,
  className,
}: ReconciliationDetailProps) {
  const isProcessing = data.status === statusConfig.processingStatus;
  const isError = data.status === statusConfig.errorStatus;
  const hideActions = statusConfig.hideActionsForStatuses?.includes(data.status) ?? false;

  // Auto-poll while processing
  React.useEffect(() => {
    if (!isProcessing || !onRefresh) return;

    const id = setInterval(() => {
      onRefresh();
    }, refreshInterval);

    return () => clearInterval(id);
  }, [isProcessing, onRefresh, refreshInterval]);

  // Build action items for ActionPanel
  const actionItems = React.useMemo(() => {
    if (hideActions) return [];
    const items: Array<{ key: string; label: string; icon: React.ReactNode; onClick: () => void }> =
      [];
    if (isError && onRefresh) {
      items.push({
        key: "retry",
        label: retryLabel,
        icon: <RotateCwIcon />,
        onClick: onRefresh,
      });
    }
    if (!isError && onUpdate) {
      items.push({
        key: "update",
        label: updateLabel,
        icon: <PencilIcon />,
        onClick: onUpdate,
      });
    }
    if (!isError && onCreate) {
      items.push({
        key: "create",
        label: createLabel,
        icon: <FilePlusIcon />,
        onClick: onCreate,
      });
    }
    return items;
  }, [hideActions, isError, onUpdate, onCreate, onRefresh, updateLabel, createLabel, retryLabel]);

  const sourceDocs = data.relatedDocuments.filter((d) => !d.autoGenerated);
  const autoGenDocs = data.relatedDocuments.filter((d) => d.autoGenerated);

  const hasRightColumn =
    actionItems.length > 0 ||
    data.relatedDocuments.length > 0 ||
    data.processingSteps.length > 0 ||
    actions;

  return (
    <div data-slot="reconciliation-detail" className={className}>
      <Layout className="astw:lg:grid-cols-[1fr_320px]">
        {/* Left column — main content */}
        <Layout.Column>
          {isProcessing ? (
            <ProcessingState />
          ) : isError ? (
            <ErrorState summary={data.summary} />
          ) : (
            <>
              <MatchResultSection data={data} fields={fields} title={title} />
              <DiscrepanciesCard discrepancies={data.discrepancies} />
              <LineItemsTable lineItems={data.lineItems} columns={lineItemColumns} />
            </>
          )}
        </Layout.Column>

        {/* Right column — sidebar */}
        {hasRightColumn && (
          <Layout.Column>
            {actionItems.length > 0 && <ActionPanel title="Actions" actions={actionItems} />}
            {actions}
            {sourceDocs.length > 0 && (
              <LinkedRecordsCard
                title={
                  !isProcessing && !isError ? (
                    <span
                      className={cn(
                        "astw:text-lg astw:font-bold astw:tabular-nums astw:leading-none",
                        scoreColor(data.matchScore),
                      )}
                    >
                      {data.matchScore}% {statusConfig.labelMap[data.status] ?? data.status}
                    </span>
                  ) : undefined
                }
                records={sourceDocs.map(toLinkedRecord)}
              />
            )}
            {autoGenDocs.length > 0 && (
              <LinkedRecordsCard
                title="Created Invoice"
                records={autoGenDocs.map(toLinkedRecord)}
              />
            )}
            <ProcessingActivitySection steps={data.processingSteps} />
          </Layout.Column>
        )}
      </Layout>
    </div>
  );
}

export { DetailSkeleton };

export default ReconciliationDetail;
