import {
  defineResource,
  Layout,
  Button,
  ReconciliationList,
  ReconciliationDetail,
  useParams,
  useNavigate,
} from "@tailor-platform/app-shell";
import type { ReconciliationListItem, ReconciliationRecord } from "@tailor-platform/app-shell";
import { useState, useEffect } from "react";

// Inline upload icon to avoid direct lucide-react dependency in app-module
const UploadIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="17 8 12 3 7 8" />
    <line x1="12" y1="3" x2="12" y2="15" />
  </svg>
);

// 🧪 Dummy Data: Reconciliation list items
// 🧪 Status configuration for the invoice reconciliation use case
const STATUS_CONFIG = {
  processingStatus: "processing",
  errorStatus: "error",
  hideActionsForStatuses: ["matched", "processing"],
  badgeVariantMap: {
    matched: "subtle-success",
    partial_match: "subtle-warning",
    mismatch: "subtle-error",
    processing: "subtle-default",
    error: "subtle-error",
  },
  labelMap: {
    matched: "Matched",
    partial_match: "Partial Match",
    mismatch: "Mismatch",
    processing: "Processing",
    error: "Error",
  },
};

const LIST_TABS = [
  { key: "all", label: "All" },
  { key: "matched", label: "Matched" },
  { key: "partial_match", label: "Partial Match" },
  { key: "mismatch", label: "Mismatch" },
  { key: "processing", label: "Processing" },
  { key: "error", label: "Error" },
];

const LIST_COLUMNS = [
  { key: "invoiceNumber", header: "Invoice #" },
  { key: "supplier", header: "Supplier", truncate: true },
  { key: "status", header: "Status", type: "badge" as const },
  { key: "matchScore", header: "Score", type: "score" as const, align: "right" as const },
  {
    key: "totalAmount",
    header: "Amount",
    type: "money" as const,
    align: "right" as const,
    meta: { currencyKey: "currency" },
  },
  { key: "date", header: "Date", type: "date" as const },
  {
    key: "createdInvoiceLabel",
    header: "Created Invoice",
    type: "link" as const,
    meta: { hrefKey: "createdInvoiceHref" },
  },
];

const demoListItems: ReconciliationListItem[] = [
  {
    id: "1",
    status: "matched",
    data: {
      invoiceNumber: "26TKC-00200",
      supplier: "CADICA Tekstil VE Tic. Ltd. Sti.",
      matchScore: 100,
      totalAmount: 7854.01,
      currency: "USD",
      date: new Date("2026-04-07"),
      createdInvoiceLabel: "PI-2026-00371",
      createdInvoiceHref: "#",
    },
  },
  {
    id: "2",
    status: "partial_match",
    data: {
      invoiceNumber: "SS26-0522",
      supplier: "Karmen Deri Urunleri Sanayi ve Ticaret A.S.",
      matchScore: 75,
      totalAmount: 157990.0,
      currency: "USD",
      date: new Date("2026-04-07"),
    },
  },
  {
    id: "3",
    status: "partial_match",
    data: {
      invoiceNumber: "DT26010026",
      supplier: "Dongtex Industrial Co., Ltd.",
      matchScore: 88,
      totalAmount: 621.37,
      currency: "USD",
      date: new Date("2026-04-07"),
    },
  },
  {
    id: "4",
    status: "mismatch",
    data: {
      invoiceNumber: "MZ26-04187",
      supplier: "Mazzucchelli 1849 S.p.A.",
      matchScore: 42,
      totalAmount: 18720.0,
      currency: "EUR",
      date: new Date("2026-04-06"),
    },
  },
  {
    id: "5",
    status: "processing",
    data: {
      invoiceNumber: "PT26-00891",
      supplier: "Premiata S.r.l.",
      matchScore: 0,
      totalAmount: 34500.0,
      currency: "EUR",
      date: new Date("2026-04-08"),
    },
  },
  {
    id: "6",
    status: "error",
    data: {
      invoiceNumber: "HK26-SL0044",
      supplier: "Sun Hing Leather Co., Ltd.",
      matchScore: 0,
      totalAmount: 8900.0,
      currency: "USD",
      date: new Date("2026-04-09"),
    },
  },
];

// 🧪 Field and column configurations for the invoice reconciliation use case
const INVOICE_FIELDS = [
  { key: "invoiceNumber", label: "Invoice Number", meta: { copyable: true } },
  {
    key: "status",
    label: "Status",
    type: "badge" as const,
    meta: {
      badgeVariantMap: {
        matched: "subtle-success",
        partial_match: "subtle-warning",
        mismatch: "subtle-error",
        processing: "subtle-default",
        error: "subtle-error",
      },
    },
  },
  { key: "supplier", label: "Supplier" },
  {
    key: "totalAmount",
    label: "Total Amount",
    type: "money" as const,
    meta: { currencyKey: "currency" },
  },
  {
    key: "invoiceDate",
    label: "Invoice Date",
    type: "date" as const,
    meta: { dateFormat: "medium" as const },
  },
  { type: "divider" as const },
  { key: "summary", label: "Summary", emptyBehavior: "hide" as const },
];

const LINE_ITEM_COLUMNS = [
  { key: "lineNumber", header: "#" },
  { key: "product", header: "Product" },
  {
    key: "status",
    header: "Status",
    type: "badge" as const,
    meta: {
      badgeVariantMap: {
        matched: "subtle-success",
        price_mismatch: "subtle-warning",
        qty_mismatch: "subtle-warning",
        missing: "subtle-error",
      },
    },
  },
  { key: "invoiceQty", header: "Inv Qty", type: "number" as const, align: "right" as const },
  { key: "poQty", header: "PO Qty", type: "number" as const, align: "right" as const },
  { key: "grQty", header: "GR Qty", type: "number" as const, align: "right" as const },
  { key: "qtyVariance", header: "Qty Var", type: "variance" as const, align: "right" as const },
  {
    key: "invoicePrice",
    header: "Inv Price",
    type: "money" as const,
    align: "right" as const,
    meta: { currencyKey: "currency" },
  },
  {
    key: "poPrice",
    header: "PO Price",
    type: "money" as const,
    align: "right" as const,
    meta: { currencyKey: "currency" },
  },
  { key: "priceVariance", header: "Price Var", type: "variance" as const, align: "right" as const },
];

// 🧪 Dummy Data: Full records by ID
const recordsById: Record<string, ReconciliationRecord> = {
  "1": {
    id: "1",
    status: "matched",
    matchScore: 100,
    data: {
      invoiceNumber: "26TKC-00200",
      status: "matched",
      supplier: "CADICA Tekstil VE Tic. Ltd. Sti.",
      totalAmount: 7854.01,
      currency: "USD",
      invoiceDate: new Date("2026-03-04"),
      summary: "All 2 line items matched successfully.",
    },
    summary: "All 2 line items matched successfully.",
    processingSteps: [
      {
        id: "s1",
        label: "Job requested — 26TKC-00200.pdf uploaded by Admin User",
        status: "completed",
        timestamp: new Date("2026-04-07T19:20:33"),
      },
      {
        id: "s2",
        label: "Extraction started — invoice-extraction-schema-v2",
        status: "completed",
        timestamp: new Date("2026-04-07T19:20:35"),
      },
      {
        id: "s3",
        label: "Extraction completed — 2 line items, $7,854.01 total, supplier CADICA Tekstil",
        status: "completed",
        timestamp: new Date("2026-04-07T19:21:17"),
      },
      {
        id: "s4",
        label: "Three-way matching — matched against PO-105539",
        status: "completed",
        timestamp: new Date("2026-04-07T19:21:17"),
      },
      {
        id: "s5",
        label: "Job completed — 100% match, all items verified",
        status: "completed",
        timestamp: new Date("2026-04-07T19:21:42"),
      },
    ],
    discrepancies: [],
    lineItems: [
      {
        lineNumber: 1,
        product: "DVZA00677",
        status: "matched",
        invoiceQty: 35700,
        poQty: 35700,
        grQty: 35700,
        qtyVariance: 0,
        invoicePrice: 0.22,
        poPrice: 0.22,
        priceVariance: 0,
        currency: "USD",
      },
      {
        lineNumber: 2,
        product: "DVPU00316",
        status: "matched",
        invoiceQty: 1,
        poQty: 1,
        grQty: 1,
        qtyVariance: 0,
        invoicePrice: 0.01,
        poPrice: 0.01,
        priceVariance: 0,
        currency: "USD",
      },
    ],
    relatedDocuments: [
      {
        id: "po-1",
        type: "purchase_order",
        label: "PO-105539",
        status: "Approved",
        statusVariant: "success",
        autoGenerated: false,
        href: "#",
      },
      {
        id: "gr-1",
        type: "goods_receipt",
        label: "GR-200145",
        status: "Received",
        statusVariant: "success",
        autoGenerated: false,
        href: "#",
      },
      {
        id: "pi-1",
        type: "purchase_invoice",
        label: "PI-2026-00371",
        status: "Draft",
        statusVariant: "warning",
        autoGenerated: true,
        href: "#",
      },
    ],
  },
  "2": {
    id: "2",
    status: "partial_match",
    matchScore: 75,
    data: {
      invoiceNumber: "SS26-0522",
      status: "partial_match",
      supplier: "Karmen Deri Urunleri Sanayi ve Ticaret A.S.",
      totalAmount: 157990.0,
      currency: "USD",
      invoiceDate: new Date("2026-07-03"),
      summary: "0/2 line items matched. 2 price discrepancies.",
    },
    summary: "0/2 line items matched. 2 price discrepancies.",
    processingSteps: [
      {
        id: "s1",
        label: "Job requested — 2026-03-08_Karmen Deri_SS26-0522.pdf uploaded by Admin User",
        status: "completed",
        timestamp: new Date("2026-04-07T19:21:08"),
      },
      {
        id: "s2",
        label: "Extraction started — invoice-extraction-schema-v2",
        status: "completed",
        timestamp: new Date("2026-04-07T19:21:08"),
      },
      {
        id: "s3",
        label:
          "Extraction completed — 2 line items, $157,990 total, supplier Karmen Leather (Turkey)",
        status: "completed",
        timestamp: new Date("2026-04-07T19:21:17"),
      },
      {
        id: "s4",
        label: "Three-way matching — matched against PO-105539, PO-105541",
        status: "completed",
        timestamp: new Date("2026-04-07T19:21:17"),
      },
      {
        id: "s5",
        label: "Job completed — 75% match, 2 discrepancies found",
        status: "completed",
        timestamp: new Date("2026-04-07T19:21:42"),
      },
    ],
    discrepancies: [
      {
        id: "d1",
        severity: "warning",
        category: "Price over PO",
        message: "SS26OAL1144: Invoice $370, PO $365",
        resolved: false,
      },
      {
        id: "d2",
        severity: "error",
        category: "Qty mismatch",
        message: "SS26OAL1144 (line 2): Invoice 10, PO 427",
        resolved: false,
      },
    ],
    lineItems: [
      {
        lineNumber: 1,
        product: "SS26OAL1144",
        status: "price_mismatch",
        invoiceQty: 417,
        poQty: 427,
        grQty: 427,
        qtyVariance: 0,
        invoicePrice: 370,
        poPrice: 365,
        priceVariance: 1.4,
        currency: "USD",
      },
      {
        lineNumber: 2,
        product: "SS26OAL1144",
        status: "price_mismatch",
        invoiceQty: 10,
        poQty: 427,
        grQty: 427,
        qtyVariance: 0,
        invoicePrice: 370,
        poPrice: 365,
        priceVariance: 1.4,
        currency: "USD",
      },
    ],
    relatedDocuments: [
      {
        id: "po-2",
        type: "purchase_order",
        label: "PO-105539",
        status: "Approved",
        statusVariant: "success",
        autoGenerated: false,
        href: "#",
      },
      {
        id: "gr-2",
        type: "goods_receipt",
        label: "GR-200300",
        status: "Received",
        statusVariant: "success",
        autoGenerated: false,
        href: "#",
      },
    ],
  },
  "4": {
    id: "4",
    status: "mismatch",
    matchScore: 42,
    data: {
      invoiceNumber: "MZ26-04187",
      status: "mismatch",
      supplier: "Mazzucchelli 1849 S.p.A.",
      totalAmount: 18720.0,
      currency: "EUR",
      invoiceDate: new Date("2026-03-28"),
      summary: "1/3 line items matched. 1 quantity mismatch, 1 price mismatch.",
    },
    summary: "1/3 line items matched. 1 quantity mismatch, 1 price mismatch.",
    processingSteps: [
      {
        id: "s1",
        label: "Job requested — MZ26-04187.pdf uploaded by Admin User",
        status: "completed",
        timestamp: new Date("2026-04-06T14:10:00"),
      },
      {
        id: "s2",
        label: "Extraction started — invoice-extraction-schema-v2",
        status: "completed",
        timestamp: new Date("2026-04-06T14:10:02"),
      },
      {
        id: "s3",
        label: "Extraction completed — 3 line items, €18,720 total, supplier Mazzucchelli 1849",
        status: "completed",
        timestamp: new Date("2026-04-06T14:10:18"),
      },
      {
        id: "s4",
        label: "Three-way matching — matched against PO-108200",
        status: "completed",
        timestamp: new Date("2026-04-06T14:10:19"),
      },
      {
        id: "s5",
        label: "Job completed — 42% match, 2 discrepancies found",
        status: "completed",
        timestamp: new Date("2026-04-06T14:10:32"),
      },
    ],
    discrepancies: [
      {
        id: "d1",
        severity: "error",
        category: "Qty mismatch",
        message: "MZ-CA-BLK-3MM: Invoice qty 600, PO qty 500 — 100 units over ordered quantity",
        resolved: false,
      },
      {
        id: "d2",
        severity: "warning",
        category: "Price over PO",
        message: "MZ-CA-TRT-2MM: Invoice €14.20/sheet, PO €13.50/sheet — 5.2% above agreed price",
        resolved: false,
      },
    ],
    lineItems: [
      {
        lineNumber: 1,
        product: "MZ-CA-BLK-3MM",
        status: "qty_mismatch",
        invoiceQty: 600,
        poQty: 500,
        grQty: 500,
        qtyVariance: 20,
        invoicePrice: 12.8,
        poPrice: 12.8,
        priceVariance: 0,
        currency: "EUR",
      },
      {
        lineNumber: 2,
        product: "MZ-CA-TRT-2MM",
        status: "price_mismatch",
        invoiceQty: 400,
        poQty: 400,
        grQty: 400,
        qtyVariance: 0,
        invoicePrice: 14.2,
        poPrice: 13.5,
        priceVariance: 5.2,
        currency: "EUR",
      },
      {
        lineNumber: 3,
        product: "MZ-CA-NAT-1MM",
        status: "matched",
        invoiceQty: 200,
        poQty: 200,
        grQty: 200,
        qtyVariance: 0,
        invoicePrice: 9.6,
        poPrice: 9.6,
        priceVariance: 0,
        currency: "EUR",
      },
    ],
    relatedDocuments: [
      {
        id: "po-4",
        type: "purchase_order",
        label: "PO-108200",
        status: "Confirmed",
        statusVariant: "success",
        autoGenerated: false,
        href: "#",
      },
      {
        id: "gr-4",
        type: "goods_receipt",
        label: "GR-300100",
        status: "Received",
        statusVariant: "success",
        autoGenerated: false,
        href: "#",
      },
    ],
  },
  "5": {
    id: "5",
    status: "processing",
    matchScore: 0,
    data: {},
    summary: "",
    processingSteps: [
      {
        id: "s1",
        label: "Job requested — PT26-00891.pdf uploaded by Admin User",
        status: "completed",
        timestamp: new Date("2026-04-08T10:00:00"),
      },
      {
        id: "s2",
        label: "Extraction in progress — invoice-extraction-schema-v2",
        status: "in_progress",
      },
      { id: "s3", label: "Three-way matching", status: "pending" },
    ],
    discrepancies: [],
    lineItems: [],
    relatedDocuments: [],
  },
  "6": {
    id: "6",
    status: "error",
    matchScore: 0,
    data: {},
    summary: "OCR extraction failed — scanned image is too low resolution (below 150 DPI minimum).",
    processingSteps: [
      {
        id: "s1",
        label: "Job requested — HK26-SL0044.pdf uploaded by Admin User",
        status: "completed",
        timestamp: new Date("2026-04-09T11:30:00"),
      },
      {
        id: "s2",
        label: "Extraction started — invoice-extraction-schema-v2",
        status: "completed",
        timestamp: new Date("2026-04-09T11:30:02"),
      },
      {
        id: "s3",
        label: "Extraction failed — image resolution below 150 DPI threshold",
        status: "completed",
        timestamp: new Date("2026-04-09T11:30:05"),
      },
    ],
    discrepancies: [],
    lineItems: [],
    relatedDocuments: [],
  },
};

// ============================================================================
// SHARED STATE — module-level store for upload simulation
// ============================================================================

// 🧪 Module-level store so state persists across list ↔ detail navigation
let _dynamicRecords: Record<string, ReconciliationRecord> = {};
let _dynamicListItems: ReconciliationListItem[] = [];
let _nextId = 100;
let _listeners: Array<() => void> = [];

function subscribe(fn: () => void) {
  _listeners.push(fn);
  return () => {
    _listeners = _listeners.filter((l) => l !== fn);
  };
}

function notify() {
  for (const fn of _listeners) fn();
}

function useDemoStore() {
  const [, forceUpdate] = useState(0);
  useEffect(() => subscribe(() => forceUpdate((c) => c + 1)), []);
  return { dynamicRecords: _dynamicRecords, dynamicListItems: _dynamicListItems };
}

// 🧪 Dummy Data: simulated matched result after processing completes
function buildMatchedRecord(id: string, fileName: string, uploadTime: Date): ReconciliationRecord {
  return {
    id,
    status: "matched",
    matchScore: 100,
    data: {
      invoiceNumber: fileName.replace(/\.[^.]+$/, ""),
      status: "matched",
      supplier: "CADICA Tekstil VE Tic. Ltd. Sti.",
      totalAmount: 7854.01,
      currency: "USD",
      invoiceDate: new Date("2026-03-04"),
      summary: "All 2 line items matched successfully.",
    },
    summary: "All 2 line items matched successfully.",
    processingSteps: [
      {
        id: "s1",
        label: `Job requested — ${fileName} uploaded by Admin User`,
        status: "completed",
        timestamp: uploadTime,
      },
      {
        id: "s2",
        label: "Extraction started — invoice-extraction-schema-v2",
        status: "completed",
        timestamp: new Date(uploadTime.getTime() + 2000),
      },
      {
        id: "s3",
        label: "Extraction completed — 2 line items, $7,854.01 total, supplier CADICA Tekstil",
        status: "completed",
        timestamp: new Date(uploadTime.getTime() + 4000),
      },
      {
        id: "s4",
        label: "Three-way matching — matched against PO-105539",
        status: "completed",
        timestamp: new Date(uploadTime.getTime() + 5000),
      },
      {
        id: "s5",
        label: "Job completed — 100% match, all items verified",
        status: "completed",
        timestamp: new Date(uploadTime.getTime() + 6000),
      },
    ],
    discrepancies: [],
    lineItems: [
      {
        lineNumber: 1,
        product: "DVZA00677",
        status: "matched",
        invoiceQty: 35700,
        poQty: 35700,
        grQty: 35700,
        qtyVariance: 0,
        invoicePrice: 0.22,
        poPrice: 0.22,
        priceVariance: 0,
        currency: "USD",
      },
      {
        lineNumber: 2,
        product: "DVPU00316",
        status: "matched",
        invoiceQty: 1,
        poQty: 1,
        grQty: 1,
        qtyVariance: 0,
        invoicePrice: 0.01,
        poPrice: 0.01,
        priceVariance: 0,
        currency: "USD",
      },
    ],
    relatedDocuments: [
      {
        id: "po-1",
        type: "purchase_order",
        label: "PO-105539",
        status: "Approved",
        statusVariant: "success",
        autoGenerated: false,
        href: "#",
      },
      {
        id: "gr-1",
        type: "goods_receipt",
        label: "GR-200145",
        status: "Received",
        statusVariant: "success",
        autoGenerated: false,
        href: "#",
      },
      {
        id: "pi-1",
        type: "purchase_invoice",
        label: "PI-2026-00371",
        status: "Draft",
        statusVariant: "warning",
        autoGenerated: true,
        href: "#",
      },
    ],
  };
}

function addUploadedRecord(file: File): string {
  const id = String(_nextId++);
  const now = new Date();
  const fileName = file.name;

  const processingRecord: ReconciliationRecord = {
    id,
    status: "processing",
    matchScore: 0,
    data: { invoiceNumber: fileName.replace(/\.[^.]+$/, "") },
    summary: "",
    processingSteps: [
      {
        id: "s1",
        label: `Job requested — ${fileName} uploaded by Admin User`,
        status: "completed",
        timestamp: now,
      },
      {
        id: "s2",
        label: "Extraction in progress — invoice-extraction-schema-v2",
        status: "in_progress",
      },
      { id: "s3", label: "Three-way matching", status: "pending" },
    ],
    discrepancies: [],
    lineItems: [],
    relatedDocuments: [],
  };

  _dynamicRecords = { ..._dynamicRecords, [id]: processingRecord };
  _dynamicListItems = [
    {
      id,
      status: "processing",
      data: {
        invoiceNumber: String(
          processingRecord.data.invoiceNumber ?? fileName.replace(/\.[^.]+$/, ""),
        ),
        supplier: "—",
        matchScore: 0,
        totalAmount: 0,
        currency: "USD",
        date: now,
      },
    },
    ..._dynamicListItems,
  ];
  notify();

  // Simulate pipeline: after 6s transition to matched
  setTimeout(() => {
    const matched = buildMatchedRecord(id, fileName, now);
    _dynamicRecords = { ..._dynamicRecords, [id]: matched };
    _dynamicListItems = _dynamicListItems.map((item) =>
      item.id === id
        ? {
            ...item,
            status: "matched",
            data: {
              ...item.data,
              matchScore: 100,
              supplier: String(matched.data.supplier ?? ""),
              totalAmount: Number(matched.data.totalAmount ?? 0),
            },
          }
        : item,
    );
    notify();
  }, 6000);

  return id;
}

// ============================================================================
// LIST PAGE
// ============================================================================

const ReconciliationListPage = () => {
  const navigate = useNavigate();
  const [uploadOpen, setUploadOpen] = useState(false);
  const { dynamicListItems } = useDemoStore();

  const allItems = [...dynamicListItems, ...demoListItems];

  return (
    <Layout>
      <Layout.Header
        title="Invoice Reconciliation"
        actions={[
          <Button key="upload" onClick={() => setUploadOpen(true)}>
            <UploadIcon />
            Upload Invoice
          </Button>,
        ]}
      />
      <Layout.Column>
        <ReconciliationList
          items={allItems}
          statusConfig={STATUS_CONFIG}
          tabs={LIST_TABS}
          columns={LIST_COLUMNS}
          onItemClick={(item) => {
            navigate(`/custom-page/reconciliation-demo/${item.id}`);
          }}
          onUpload={(file) => {
            const newId = addUploadedRecord(file);
            setUploadOpen(false);
            navigate(`/custom-page/reconciliation-demo/${newId}`);
          }}
          uploadOpen={uploadOpen}
          onUploadOpenChange={setUploadOpen}
          uploadDialogProps={{
            title: "Upload Invoice",
            description:
              "Upload a PDF or image of a supplier invoice. The system will extract data and match it against existing purchase orders and goods receipts.",
            uploadLabel: "Upload Invoice",
          }}
        />
      </Layout.Column>
    </Layout>
  );
};

// ============================================================================
// DETAIL PAGE
// ============================================================================

const ReconciliationDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const { dynamicRecords } = useDemoStore();

  // Look up in dynamic records first, then static
  const record = id ? (dynamicRecords[id] ?? recordsById[id]) : undefined;

  if (!record) {
    return (
      <Layout>
        <Layout.Header title="Not Found" />
        <Layout.Column>
          <p>No reconciliation record found for ID: {id}</p>
        </Layout.Column>
      </Layout>
    );
  }

  return (
    <ReconciliationDetail
      data={record}
      statusConfig={STATUS_CONFIG}
      fields={INVOICE_FIELDS}
      lineItemColumns={LINE_ITEM_COLUMNS}
      onCreate={() =>
        alert("Create Purchase Bill — navigates to bill form with OCR-extracted data pre-filled")
      }
      createLabel="Create purchase bill"
      onUpdate={() => alert("Update PO — navigates to purchase order edit page")}
      updateLabel="Update PO"
    />
  );
};

// ============================================================================
// RESOURCE DEFINITIONS
// ============================================================================

const reconciliationDetailResource = defineResource({
  path: ":id",
  meta: { title: "Invoice Match Detail" },
  component: ReconciliationDetailPage,
});

export const reconciliationDemoResource = defineResource({
  path: "reconciliation-demo",
  meta: { title: "Reconciliation Demo" },
  component: ReconciliationListPage,
  subResources: [reconciliationDetailResource],
});
