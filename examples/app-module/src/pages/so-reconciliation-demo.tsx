import {
  defineResource,
  Layout,
  ReconciliationList,
  ReconciliationDetail,
  useParams,
  useNavigate,
} from "@tailor-platform/app-shell";
import type { ReconciliationListItem, ReconciliationRecord } from "@tailor-platform/app-shell";

// ============================================================================
// STATUS CONFIG — Sales Order matching workflow
// ============================================================================

const STATUS_CONFIG = {
  processingStatus: "validating",
  errorStatus: "failed",
  hideActionsForStatuses: ["confirmed", "validating"],
  badgeVariantMap: {
    confirmed: "subtle-success",
    pending_review: "subtle-warning",
    rejected: "subtle-error",
    validating: "subtle-default",
    failed: "subtle-error",
  },
  labelMap: {
    confirmed: "Confirmed",
    pending_review: "Pending Review",
    rejected: "Rejected",
    validating: "Validating",
    failed: "Failed",
  },
};

const LIST_TABS = [
  { key: "all", label: "All" },
  { key: "confirmed", label: "Confirmed" },
  { key: "pending_review", label: "Pending Review" },
  { key: "rejected", label: "Rejected" },
  { key: "validating", label: "Validating" },
];

const LIST_COLUMNS = [
  { key: "soNumber", header: "SO #" },
  { key: "customer", header: "Customer", truncate: true },
  { key: "status", header: "Status", type: "badge" as const },
  { key: "matchScore", header: "Score", type: "score" as const, align: "right" as const },
  {
    key: "orderTotal",
    header: "Order Total",
    type: "money" as const,
    align: "right" as const,
    meta: { currencyKey: "currency" },
  },
  { key: "orderDate", header: "Order Date", type: "date" as const },
];

const DETAIL_FIELDS = [
  { key: "soNumber", label: "Sales Order #", meta: { copyable: true } },
  {
    key: "status",
    label: "Status",
    type: "badge" as const,
    meta: { badgeVariantMap: STATUS_CONFIG.badgeVariantMap },
  },
  { key: "customer", label: "Customer" },
  {
    key: "orderTotal",
    label: "Order Total",
    type: "money" as const,
    meta: { currencyKey: "currency" },
  },
  {
    key: "orderDate",
    label: "Order Date",
    type: "date" as const,
    meta: { dateFormat: "medium" as const },
  },
  { type: "divider" as const },
  { key: "summary", label: "Summary", emptyBehavior: "hide" as const },
];

const LINE_ITEM_COLUMNS = [
  { key: "lineNumber", header: "#" },
  { key: "sku", header: "SKU" },
  { key: "productName", header: "Product", truncate: true },
  {
    key: "status",
    header: "Status",
    type: "badge" as const,
    meta: {
      badgeVariantMap: {
        matched: "subtle-success",
        qty_mismatch: "subtle-warning",
        price_mismatch: "subtle-warning",
        missing: "subtle-error",
      },
    },
  },
  { key: "soQty", header: "SO Qty", type: "number" as const, align: "right" as const },
  { key: "deliveredQty", header: "Delivered", type: "number" as const, align: "right" as const },
  { key: "invoicedQty", header: "Invoiced", type: "number" as const, align: "right" as const },
  { key: "qtyVariance", header: "Qty Var", type: "variance" as const, align: "right" as const },
  {
    key: "soPrice",
    header: "SO Price",
    type: "money" as const,
    align: "right" as const,
    meta: { currencyKey: "currency" },
  },
  {
    key: "invoicedPrice",
    header: "Inv Price",
    type: "money" as const,
    align: "right" as const,
    meta: { currencyKey: "currency" },
  },
  { key: "priceVariance", header: "Price Var", type: "variance" as const, align: "right" as const },
];

// ============================================================================
// DUMMY DATA — Sales Order list
// ============================================================================

const demoListItems: ReconciliationListItem[] = [
  {
    id: "1",
    status: "confirmed",
    data: {
      soNumber: "SO-2026-1001",
      customer: "Nordstrom Inc.",
      matchScore: 100,
      orderTotal: 142500.0,
      currency: "USD",
      orderDate: new Date("2026-03-15"),
    },
  },
  {
    id: "2",
    status: "pending_review",
    data: {
      soNumber: "SO-2026-1002",
      customer: "Selfridges & Co.",
      matchScore: 82,
      orderTotal: 67890.0,
      currency: "GBP",
      orderDate: new Date("2026-03-18"),
    },
  },
  {
    id: "3",
    status: "rejected",
    data: {
      soNumber: "SO-2026-1003",
      customer: "Galeries Lafayette S.A.",
      matchScore: 35,
      orderTotal: 89200.0,
      currency: "EUR",
      orderDate: new Date("2026-03-20"),
    },
  },
  {
    id: "4",
    status: "confirmed",
    data: {
      soNumber: "SO-2026-1004",
      customer: "Barneys New York LLC",
      matchScore: 100,
      orderTotal: 23400.0,
      currency: "USD",
      orderDate: new Date("2026-03-22"),
    },
  },
  {
    id: "5",
    status: "validating",
    data: {
      soNumber: "SO-2026-1005",
      customer: "Isetan Mitsukoshi Holdings Ltd.",
      matchScore: 0,
      orderTotal: 195000.0,
      currency: "JPY",
      orderDate: new Date("2026-04-01"),
    },
  },
];

// ============================================================================
// DUMMY DATA — Detail records
// ============================================================================

const recordsById: Record<string, ReconciliationRecord> = {
  "1": {
    id: "1",
    status: "confirmed",
    matchScore: 100,
    data: {
      soNumber: "SO-2026-1001",
      status: "confirmed",
      customer: "Nordstrom Inc.",
      orderTotal: 142500.0,
      currency: "USD",
      orderDate: new Date("2026-03-15"),
      summary: "All 3 line items matched — delivery and invoice confirmed.",
    },
    summary: "All 3 line items matched — delivery and invoice confirmed.",
    processingSteps: [
      {
        id: "s1",
        label: "Sales order received from Shopify",
        status: "completed",
        timestamp: new Date("2026-03-15T09:00:00"),
      },
      {
        id: "s2",
        label: "Delivery note DN-4501 matched",
        status: "completed",
        timestamp: new Date("2026-03-20T14:30:00"),
      },
      {
        id: "s3",
        label: "Invoice INV-8801 matched — 100% confirmed",
        status: "completed",
        timestamp: new Date("2026-03-22T11:15:00"),
      },
    ],
    discrepancies: [],
    lineItems: [
      {
        lineNumber: 1,
        sku: "NDM-JKT-BLK-M",
        productName: "Wool Blend Blazer — Black, M",
        status: "matched",
        soQty: 120,
        deliveredQty: 120,
        invoicedQty: 120,
        qtyVariance: 0,
        soPrice: 475.0,
        invoicedPrice: 475.0,
        priceVariance: 0,
        currency: "USD",
      },
      {
        lineNumber: 2,
        sku: "NDM-JKT-BLK-L",
        productName: "Wool Blend Blazer — Black, L",
        status: "matched",
        soQty: 80,
        deliveredQty: 80,
        invoicedQty: 80,
        qtyVariance: 0,
        soPrice: 475.0,
        invoicedPrice: 475.0,
        priceVariance: 0,
        currency: "USD",
      },
      {
        lineNumber: 3,
        sku: "NDM-TRS-NVY-32",
        productName: "Tailored Trousers — Navy, 32",
        status: "matched",
        soQty: 100,
        deliveredQty: 100,
        invoicedQty: 100,
        qtyVariance: 0,
        soPrice: 235.0,
        invoicedPrice: 235.0,
        priceVariance: 0,
        currency: "USD",
      },
    ],
    relatedDocuments: [
      {
        id: "dn-1",
        type: "delivery_note",
        label: "DN-4501",
        status: "Delivered",
        statusVariant: "success",
        autoGenerated: false,
        href: "#",
      },
      {
        id: "inv-1",
        type: "invoice",
        label: "INV-8801",
        status: "Paid",
        statusVariant: "success",
        autoGenerated: false,
        href: "#",
      },
    ],
  },
  "2": {
    id: "2",
    status: "pending_review",
    matchScore: 82,
    data: {
      soNumber: "SO-2026-1002",
      status: "pending_review",
      customer: "Selfridges & Co.",
      orderTotal: 67890.0,
      currency: "GBP",
      orderDate: new Date("2026-03-18"),
      summary: "2/3 line items matched. 1 quantity discrepancy on delivery.",
    },
    summary: "2/3 line items matched. 1 quantity discrepancy on delivery.",
    processingSteps: [
      {
        id: "s1",
        label: "Sales order received from ERP",
        status: "completed",
        timestamp: new Date("2026-03-18T10:00:00"),
      },
      {
        id: "s2",
        label: "Delivery note DN-4520 matched — 1 discrepancy",
        status: "completed",
        timestamp: new Date("2026-03-25T16:00:00"),
      },
      {
        id: "s3",
        label: "Invoice pending — awaiting delivery confirmation",
        status: "in_progress",
      },
    ],
    discrepancies: [
      {
        id: "d1",
        severity: "warning",
        category: "Qty short-shipped",
        message: "SLF-DRS-RED-S: Delivered 45 of 50 ordered — 5 units short",
        resolved: false,
      },
    ],
    lineItems: [
      {
        lineNumber: 1,
        sku: "SLF-DRS-RED-S",
        productName: "Silk Dress — Red, S",
        status: "qty_mismatch",
        soQty: 50,
        deliveredQty: 45,
        invoicedQty: 0,
        qtyVariance: -10,
        soPrice: 890.0,
        invoicedPrice: 0,
        priceVariance: 0,
        currency: "GBP",
      },
      {
        lineNumber: 2,
        sku: "SLF-DRS-RED-M",
        productName: "Silk Dress — Red, M",
        status: "matched",
        soQty: 60,
        deliveredQty: 60,
        invoicedQty: 0,
        qtyVariance: 0,
        soPrice: 890.0,
        invoicedPrice: 0,
        priceVariance: 0,
        currency: "GBP",
      },
      {
        lineNumber: 3,
        sku: "SLF-SCF-IVY-OS",
        productName: "Cashmere Scarf — Ivory, One Size",
        status: "matched",
        soQty: 100,
        deliveredQty: 100,
        invoicedQty: 0,
        qtyVariance: 0,
        soPrice: 145.0,
        invoicedPrice: 0,
        priceVariance: 0,
        currency: "GBP",
      },
    ],
    relatedDocuments: [
      {
        id: "dn-2",
        type: "delivery_note",
        label: "DN-4520",
        status: "Partial",
        statusVariant: "warning",
        autoGenerated: false,
        href: "#",
      },
    ],
  },
  "3": {
    id: "3",
    status: "rejected",
    matchScore: 35,
    data: {
      soNumber: "SO-2026-1003",
      status: "rejected",
      customer: "Galeries Lafayette S.A.",
      orderTotal: 89200.0,
      currency: "EUR",
      orderDate: new Date("2026-03-20"),
      summary: "0/2 line items matched. Invoice pricing does not match agreed terms.",
    },
    summary: "0/2 line items matched. Invoice pricing does not match agreed terms.",
    processingSteps: [
      {
        id: "s1",
        label: "Sales order received",
        status: "completed",
        timestamp: new Date("2026-03-20T08:30:00"),
      },
      {
        id: "s2",
        label: "Delivery confirmed — DN-4535",
        status: "completed",
        timestamp: new Date("2026-03-28T12:00:00"),
      },
      {
        id: "s3",
        label: "Invoice INV-8830 rejected — pricing mismatch",
        status: "completed",
        timestamp: new Date("2026-04-01T09:45:00"),
      },
    ],
    discrepancies: [
      {
        id: "d1",
        severity: "error",
        category: "Price mismatch",
        message:
          "GL-BAG-TAN-MD: Invoice EUR 1,450/unit vs SO EUR 1,200/unit — 20.8% above agreed price",
        resolved: false,
      },
      {
        id: "d2",
        severity: "error",
        category: "Price mismatch",
        message:
          "GL-WLT-BLK-SM: Invoice EUR 380/unit vs SO EUR 320/unit — 18.7% above agreed price",
        resolved: false,
      },
    ],
    lineItems: [
      {
        lineNumber: 1,
        sku: "GL-BAG-TAN-MD",
        productName: "Leather Tote — Tan, Medium",
        status: "price_mismatch",
        soQty: 40,
        deliveredQty: 40,
        invoicedQty: 40,
        qtyVariance: 0,
        soPrice: 1200.0,
        invoicedPrice: 1450.0,
        priceVariance: 20.8,
        currency: "EUR",
      },
      {
        lineNumber: 2,
        sku: "GL-WLT-BLK-SM",
        productName: "Card Wallet — Black, Small",
        status: "price_mismatch",
        soQty: 80,
        deliveredQty: 80,
        invoicedQty: 80,
        qtyVariance: 0,
        soPrice: 320.0,
        invoicedPrice: 380.0,
        priceVariance: 18.7,
        currency: "EUR",
      },
    ],
    relatedDocuments: [
      {
        id: "dn-3",
        type: "delivery_note",
        label: "DN-4535",
        status: "Delivered",
        statusVariant: "success",
        autoGenerated: false,
        href: "#",
      },
      {
        id: "inv-3",
        type: "invoice",
        label: "INV-8830",
        status: "Rejected",
        statusVariant: "error",
        autoGenerated: false,
        href: "#",
      },
    ],
  },
  "5": {
    id: "5",
    status: "validating",
    matchScore: 0,
    data: {},
    summary: "",
    processingSteps: [
      {
        id: "s1",
        label: "Sales order received from Isetan",
        status: "completed",
        timestamp: new Date("2026-04-01T06:00:00"),
      },
      { id: "s2", label: "Awaiting delivery confirmation from warehouse", status: "in_progress" },
      { id: "s3", label: "Invoice matching", status: "pending" },
    ],
    discrepancies: [],
    lineItems: [],
    relatedDocuments: [],
  },
};

// ============================================================================
// LIST PAGE
// ============================================================================

const SOReconciliationListPage = () => {
  const navigate = useNavigate();

  return (
    <Layout>
      <Layout.Header title="Sales Order Reconciliation" />
      <Layout.Column>
        <ReconciliationList
          items={demoListItems}
          statusConfig={STATUS_CONFIG}
          tabs={LIST_TABS}
          columns={LIST_COLUMNS}
          onItemClick={(item) => {
            navigate(`/custom-page/so-reconciliation-demo/${item.id}`);
          }}
        />
      </Layout.Column>
    </Layout>
  );
};

// ============================================================================
// DETAIL PAGE
// ============================================================================

const SOReconciliationDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const record = id ? recordsById[id] : undefined;

  if (!record) {
    return (
      <Layout>
        <Layout.Header title="Not Found" />
        <Layout.Column>
          <p>No sales order reconciliation record found for ID: {id}</p>
        </Layout.Column>
      </Layout>
    );
  }

  return (
    <ReconciliationDetail
      data={record}
      statusConfig={STATUS_CONFIG}
      title="Sales Order Match"
      fields={DETAIL_FIELDS}
      lineItemColumns={LINE_ITEM_COLUMNS}
      onCreate={() => alert("Create credit note for pricing adjustment")}
      createLabel="Create credit note"
      onUpdate={() => alert("Update delivery note")}
      updateLabel="Update delivery"
      onRefresh={() => alert("Retry validation")}
      retryLabel="Retry validation"
    />
  );
};

// ============================================================================
// RESOURCE DEFINITIONS
// ============================================================================

const soReconciliationDetailResource = defineResource({
  path: ":id",
  meta: { title: "SO Match Detail" },
  component: SOReconciliationDetailPage,
});

export const soReconciliationDemoResource = defineResource({
  path: "so-reconciliation-demo",
  meta: { title: "SO Reconciliation Demo" },
  component: SOReconciliationListPage,
  subResources: [soReconciliationDetailResource],
});
