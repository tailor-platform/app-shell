import {
  defineResource,
  Layout,
  DescriptionCard,
  hidden,
  useParams,
} from "@tailor-platform/app-shell";
import { useT, labels } from "../i18n-labels";

// Simulated backend data (like what you'd get from GraphQL/REST API)
export const mockPurchaseOrder = {
  id: "po-2024-0042",
  docNumber: "PO-10000041",
  status: "CONFIRMED",
  billingStatus: "PARTIALLY_BILLED",
  deliveryStatus: "NOT_RECEIVED",
  supplierName: "Acme Industrial Supplies",
  supplierID: "supplier-123",
  expectedDeliveryDate: "2024-02-15T00:00:00Z",
  createdAt: "2024-01-20T10:30:00Z",
  updatedAt: "2024-01-22T14:45:00Z",
  confirmedAt: "2024-01-21T09:00:00Z",
  note: "Rush order - priority shipping requested. Please ensure all  Please ensure all  Please ensure all",
  externalReference: "P00594",
  currency: { code: "USD", symbol: "$" },
  shipToLocation: {
    name: "Main Warehouse",
    address: {
      line1: "1234 Industrial Blvd",
      line2: "Building C",
      city: "Austin",
      state: "TX",
      zip: "78701",
      country: "United States",
    },
  },
  // Computed totals (would come from backend)
  subtotal: 12500.0,
  tax: 1031.25,
  total: 13531.25,
  amountPaid: 5000.0,
  // No built-in field type can display this - see the `render` fields below
  receiptBreakdown: { received: 34, inTransit: 41, pending: 25 },
};

/**
 * Custom field renderer: a stacked bar no built-in field `type` can express.
 *
 * Colours come from the `--alert-*` design tokens directly rather than the
 * `astw:bg-alert-*` utilities, because this example app's Tailwind build does
 * not process app-shell's theme - only utilities app-shell itself already
 * emits are present in its prebuilt stylesheet.
 */
const ReceiptBar = ({ received, inTransit, pending }: Record<string, number>) => (
  <div className="astw:flex astw:flex-col astw:gap-1">
    <div className="astw:flex astw:h-2 astw:w-full astw:overflow-hidden astw:rounded-full astw:bg-muted">
      <div style={{ width: `${received}%`, backgroundColor: "var(--alert-success-foreground)" }} />
      <div style={{ width: `${inTransit}%`, backgroundColor: "var(--alert-warning-foreground)" }} />
    </div>
    <span className="astw:text-xs astw:text-muted-foreground astw:tabular-nums">
      {received}% received · {inTransit}% in transit · {pending}% pending
    </span>
  </div>
);

const PurchaseOrderDetailPage = () => {
  // In a real app, you'd fetch this data:
  // const { data: purchaseOrder } = useQuery(GET_PURCHASE_ORDER, { variables: { id } });
  const purchaseOrder = mockPurchaseOrder;

  return (
    <Layout>
      <Layout.Header title={`Purchase Order: ${purchaseOrder.docNumber}`} />
      <Layout.Column>
        <DescriptionCard
          data={purchaseOrder}
          title="Status Overview"
          columns={4}
          fields={[
            {
              key: "status",
              label: "Status",
              type: "badge",
              meta: {
                badgeVariantMap: {
                  DRAFT: "success",
                  CONFIRMED: "success",
                  CLOSED: "success",
                  CANCELED: "outline-error",
                },
              },
            },
            {
              key: "billingStatus",
              label: "Billing",
              type: "badge",
              meta: {
                badgeVariantMap: {
                  NOT_BILLED: "outline-neutral",
                  PARTIALLY_BILLED: "outline-warning",
                  BILLED: "outline-success",
                },
              },
            },
            {
              key: "deliveryStatus",
              label: "Delivery",
              type: "badge",
              meta: {
                badgeVariantMap: {
                  NOT_RECEIVED: "outline-neutral",
                  PARTIALLY_RECEIVED: "outline-warning",
                  RECEIVED: "outline-success",
                },
              },
            },
          ]}
        />

        {/* Order Details Card */}
        <DescriptionCard
          data={purchaseOrder}
          title="Order Overview"
          columns={4}
          fields={[
            { key: "docNumber", label: "PO Number", meta: { copyable: true } },
            {
              key: "externalReference",
              label: "External Ref",
              meta: { copyable: true },
            },
            { key: "supplierName", label: "Supplier" },
            { type: "divider" },
            {
              key: "expectedDeliveryDate",
              label: "Expected Delivery",
              type: "date",
              meta: { dateFormat: "medium" },
            },
            {
              key: "confirmedAt",
              label: "Confirmed",
              type: "date",
              meta: { dateFormat: "medium" },
            },
            {
              key: "createdAt",
              label: "Created",
              type: "date",
              meta: { dateFormat: "relative" },
            },
            { key: "shipToLocation.name", label: "Warehouse" },
            { type: "divider" },
            {
              key: "shipToLocation.address",
              label: "Shipping Address",
              type: "address",
              meta: { copyable: true },
            },
            { key: "note", label: "Notes", meta: { truncateLines: 3 } },
            {
              // `render` draws the field itself - it wins over any `type`
              key: "receiptBreakdown",
              label: "Receipt Progress",
              render: ({ receiptBreakdown }) => <ReceiptBar {...receiptBreakdown} />,
            },
          ]}
        />

        {/* Financial Summary Card */}
        <DescriptionCard
          data={purchaseOrder}
          title="Financial Summary"
          columns={4}
          fields={[
            {
              key: "subtotal",
              label: "Subtotal",
              type: "money",
              meta: { currencyKey: "currency.code" },
            },
            {
              key: "tax",
              label: "Tax",
              type: "money",
              meta: { currencyKey: "currency.code" },
            },
            {
              key: "total",
              label: "Total",
              type: "money",
              meta: { currencyKey: "currency.code" },
            },
            { key: "currency.code", label: "Currency" },
            {
              // Derived from several keys at once - `render` receives the whole
              // data object, typed, so destructuring needs no casts
              key: "amountPaid",
              label: "Balance Due",
              render: ({ total, amountPaid, currency }) =>
                new Intl.NumberFormat(undefined, {
                  style: "currency",
                  currency: currency.code,
                }).format(total - amountPaid),
            },
          ]}
        />
      </Layout.Column>
    </Layout>
  );
};

export const purchaseOrderDemoResource = defineResource({
  path: "purchase-order-demo",
  meta: {
    title: "Purchase Order Demo",
  },
  component: PurchaseOrderDetailPage,
});

const dynamicPageResource = defineResource({
  path: ":id",
  meta: {
    title: labels.t("dynamicPageTitle"),
  },
  component: () => {
    const params = useParams<{ id: string }>();
    const t = useT();

    return (
      <div>
        <p>{t("dynamicPageDescription", { id: params.id! })}</p>
      </div>
    );
  },
});

const subSubPageResource = defineResource({
  path: "sub1-1",
  meta: {
    title: labels.t("subSubPageTitle"),
  },
  subResources: [dynamicPageResource],
  component: () => {
    const t = useT();

    return (
      <div>
        <p>{t("subSubPageDescription")}</p>
      </div>
    );
  },
});

export const subPageResource = defineResource({
  path: "sub1",
  meta: {
    title: labels.t("subPageTitle"),
  },
  subResources: [subSubPageResource],
  component: () => {
    const t = useT();

    return (
      <div>
        <p>{t("subPageDescription")}</p>
      </div>
    );
  },
});

export const hiddenResource = defineResource({
  path: "hidden",
  meta: {
    title: "Hidden Page",
  },
  guards: [() => hidden()],
  component: () => {
    return (
      <div>
        <p>This page should be hidden from navigation.</p>
      </div>
    );
  },
});
