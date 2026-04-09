import * as React from "react";
import { ExternalLinkIcon } from "lucide-react";

import { cn } from "../../lib/utils";
import { scoreColor } from "../../lib/score-color";
import { formatCurrency } from "../../lib/format";
import { Badge } from "../badge";
import { Card } from "../card";
import { Table } from "../table";
import { FileUploadDialog } from "../file-upload-dialog";
import type {
  ReconciliationListProps,
  ReconciliationListItem,
  ListColumn,
  StatusConfig,
} from "./types";

// ============================================================================
// HELPERS
// ============================================================================

function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getListCellValue(item: ReconciliationListItem, key: string): unknown {
  if (key === "status") return item.status;
  return item.data[key];
}

function renderListCell(
  item: ReconciliationListItem,
  col: ListColumn,
  statusConfig: StatusConfig,
): React.ReactNode {
  const value = getListCellValue(item, col.key);
  const type = col.type ?? "text";

  switch (type) {
    case "badge": {
      const variant = col.meta?.badgeVariantMap?.[String(value)] ?? statusConfig.badgeVariantMap[String(value)] ?? "neutral";
      const label = col.meta?.labelMap?.[String(value)] ?? statusConfig.labelMap[String(value)] ?? String(value);
      return <Badge variant={variant as Parameters<typeof Badge>[0]["variant"]}>{label}</Badge>;
    }
    case "money": {
      const currency = col.meta?.currencyKey ? String(item.data[col.meta.currencyKey] ?? "USD") : "USD";
      return formatCurrency(Number(value), currency);
    }
    case "score": {
      if (item.status === statusConfig.processingStatus) return "—";
      const score = Number(value);
      return (
        <span className={cn("astw:font-medium", scoreColor(score))}>
          {score}%
        </span>
      );
    }
    case "date":
      return value ? formatDate(value as Date | string) : "—";
    case "link": {
      const href = col.meta?.hrefKey ? String(item.data[col.meta.hrefKey] ?? "") : "";
      if (!value || !href) return <span className="astw:text-muted-foreground">—</span>;
      return (
        <a
          href={href}
          className="astw:text-sm astw:text-foreground astw:hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          {String(value)}
          <ExternalLinkIcon className="astw:inline astw:size-3 astw:ml-1 astw:text-muted-foreground" />
        </a>
      );
    }
    case "number":
      return String(value ?? "");
    default:
      return String(value ?? "");
  }
}

// ============================================================================
// SKELETON
// ============================================================================

function SkeletonRow({ colCount }: { colCount: number }) {
  return (
    <Table.Row>
      {Array.from({ length: colCount }).map((_, i) => (
        <Table.Cell key={i}>
          <div className="astw:h-4 astw:rounded astw:bg-muted astw:animate-pulse astw:w-20" />
        </Table.Cell>
      ))}
    </Table.Row>
  );
}

function ListSkeleton({ columns }: { columns: ListColumn[] }) {
  return (
    <Table.Root>
      <Table.Header>
        <Table.Row>
          {columns.map((col) => (
            <Table.Head key={col.key}>{col.header}</Table.Head>
          ))}
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {Array.from({ length: 5 }).map((_, i) => (
          <SkeletonRow key={i} colCount={columns.length} />
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
      <p className="astw:text-sm astw:text-muted-foreground">No records found.</p>
      <p className="astw:text-xs astw:text-muted-foreground astw:mt-1">
        Upload a document to get started.
      </p>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

/**
 * ReconciliationList displays a configurable table with status filter tabs
 * and an optional upload action.
 *
 * @example
 * ```tsx
 * <ReconciliationList
 *   items={records}
 *   statusConfig={statusConfig}
 *   tabs={tabs}
 *   columns={columns}
 *   onItemClick={(item) => navigate(`/reconciliation/${item.id}`)}
 *   onUpload={(file) => upload(file)}
 * />
 * ```
 */
export function ReconciliationList({
  items,
  statusConfig,
  tabs,
  columns,
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
  const [activeTab, setActiveTab] = React.useState<string>("all");

  // Clamp to "all" if the active tab has no matching items
  const effectiveTab =
    activeTab !== "all" && !items.some((item) => item.status === activeTab) ? "all" : activeTab;

  const filteredItems = React.useMemo(() => {
    if (effectiveTab === "all") return items;
    return items.filter((item) => item.status === effectiveTab);
  }, [items, effectiveTab]);

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
            {tabs.map((tab) => {
              const isActive = effectiveTab === tab.key;
              const count =
                tab.key === "all" ? items.length : items.filter((i) => i.status === tab.key).length;
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
            <ListSkeleton columns={columns} />
          ) : filteredItems.length === 0 ? (
            (emptyState ?? <DefaultEmptyState />)
          ) : (
            <Table.Root>
              <Table.Header>
                <Table.Row className="astw:hover:bg-transparent">
                  {columns.map((col, i) => (
                    <Table.Head
                      key={col.key}
                      className={cn(
                        col.align === "right" && "astw:text-right",
                        i === 0 && "astw:pl-5",
                        i === columns.length - 1 && "astw:pr-5",
                      )}
                    >
                      {col.header}
                    </Table.Head>
                  ))}
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
                    {columns.map((col, i) => (
                      <Table.Cell
                        key={col.key}
                        className={cn(
                          col.align === "right" && "astw:text-right",
                          col.truncate && "astw:truncate astw:max-w-0",
                          i === 0 && "astw:pl-5",
                          i === columns.length - 1 && "astw:pr-5",
                        )}
                      >
                        {renderListCell(item, col, statusConfig)}
                      </Table.Cell>
                    ))}
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
          title={uploadDialogProps?.title ?? "Upload Document"}
          description={
            uploadDialogProps?.description ??
            "Upload a PDF or image to process. The system will extract data and run matching."
          }
          accept={uploadDialogProps?.accept ?? ".pdf,.png,.jpg,.tiff"}
          uploadLabel={uploadDialogProps?.uploadLabel ?? "Upload"}
        />
      )}
    </div>
  );
}

export { ListSkeleton };

export default ReconciliationList;
