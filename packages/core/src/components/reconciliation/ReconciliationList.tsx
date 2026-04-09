import * as React from "react";
import { ArrowUpDownIcon, ArrowUpIcon, ArrowDownIcon } from "lucide-react";

import { cn } from "../../lib/utils";
import { Badge } from "../badge";
import { Card } from "../card";
import { Table } from "../table";
import { FileUploadDialog } from "../file-upload-dialog";
import type { ReconciliationListProps, ReconciliationListItem } from "./types";
import { statusBadgeVariant, statusLabel } from "./types";

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
// SORTING
// ============================================================================

type SortKey = "invoiceNumber" | "supplier" | "status" | "matchScore" | "totalAmount" | "date";
type SortDirection = "asc" | "desc";

const statusOrder: Record<string, number> = {
  matched: 0,
  partial_match: 1,
  mismatch: 2,
  processing: 3,
  error: 4,
};

function compareItems(
  a: ReconciliationListItem,
  b: ReconciliationListItem,
  key: SortKey,
  dir: SortDirection,
): number {
  let cmp = 0;
  switch (key) {
    case "invoiceNumber":
      cmp = a.invoiceNumber.localeCompare(b.invoiceNumber);
      break;
    case "supplier":
      cmp = a.supplier.localeCompare(b.supplier);
      break;
    case "status":
      cmp = (statusOrder[a.status] ?? 99) - (statusOrder[b.status] ?? 99);
      break;
    case "matchScore":
      cmp = a.matchScore - b.matchScore;
      break;
    case "totalAmount":
      cmp = a.totalAmount - b.totalAmount;
      break;
    case "date": {
      const da = typeof a.date === "string" ? new Date(a.date).getTime() : a.date.getTime();
      const db = typeof b.date === "string" ? new Date(b.date).getTime() : b.date.getTime();
      cmp = da - db;
      break;
    }
  }
  return dir === "desc" ? -cmp : cmp;
}

function SortIcon({ active, direction }: { active: boolean; direction: SortDirection }) {
  if (!active) return <ArrowUpDownIcon className="astw:size-3 astw:opacity-40" />;
  return direction === "asc" ? (
    <ArrowUpIcon className="astw:size-3" />
  ) : (
    <ArrowDownIcon className="astw:size-3" />
  );
}

// ============================================================================
// SKELETON
// ============================================================================

function SkeletonRow() {
  return (
    <Table.Row>
      {Array.from({ length: 6 }).map((_, i) => (
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
// SORTABLE HEADER
// ============================================================================

function SortableHead({
  children,
  sortKey,
  activeKey,
  direction,
  onSort,
  className,
}: {
  children: React.ReactNode;
  sortKey: SortKey;
  activeKey: SortKey | null;
  direction: SortDirection;
  onSort: (key: SortKey) => void;
  className?: string;
}) {
  return (
    <Table.Head className={className}>
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className="astw:inline-flex astw:items-center astw:gap-1 astw:cursor-pointer astw:hover:text-foreground astw:transition-colors"
      >
        {children}
        <SortIcon active={activeKey === sortKey} direction={direction} />
      </button>
    </Table.Head>
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
  const [sortKey, setSortKey] = React.useState<SortKey | null>(null);
  const [sortDir, setSortDir] = React.useState<SortDirection>("asc");

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  const sortedItems = React.useMemo(() => {
    if (!sortKey) return items;
    return items.toSorted((a, b) => compareItems(a, b, sortKey, sortDir));
  }, [items, sortKey, sortDir]);

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
        <Card.Content className="astw:pt-6">
          {loading ? (
            <ListSkeleton />
          ) : items.length === 0 ? (
            (emptyState ?? <DefaultEmptyState />)
          ) : (
            <Table.Root>
              <Table.Header>
                <Table.Row>
                  <SortableHead
                    sortKey="invoiceNumber"
                    activeKey={sortKey}
                    direction={sortDir}
                    onSort={handleSort}
                  >
                    Invoice #
                  </SortableHead>
                  <SortableHead
                    sortKey="supplier"
                    activeKey={sortKey}
                    direction={sortDir}
                    onSort={handleSort}
                  >
                    Supplier
                  </SortableHead>
                  <SortableHead
                    sortKey="status"
                    activeKey={sortKey}
                    direction={sortDir}
                    onSort={handleSort}
                  >
                    Status
                  </SortableHead>
                  <SortableHead
                    sortKey="matchScore"
                    activeKey={sortKey}
                    direction={sortDir}
                    onSort={handleSort}
                    className="astw:text-right"
                  >
                    Score
                  </SortableHead>
                  <SortableHead
                    sortKey="totalAmount"
                    activeKey={sortKey}
                    direction={sortDir}
                    onSort={handleSort}
                    className="astw:text-right"
                  >
                    Amount
                  </SortableHead>
                  <SortableHead
                    sortKey="date"
                    activeKey={sortKey}
                    direction={sortDir}
                    onSort={handleSort}
                  >
                    Date
                  </SortableHead>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {sortedItems.map((item) => (
                  <Table.Row
                    key={item.id}
                    className={cn(onItemClick && "astw:cursor-pointer")}
                    onClick={() => handleRowClick(item)}
                    onKeyDown={(e) => handleRowKeyDown(e, item)}
                    tabIndex={onItemClick ? 0 : undefined}
                    role={onItemClick ? "button" : undefined}
                  >
                    <Table.Cell className="astw:font-medium">{item.invoiceNumber}</Table.Cell>
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
                  </Table.Row>
                ))}
              </Table.Body>
            </Table.Root>
          )}
        </Card.Content>
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
