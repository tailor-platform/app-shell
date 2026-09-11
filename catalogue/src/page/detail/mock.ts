export type LineItem = {
  id: string;
  itemName: string;
  sku: string;
  qty: number;
  unit: string;
  unitPrice: number;
  /** Projection written by the receiving module, never by this screen. */
  received: number;
  subtotal: number;
};

/** A document this one was created from. Several, so it earns a card. */
export type SourceDocument = {
  id: string;
  docNumber: string;
  href: string;
  status: string;
  raisedAt: string;
};

/** A document created by acting on this one. */
export type GoodsReceipt = {
  id: string;
  docNumber: string;
  href: string;
  status: string;
  receivedAt: string;
  qty: number;
};

export type ActivityItem = {
  id: string;
  actor: { name: string };
  description: string;
  timestamp: Date;
};

export type PurchaseOrder = {
  id: string;
  docNumber: string;
  /** The lifecycle axis — the only one this screen owns. */
  orderStatus: "DRAFT" | "CONFIRMED" | "SETTLED" | "CANCELLED";
  /** Progress axes. Stamped by other modules; render, never offer a control. */
  receiptStatus: string;
  billingStatus: string;
  supplier: string;
  supplierHref: string;
  currency: string;
  total: number;
  /** A bare `Date` scalar — a "YYYY-MM-DD" string, not a DateTime. */
  orderDate: string;
  expectedDate: string;
  /** A real `DateTime`. */
  confirmedAt: Date | null;
  lineItems: LineItem[];
  sourceDocuments: SourceDocument[];
  goodsReceipts: GoodsReceipt[];
  activities: ActivityItem[];
  holds: Hold[];
  referenceDocuments: ReferenceDocument[];
  /** Empty until the record is posted; the tab strip disappears with it. */
  journalLines: JournalLine[];
};

/** An active block stopping the record from progressing. */
export type Hold = {
  id: string;
  reason: string;
  placedBy: string;
  placedAt: string;
};

/** A file attached to the record. */
export type ReferenceDocument = {
  id: string;
  name: string;
  href: string;
  uploadedAt: string;
  sizeLabel: string;
};

/** One side of a general-ledger entry this record booked. */
export type JournalLine = {
  id: string;
  account: string;
  accountCode: string;
  debit: number | null;
  credit: number | null;
};

/** Present only when the record is mirrored in a third-party system. */
export type ExternalSource = {
  system: string;
  recordLabel: string;
  href: string;
  syncedAt: Date;
};

export const mockPurchaseOrder: PurchaseOrder = {
  id: "1",
  docNumber: "PO-24118",
  orderStatus: "CONFIRMED",
  receiptStatus: "PARTIAL",
  billingStatus: "UNBILLED",
  supplier: "Acme Corp",
  supplierHref: "/procurement/suppliers/acme",
  currency: "USD",
  total: 4500,
  orderDate: "2026-04-12",
  expectedDate: "2026-05-08",
  confirmedAt: new Date("2026-04-12T12:41:00Z"),
  lineItems: [
    {
      id: "l-1",
      itemName: "Cotton canvas, 12oz",
      sku: "SKU-42",
      qty: 12,
      unit: "roll",
      unitPrice: 150,
      received: 12,
      subtotal: 1800,
    },
    {
      id: "l-2",
      itemName: "Brass eyelets, 8mm",
      sku: "SKU-77",
      qty: 8,
      unit: "box",
      unitPrice: 200,
      received: 3,
      subtotal: 1600,
    },
    {
      id: "l-3",
      itemName: "Waxed thread",
      sku: "SKU-91",
      qty: 5,
      unit: "spool",
      unitPrice: 220,
      received: 0,
      subtotal: 1100,
    },
  ],
  sourceDocuments: [
    {
      id: "req-1",
      docNumber: "REQ-0912",
      href: "/procurement/requisitions/REQ-0912",
      status: "APPROVED",
      raisedAt: "2026-04-02",
    },
    {
      id: "req-2",
      docNumber: "REQ-0918",
      href: "/procurement/requisitions/REQ-0918",
      status: "APPROVED",
      raisedAt: "2026-04-05",
    },
  ],
  goodsReceipts: [
    {
      id: "gr-1",
      docNumber: "GR-8801",
      href: "/procurement/goods-receipts/GR-8801",
      status: "POSTED",
      receivedAt: "2026-04-28",
      qty: 12,
    },
    {
      id: "gr-2",
      docNumber: "GR-8814",
      href: "/procurement/goods-receipts/GR-8814",
      status: "POSTED",
      receivedAt: "2026-05-02",
      qty: 3,
    },
  ],
  holds: [
    {
      id: "h-1",
      reason: "Supplier bank details changed since the last payment",
      placedBy: "Aiko Sato",
      placedAt: "2026-05-03",
    },
  ],
  referenceDocuments: [
    {
      id: "f-1",
      name: "Signed order confirmation.pdf",
      href: "/files/po-24118-confirmation.pdf",
      uploadedAt: "2026-04-13",
      sizeLabel: "148 KB",
    },
    {
      id: "f-2",
      name: "Supplier quote.pdf",
      href: "/files/req-0912-quote.pdf",
      uploadedAt: "2026-04-02",
      sizeLabel: "92 KB",
    },
  ],
  journalLines: [
    { id: "j-1", account: "Inventory", accountCode: "1300", debit: 3400, credit: null },
    { id: "j-2", account: "GRNI", accountCode: "2150", debit: null, credit: 3400 },
  ],
  activities: [
    {
      id: "a-1",
      actor: { name: "Aiko Sato" },
      description: "Amended line SKU-77 quantity to 8",
      timestamp: new Date("2026-05-02T09:41:00"),
    },
    {
      id: "a-2",
      actor: { name: "Taro Tanaka" },
      description: "Confirmed the order",
      timestamp: new Date("2026-04-12T12:41:00"),
    },
  ],
};

export const mockExternalSource: ExternalSource = {
  system: "QuickBooks Online",
  recordLabel: "Bill 1042",
  href: "https://qbo.example.com/bill/1042",
  syncedAt: new Date("2026-05-02T10:02:00"),
};
