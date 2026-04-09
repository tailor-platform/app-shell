import * as React from "react";
import { LoaderCircleIcon, FilePlusIcon, PencilIcon, CircleAlertIcon, RotateCwIcon } from "lucide-react";

import { cn } from "../../lib/utils";
import { Badge } from "../badge";
import { Card } from "../card";
import { Table } from "../table";
import { DescriptionCard } from "../description-card";
import { ActivityCard } from "../activity-card";
import { ActionPanel } from "../action-panel";
import { Layout } from "../layout/Layout";
import type { BadgeVariantType, FieldConfig } from "../description-card/types";
import type { ActivityCardBaseItem } from "../activity-card/types";
import type {
  ReconciliationDetailProps,
  ReconciliationRecord,
  LineItemComparison,
  Discrepancy,
  RelatedDocument,
  ProcessingStep,
} from "./types";
import { statusBadgeVariant, statusLabel, lineItemBadgeVariant, lineItemStatusLabel } from "./types";

// ============================================================================
// FORMATTERS
// ============================================================================

function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount);
}

function formatVariance(value: number): string {
  if (value === 0) return "0%";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%`;
}

// ============================================================================
// SCORE COLOR
// ============================================================================

function scoreColor(score: number): string {
  if (score >= 90) return "astw:text-green-700 astw:dark:text-green-500";
  if (score >= 70) return "astw:text-yellow-700 astw:dark:text-yellow-500";
  return "astw:text-destructive";
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
            Processing invoice... This may take a moment.
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
            {summary || "An error occurred while processing this invoice."}
          </p>
        </div>
      </Card.Content>
    </Card.Root>
  );
}

// ============================================================================
// SCORE BADGE (headerAction slot for DescriptionCard)
// ============================================================================

function ScoreBadge({ data }: { data: ReconciliationRecord }) {
  if (data.status === "processing") {
    return <Badge variant={statusBadgeVariant[data.status]}>{statusLabel[data.status]}</Badge>;
  }

  return (
    <span
      className={cn(
        "astw:text-2xl astw:font-bold astw:tabular-nums",
        scoreColor(data.matchScore),
      )}
    >
      {data.matchScore}%
    </span>
  );
}

// ============================================================================
// MATCH RESULT — DescriptionCard
// ============================================================================

function MatchResultSection({ data }: { data: ReconciliationRecord }) {
  // Convert statusBadgeVariant to the BadgeVariantType record DescriptionCard expects
  const badgeVariantMap: Record<string, BadgeVariantType> = Object.fromEntries(
    Object.entries(statusBadgeVariant),
  );

  return (
    <DescriptionCard
      data={data as unknown as Record<string, unknown>}
      title="Match Result"
      columns={3}
      headerAction={<ScoreBadge data={data} />}
      fields={[
        { key: "invoiceNumber", label: "Invoice Number", meta: { copyable: true } },
        {
          key: "status",
          label: "Status",
          type: "badge",
          meta: { badgeVariantMap },
        },
        { key: "supplier", label: "Supplier" },
        {
          key: "totalAmount",
          label: "Total Amount",
          type: "money",
          meta: { currencyKey: "currency" },
        },
        {
          key: "invoiceDate",
          label: "Invoice Date",
          type: "date",
          meta: { dateFormat: "medium" },
        },
        { type: "divider" },
        {
          key: "summary",
          label: "Summary",
          emptyBehavior: "hide",
        },
      ]}
    />
  );
}

// ============================================================================
// RELATED DOCUMENTS — DescriptionCard (left column)
// Shows exactly 1 PO + 1 GR as source documents
// ============================================================================

const documentStatusBadgeMap: Record<string, BadgeVariantType> = {
  Approved: "outline-success",
  Confirmed: "outline-success",
  Received: "outline-success",
  Draft: "outline-neutral",
  Pending: "outline-neutral",
  Rejected: "outline-error",
  Cancelled: "outline-error",
};

function RelatedDocumentsSection({ documents }: { documents: RelatedDocument[] }) {
  const source = documents.filter((d) => !d.autoGenerated);
  if (source.length === 0) return null;

  const po = source.find((d) => d.type === "purchase_order");
  const gr = source.find((d) => d.type === "goods_receipt");

  if (!po && !gr) return null;

  // Build a flat data object for DescriptionCard
  const relatedData: Record<string, unknown> = {};
  const fields: FieldConfig[] = [];

  if (po) {
    relatedData.poLabel = po.label;
    relatedData.poHref = po.href;
    relatedData.poStatus = po.status;
    fields.push({
      key: "poLabel",
      label: "Purchase Order",
      type: "link",
      meta: { hrefKey: "poHref", external: true },
    });
    fields.push({
      key: "poStatus",
      label: "PO Status",
      type: "badge",
      meta: { badgeVariantMap: documentStatusBadgeMap },
    });
  }

  if (po && gr) {
    fields.push({ type: "divider" });
  }

  if (gr) {
    relatedData.grLabel = gr.label;
    relatedData.grHref = gr.href;
    relatedData.grStatus = gr.status;
    fields.push({
      key: "grLabel",
      label: "Goods Receipt",
      type: "link",
      meta: { hrefKey: "grHref", external: true },
    });
    fields.push({
      key: "grStatus",
      label: "GR Status",
      type: "badge",
      meta: { badgeVariantMap: documentStatusBadgeMap },
    });
  }

  return (
    <DescriptionCard data={relatedData} title="Related Documents" columns={3} fields={fields} />
  );
}

// ============================================================================
// CREATED PURCHASE INVOICE — DescriptionCard (left column, below Related Docs)
// ============================================================================

function CreatedPurchaseInvoiceSection({ documents }: { documents: RelatedDocument[] }) {
  const invoice = documents.find((d) => d.autoGenerated);
  if (!invoice) return null;

  const invoiceData: Record<string, unknown> = {
    invoiceNumber: invoice.label,
    invoiceHref: invoice.href,
    invoiceStatus: invoice.status,
  };

  return (
    <DescriptionCard
      data={invoiceData}
      title="Created Purchase Invoice"
      columns={3}
      fields={[
        {
          key: "invoiceNumber",
          label: "Invoice Number",
          type: "link",
          meta: { hrefKey: "invoiceHref", external: true },
        },
        {
          key: "invoiceStatus",
          label: "Status",
          type: "badge",
          meta: { badgeVariantMap: documentStatusBadgeMap },
        },
      ]}
    />
  );
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
          {discrepancies.map((d) => (
            <div
              key={d.id}
              className="astw:relative astw:pl-3 astw:py-2"
            >
              <span
                className={cn(
                  "astw:absolute astw:left-0 astw:top-2 astw:bottom-2 astw:w-0.5 astw:rounded-full",
                  d.severity === "error"
                    ? "astw:bg-destructive"
                    : "astw:bg-yellow-500",
                )}
              />
              <p className="astw:text-xs astw:font-semibold">{d.category}</p>
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

function LineItemsTable({
  lineItems,
  currency,
}: {
  lineItems: LineItemComparison[];
  currency: string;
}) {
  if (lineItems.length === 0) return null;

  return (
    <Card.Root>
      <div className="astw:flex astw:items-center astw:px-6 astw:py-6">
        <h3 className="astw:text-lg astw:font-semibold astw:leading-none">Line items comparison</h3>
      </div>
      <Card.Content>
        <Table.Root>
          <Table.Header>
            <Table.Row>
              <Table.Head>#</Table.Head>
              <Table.Head>Product</Table.Head>
              <Table.Head>Status</Table.Head>
              <Table.Head className="astw:text-right">Inv Qty</Table.Head>
              <Table.Head className="astw:text-right">PO Qty</Table.Head>
              <Table.Head className="astw:text-right">GR Qty</Table.Head>
              <Table.Head className="astw:text-right">Qty Var</Table.Head>
              <Table.Head className="astw:text-right">Inv Price</Table.Head>
              <Table.Head className="astw:text-right">PO Price</Table.Head>
              <Table.Head className="astw:text-right">Price Var</Table.Head>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {lineItems.map((item) => (
              <Table.Row key={item.lineNumber}>
                <Table.Cell>{item.lineNumber}</Table.Cell>
                <Table.Cell className="astw:font-medium">{item.product}</Table.Cell>
                <Table.Cell>
                  <Badge variant={lineItemBadgeVariant[item.status]}>
                    {lineItemStatusLabel[item.status]}
                  </Badge>
                </Table.Cell>
                <Table.Cell className="astw:text-right">{item.invoiceQty}</Table.Cell>
                <Table.Cell className="astw:text-right">{item.poQty}</Table.Cell>
                <Table.Cell className="astw:text-right">{item.grQty}</Table.Cell>
                <Table.Cell className={cn("astw:text-right", varianceColor(item.qtyVariance))}>
                  {formatVariance(item.qtyVariance)}
                </Table.Cell>
                <Table.Cell className="astw:text-right">
                  {formatCurrency(item.invoicePrice, currency)}
                </Table.Cell>
                <Table.Cell className="astw:text-right">
                  {formatCurrency(item.poPrice, currency)}
                </Table.Cell>
                <Table.Cell className={cn("astw:text-right", varianceColor(item.priceVariance))}>
                  {formatVariance(item.priceVariance)}
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Root>
      </Card.Content>
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
 * - **DescriptionCard** for match result metadata and related documents
 * - **ActivityCard** compound API for processing timeline (right sidebar)
 * - **ActionPanel** for action buttons (right sidebar)
 * - **Layout** for responsive two-column layout
 *
 * Layout:
 * - **Left:** Match Result, Discrepancies, Line Items Comparison
 * - **Right:** Actions, Created Purchase Invoice, Related Documents, Activity
 *
 * @example
 * ```tsx
 * <ReconciliationDetail
 *   data={record}
 *   onCreateBill={() => navigate("/bills/new", { state: record })}
 *   onUpdatePO={() => navigate(`/purchase-orders/${record.id}/edit`)}
 *   onRefresh={() => refetch()}
 * />
 * ```
 */
export function ReconciliationDetail({
  data,
  onCreateBill,
  onUpdatePO,
  onRefresh,
  refreshInterval = 5000,
  actions,
  className,
}: ReconciliationDetailProps) {
  // Auto-poll while processing
  React.useEffect(() => {
    if (data.status !== "processing" || !onRefresh) return;

    const id = setInterval(() => {
      onRefresh();
    }, refreshInterval);

    return () => clearInterval(id);
  }, [data.status, onRefresh, refreshInterval]);

  const isProcessing = data.status === "processing";
  const isError = data.status === "error";
  const showActions = data.status !== "matched" && data.status !== "processing";

  // Build action items for ActionPanel
  const actionItems = React.useMemo(() => {
    if (!showActions) return [];
    const items: Array<{ key: string; label: string; icon: React.ReactNode; onClick: () => void }> =
      [];
    if (isError && onRefresh) {
      items.push({
        key: "retry",
        label: "Retry processing",
        icon: <RotateCwIcon />,
        onClick: onRefresh,
      });
    }
    if (!isError && onUpdatePO) {
      items.push({
        key: "update-po",
        label: "Update PO",
        icon: <PencilIcon />,
        onClick: onUpdatePO,
      });
    }
    if (!isError && onCreateBill) {
      items.push({
        key: "create-bill",
        label: "Create purchase bill",
        icon: <FilePlusIcon />,
        onClick: onCreateBill,
      });
    }
    return items;
  }, [showActions, isError, onUpdatePO, onCreateBill, onRefresh]);

  const hasRightColumn =
    actionItems.length > 0 ||
    data.relatedDocuments.length > 0 ||
    data.processingSteps.length > 0 ||
    actions;

  return (
    <div data-slot="reconciliation-detail" className={className}>
      <Layout>
        {/* Left column — main content */}
        <Layout.Column>
          {isProcessing ? (
            <ProcessingState />
          ) : isError ? (
            <ErrorState summary={data.summary} />
          ) : (
            <>
              <MatchResultSection data={data} />
              <DiscrepanciesCard discrepancies={data.discrepancies} />
              <LineItemsTable lineItems={data.lineItems} currency={data.currency} />
            </>
          )}
        </Layout.Column>

        {/* Right column — sidebar */}
        {hasRightColumn && (
          <Layout.Column>
            {actionItems.length > 0 && <ActionPanel title="Actions" actions={actionItems} />}
            {actions}
            <CreatedPurchaseInvoiceSection documents={data.relatedDocuments} />
            <RelatedDocumentsSection documents={data.relatedDocuments} />
            <ProcessingActivitySection steps={data.processingSteps} />
          </Layout.Column>
        )}
      </Layout>
    </div>
  );
}

export { DetailSkeleton };

export default ReconciliationDetail;
