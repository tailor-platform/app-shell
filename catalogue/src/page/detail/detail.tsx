/* page: detail */
import {
  ActionPanel,
  ActivityCard,
  Alert,
  Badge,
  Card,
  DescriptionCard,
  Layout,
  Link,
  Table,
} from "@tailor-platform/app-shell";
import type { ActionPanelProps } from "@tailor-platform/app-shell";
import { Copy, ExternalLink, FileEdit, PackagePlus, Pencil, XCircle } from "lucide-react";
import type React from "react";
import type { ExternalSource, PurchaseOrder } from "./mock";

type Props = {
  order: PurchaseOrder;
  /** Omitted when the record has no third-party counterpart. */
  externalSource?: ExternalSource;
  onEdit: () => void;
  onAmend: () => void;
  onDuplicate: () => void;
  onClose: () => void;
  onCreateGoodsReceipt: () => void;
  closing: boolean;
};

/**
 * Bare `Date` scalars arrive as "YYYY-MM-DD". `type: "date"` would hand them to
 * `new Date(value)`, which reads them as UTC midnight and renders the previous
 * day west of Greenwich — so format them as plain text instead. Real `DateTime`
 * fields keep `type: "date"`.
 */
const formatDay = (value: string) =>
  new Date(`${value}T00:00:00`).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

/**
 * A `render` field owns its own presentation — DescriptionCard applies none of
 * the built-in value typography to it — so match that style here or the two
 * dates read a size larger than every other value on the card.
 */
const Value = ({ children }: { children: React.ReactNode }) => (
  <span className="text-sm font-medium text-foreground">{children}</span>
);

/** House link: primary colour at rest, underline only on hover. */
const DOC_LINK = "font-mono text-xs text-primary underline-offset-4 hover:underline";

export default function PurchaseOrderDetailPage({
  order,
  externalSource,
  onEdit,
  onAmend,
  onDuplicate,
  onClose,
  onCreateGoodsReceipt,
  closing,
}: Props) {
  const isDraft = order.orderStatus === "DRAFT";
  const isConfirmed = order.orderStatus === "CONFIRMED";
  const isSettled = order.orderStatus === "SETTLED";
  const isCancelled = order.orderStatus === "CANCELLED";

  // Assembled by status-gated spreads, so the rail only ever offers what is
  // legal now. Nothing here navigates — the breadcrumb owns that.
  const actions: ActionPanelProps["actions"] = [
    { key: "duplicate", label: "Duplicate", icon: <Copy />, onClick: onDuplicate },
    ...(isDraft ? [{ key: "edit", label: "Edit", icon: <Pencil />, onClick: onEdit }] : []),
    ...(isConfirmed
      ? [
          { key: "amend", label: "Amend", icon: <FileEdit />, onClick: onAmend },
          {
            key: "create-goods-receipt",
            label: "Create goods receipt",
            icon: <PackagePlus />,
            onClick: onCreateGoodsReceipt,
          },
          {
            key: "close",
            label: "Close order",
            icon: <XCircle />,
            onClick: onClose,
            // Bound to the mutation's own in-flight state. The action stays
            // enabled even though the server may refuse — a guessed disabled
            // state drifts from the command and explains nothing.
            loading: closing,
            variant: "destructive" as const,
          },
        ]
      : []),
  ];

  return (
    <Layout>
      <Layout.Header title={`Purchase order ${order.docNumber}`} />
      <Layout.Column>
        {/* Terminal states explain themselves, above everything else, so nobody
            hunts for actions that are gone. Each state is its own message. */}
        {isSettled && (
          <Alert.Root variant="success">
            <Alert.Title>Settled</Alert.Title>
            <Alert.Description>
              Every line has been received and billed. The figures below are final.
            </Alert.Description>
          </Alert.Root>
        )}
        {isCancelled && (
          <Alert.Root variant="neutral">
            <Alert.Title>Cancelled</Alert.Title>
            <Alert.Description>
              This order was cancelled before it was acted on. Raise a new one to reorder.
            </Alert.Description>
          </Alert.Root>
        )}

        {/* Identity and current position. Every status axis gets its own badge. */}
        <DescriptionCard
          title="Purchase order information"
          data={order}
          columns={3}
          fields={[
            { key: "docNumber", label: "Order number", meta: { copyable: true } },
            {
              key: "orderStatus",
              label: "Status",
              type: "badge",
              meta: {
                badgeVariantMap: {
                  DRAFT: "neutral",
                  CONFIRMED: "info",
                  SETTLED: "success",
                  CANCELLED: "error",
                },
              },
            },
            // Progress axes, owned by other modules. Rendered, never controlled.
            {
              key: "receiptStatus",
              label: "Receipt",
              type: "badge",
              meta: {
                badgeVariantMap: { PARTIAL: "outline-warning", COMPLETE: "outline-success" },
              },
            },
            {
              key: "billingStatus",
              label: "Billing",
              type: "badge",
              meta: {
                badgeVariantMap: { UNBILLED: "outline-neutral", BILLED: "outline-success" },
              },
            },
            {
              key: "supplier",
              label: "Supplier",
              type: "link",
              meta: { hrefKey: "supplierHref" },
            },
            { type: "divider" },
            { key: "total", label: "Total", type: "money", meta: { currencyKey: "currency" } },
            // Bare Date scalars, pre-formatted rather than typed as dates.
            {
              key: "orderDate",
              label: "Ordered",
              render: (o) => <Value>{formatDay(o.orderDate)}</Value>,
            },
            {
              key: "expectedDate",
              label: "Expected",
              render: (o) => <Value>{formatDay(o.expectedDate)}</Value>,
            },
            // A real DateTime, and nullable, so it keeps type: "date".
            {
              key: "confirmedAt",
              label: "Confirmed",
              type: "date",
              meta: { dateFormat: "medium" },
              emptyBehavior: "hide",
            },
          ]}
        />

        {/* Upstream sits above the lines, because the lines came from it and
            can't be read without it. Several sources, so a card — a single one
            would have been a link field on the summary instead. */}
        <Card.Root>
          <Card.Header title="Source requisitions" />
          <Card.Content className="px-0!">
            <Table.Root>
              <Table.Header>
                <Table.Row>
                  <Table.Head>Requisition</Table.Head>
                  <Table.Head>Status</Table.Head>
                  <Table.Head>Raised</Table.Head>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {order.sourceDocuments.map((source) => (
                  <Table.Row key={source.id}>
                    <Table.Cell>
                      <Link to={source.href} className={DOC_LINK}>
                        {source.docNumber}
                      </Link>
                    </Table.Cell>
                    <Table.Cell>
                      <Badge variant="success">{source.status}</Badge>
                    </Table.Cell>
                    <Table.Cell>{formatDay(source.raisedAt)}</Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table.Root>
          </Card.Content>
        </Card.Root>

        {/* The document's own content. Identity, then its own numbers, then the
            received quantity that comes from this order's receipts, then the
            derived subtotal. A plain Table: this order has a handful of lines,
            fetched with the record — see the entry for when a line set is large
            enough to page. No container padding; the cells inset themselves. */}
        <Card.Root>
          <Card.Header title="Line items" />
          <Card.Content className="px-0!">
            {order.lineItems.length === 0 ? (
              <p className="px-6 text-sm text-muted-foreground">No line items on this order.</p>
            ) : (
              <Table.Root>
                <Table.Header>
                  <Table.Row>
                    <Table.Head>Item</Table.Head>
                    <Table.Head align="right">Qty</Table.Head>
                    <Table.Head>Unit</Table.Head>
                    <Table.Head align="right">Unit price</Table.Head>
                    <Table.Head align="right">Received</Table.Head>
                    <Table.Head align="right">Subtotal</Table.Head>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {order.lineItems.map((line) => (
                    <Table.Row key={line.id}>
                      {/* Two facts, one column. */}
                      <Table.Cell>
                        <span className="block">{line.itemName}</span>
                        <span className="block font-mono text-xs text-muted-foreground">
                          {line.sku}
                        </span>
                      </Table.Cell>
                      <Table.Cell align="right" className="tabular-nums">
                        {line.qty}
                      </Table.Cell>
                      <Table.Cell>{line.unit}</Table.Cell>
                      <Table.Cell align="right" className="tabular-nums">
                        ${line.unitPrice.toLocaleString()}
                      </Table.Cell>
                      {/* Actual, with a muted delta beside it when it differs. */}
                      <Table.Cell align="right" className="tabular-nums">
                        {line.received}
                        {line.received !== line.qty && (
                          <span className="ml-1 text-xs text-muted-foreground">
                            ({line.received - line.qty})
                          </span>
                        )}
                      </Table.Cell>
                      <Table.Cell align="right" className="tabular-nums">
                        ${line.subtotal.toLocaleString()}
                      </Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
                {/* A footer only because these subtotals genuinely sum — one
                    currency, one additive column. */}
                <Table.Footer>
                  <Table.Row>
                    <Table.Cell>Total</Table.Cell>
                    <Table.Cell colSpan={4} />
                    <Table.Cell align="right" className="tabular-nums">
                      ${order.total.toLocaleString()}
                    </Table.Cell>
                  </Table.Row>
                </Table.Footer>
              </Table.Root>
            )}
          </Card.Content>
        </Card.Root>

        {/* Downstream: what this order has caused. Shown empty once the
            relationship is possible, so the reader learns it exists. */}
        <Card.Root>
          <Card.Header title="Goods receipts" />
          <Card.Content className="px-0!">
            {order.goodsReceipts.length === 0 ? (
              <p className="px-6 text-sm text-muted-foreground">
                No goods receipts linked to this order.
              </p>
            ) : (
              <Table.Root>
                <Table.Header>
                  <Table.Row>
                    <Table.Head>Receipt</Table.Head>
                    <Table.Head>Status</Table.Head>
                    <Table.Head>Received</Table.Head>
                    <Table.Head align="right">Qty</Table.Head>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {order.goodsReceipts.map((receipt) => (
                    <Table.Row key={receipt.id}>
                      <Table.Cell>
                        <Link to={receipt.href} className={DOC_LINK}>
                          {receipt.docNumber}
                        </Link>
                      </Table.Cell>
                      <Table.Cell>
                        <Badge variant="success">{receipt.status}</Badge>
                      </Table.Cell>
                      <Table.Cell>{formatDay(receipt.receivedAt)}</Table.Cell>
                      <Table.Cell align="right" className="tabular-nums">
                        {receipt.qty}
                      </Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table.Root>
            )}
          </Card.Content>
        </Card.Root>
      </Layout.Column>

      <Layout.Column area="right">
        {/* Omitted entirely in terminal states — the alert above carries the
            explanation, so the rail never quietly empties. */}
        {actions.length > 0 && <ActionPanel title="Actions" actions={actions} />}

        {externalSource && (
          <Card.Root>
            <Card.Header title={externalSource.system} />
            <Card.Content>
              <a
                href={externalSource.href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-primary underline-offset-4 hover:underline"
              >
                {externalSource.recordLabel}
                <ExternalLink className="size-3" />
              </a>
              <p className="mt-1 text-xs text-muted-foreground">
                Synced {externalSource.syncedAt.toLocaleDateString()}
              </p>
            </Card.Content>
          </Card.Root>
        )}

        <ActivityCard title="History" items={order.activities} groupBy="day" />
      </Layout.Column>
    </Layout>
  );
}
