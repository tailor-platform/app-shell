import * as React from "react";
import { ExternalLinkIcon } from "lucide-react";

import { cn } from "../../lib/utils";
import { Badge } from "../badge";
import { Card } from "../card";
import { Table } from "../table";
import { FileUploadDialog } from "../file-upload-dialog";
import type { ReconciliationListProps, ReconciliationListItem, ReconciliationStatus } from "./types";
import { statusBadgeVariant, statusLabel } from "./types";

// ============================================================================
// STATUS TABS
// ============================================================================

const STATUS_TABS: Array<{ key: ReconciliationStatus | "all"; label: string }> = [
  { key: "all", label: "All" },
  { key: "matched", label: "Matched" },
  { key: "partial_match", label: "Partial Match" },
  { key: "mismatch", label: "Mismatch" },
  { key: "processing", label: "Processing" },
  { key: "error", label: "Error" },
];

// ============================================================================
// HELPERS
// ============================================================================

function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(amount);
}

function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function scoreColor(score: number): string {
  if (score >= 90) return "astw:text-green-700 astw:dark:text-green-500";
  if (score >= 70) return "astw:text-yellow-700 astw:dark:text-yellow-500";
  return "astw:text-destructive";
}

// ============================================================================
// SKELETON
// ============================================================================

function SkeletonRow() {
  return (
    <Table.Row>
      {Array.from({ length: 7 }).map((_, i) => (
        <Table.Cell key={i}>
          <div className="astw:h-4 astw:rounded astw:bg-muted astw:animate-pulse astw:w-20" />
        </Table.Cell>
      ))}
    </Table.Row>
  );
}

function ListSkeleton() {
  return (
    <Table.Root>
      <Table.Header>
        <Table.Row>
          <Table.Head>Invoice #</Table.Head>
          <Table.Head>Supplier</Table.Head>
          <Table.Head>Status</Table.Head>
          <Table.Head className="astw:text-right">Score</Table.Head>
          <Table.Head className="astw:text-right">Amount</Table.Head>
          <Table.Head>Date</Table.Head>
          <Table.Head>Created Invoice</Table.Head>
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {Array.from({ length: 5 }).map((_, i) => (
          <SkeletonRow key={i} />
        ))}
      </Table.Body>
    </Table.Root>
  );
}

// ============================================================================
// DEFAULT EMPTY STATE
// ============================================================================

function DefaultEmptyState() {
  return (
    <div className="astw:flex astw:flex-col astw:items-center astw:justify-center astw:py-12 astw:text-center">
      <p className="astw:text-sm astw:text-muted-foreground">No reconciliation records found.</p>
      <p className="astw:text-xs astw:text-muted-foreground astw:mt-1">
        Upload an invoice to get started.
      </p>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

/**
 * ReconciliationList displays a table of reconciled invoices with status, score,
 * sortable columns, and an optional upload action that opens a FileUploadDialog.
 *
 * @example
 * ```tsx
 * <ReconciliationList
 *   items={reconciliations}
 *   onItemClick={(item) => navigate(`/reconciliation/${item.id}`)}
 *   onUpload={(file) => uploadInvoice(file)}
 * />
 * ```
 */
export function ReconciliationList({
  items,
  onItemClick,
  onUpload,
  uploadOpen: controlledOpen,
  onUploadOpenChange,
  uploadDialogProps,
  emptyState,
  loading = false,
  className,
}: ReconciliationListProps) {
  const [internalOpen, setInternalOpen] = React.useState(false);
  const uploadOpen = controlledOpen ?? internalOpen;
  const setUploadOpen = onUploadOpenChange ?? setInternalOpen;
  const [activeTab, setActiveTab] = React.useState<ReconciliationStatus | "all">("all");

  const filteredItems = React.useMemo(() => {
    if (activeTab === "all") return items;
    return items.filter((item) => item.status === activeTab);
  }, [items, activeTab]);

  function handleRowClick(item: ReconciliationListItem) {
    onItemClick?.(item);
  }

  function handleRowKeyDown(e: React.KeyboardEvent, item: ReconciliationListItem) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onItemClick?.(item);
    }
  }

  return (
    <div data-slot="reconciliation-list" className={cn("astw:space-y-4", className)}>
      {/* Table inside card */}
      <Card.Root>
        {/* Status filter tabs */}
        <div className="astw:px-5 astw:pt-4 astw:pb-0">
          <div className="astw:flex astw:gap-1">
            {STATUS_TABS.map((tab) => {
              const isActive = activeTab === tab.key;
              const count = tab.key === "all" ? items.length : items.filter((i) => i.status === tab.key).length;
              if (tab.key !== "all" && count === 0) return null;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className={cn(
                    "astw:px-3 astw:py-1.5 astw:text-sm astw:rounded-md astw:transition-colors astw:cursor-pointer",
                    isActive
                      ? "astw:bg-muted astw:text-foreground astw:font-medium"
                      : "astw:text-muted-foreground astw:hover:text-foreground astw:hover:bg-muted/50",
                  )}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
        <div className="astw:pt-2">
          {loading ? (
            <ListSkeleton />
          ) : filteredItems.length === 0 ? (
            (emptyState ?? <DefaultEmptyState />)
          ) : (
            <Table.Root className="astw:table-fixed">
              <colgroup>
                <col className="astw:w-[13%]" />
                <col className="astw:w-[24%]" />
                <col className="astw:w-[12%]" />
                <col className="astw:w-[8%]" />
                <col className="astw:w-[13%]" />
                <col className="astw:w-[12%]" />
                <col className="astw:w-[18%]" />
              </colgroup>
              <Table.Header>
                <Table.Row className="astw:hover:bg-transparent">
                  <Table.Head className="astw:pl-5">Invoice #</Table.Head>
                  <Table.Head>Supplier</Table.Head>
                  <Table.Head>Status</Table.Head>
                  <Table.Head className="astw:text-right">Score</Table.Head>
                  <Table.Head className="astw:text-right">Amount</Table.Head>
                  <Table.Head>Date</Table.Head>
                  <Table.Head className="astw:pr-5">Created Invoice</Table.Head>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {filteredItems.map((item) => (
                  <Table.Row
                    key={item.id}
                    className={cn(onItemClick && "astw:cursor-pointer")}
                    onClick={() => handleRowClick(item)}
                    onKeyDown={(e) => handleRowKeyDown(e, item)}
                    tabIndex={onItemClick ? 0 : undefined}
                    role={onItemClick ? "button" : undefined}
                  >
                    <Table.Cell className="astw:font-medium astw:pl-5">{item.invoiceNumber}</Table.Cell>
                    <Table.Cell>{item.supplier}</Table.Cell>
                    <Table.Cell>
                      <Badge variant={statusBadgeVariant[item.status]}>
                        {statusLabel[item.status]}
                      </Badge>
                    </Table.Cell>
                    <Table.Cell className="astw:text-right">
                      {item.status === "processing" ? (
                        "—"
                      ) : (
                        <span className={cn("astw:font-medium", scoreColor(item.matchScore))}>
                          {item.matchScore}%
                        </span>
                      )}
                    </Table.Cell>
                    <Table.Cell className="astw:text-right">
                      {formatCurrency(item.totalAmount, item.currency)}
                    </Table.Cell>
                    <Table.Cell>{formatDate(item.date)}</Table.Cell>
                    <Table.Cell className="astw:pr-5">
                      {item.createdInvoice ? (
                        <a
                          href={item.createdInvoice.href}
                          className="astw:text-sm astw:text-foreground astw:hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {item.createdInvoice.label}
                          <ExternalLinkIcon className="astw:inline astw:size-3 astw:ml-1 astw:text-muted-foreground" />
                        </a>
                      ) : (
                        <span className="astw:text-muted-foreground">—</span>
                      )}
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table.Root>
          )}
        </div>
      </Card.Root>

      {/* Upload dialog */}
      {onUpload && (
        <FileUploadDialog
          open={uploadOpen}
          onOpenChange={setUploadOpen}
          onUpload={onUpload}
          title={uploadDialogProps?.title ?? "Upload Invoice"}
          description={
            uploadDialogProps?.description ??
            "Upload a PDF or image of a supplier invoice. The system will extract data and match it against existing purchase orders and goods receipts."
          }
          accept={uploadDialogProps?.accept ?? ".pdf,.png,.jpg,.tiff"}
          uploadLabel={uploadDialogProps?.uploadLabel ?? "Upload Invoice"}
        />
      )}
    </div>
  );
}

export { ListSkeleton };

export default ReconciliationList;
