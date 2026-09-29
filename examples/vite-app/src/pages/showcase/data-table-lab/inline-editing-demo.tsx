import { DataTable, createColumnHelper, useDataTable, useToast } from "@tailor-platform/app-shell";
import { useState } from "react";

// ─── Dummy data ──────────────────────────────────────────────────────────────
// 🧪 Dummy Data: Replace with a real goods-receipt query later.

type LineStatus = "pending" | "partial" | "received" | "damaged";
type QcResult = "pass" | "hold" | "fail";

type ReceiptLine = {
  id: string;
  sku: string;
  product: string;
  supplierId: string;
  warehouseId: string | null;
  ordered: number;
  received: number | null;
  unitPrice: number;
  currency: "USD" | "JPY";
  discount: number;
  weightKg: number | null;
  lot: string;
  expected: string | null;
  receivedAt: string | null;
  bestBefore: string | null;
  status: LineStatus;
  qc: QcResult | null;
  note: string | null;
};

const SUPPLIERS = [
  { value: "hanover", label: "Hanover Apparel Co." },
  { value: "kanto", label: "Kanto Textile" },
  { value: "sagami", label: "Sagami Cap Works" },
  { value: "northfield", label: "Northfield Knitting" },
];

const WAREHOUSES = [
  { value: "tokyo", label: "Tokyo DC" },
  { value: "osaka", label: "Osaka DC" },
  { value: "nagoya", label: "Nagoya Hub" },
];

const RECEIPT_LINES: ReceiptLine[] = [
  {
    id: "GR-1",
    sku: "TS-NAVY-S",
    product: "Tee · Navy · S",
    supplierId: "hanover",
    warehouseId: "tokyo",
    ordered: 24,
    received: 24,
    unitPrice: 8.5,
    currency: "USD",
    discount: 0,
    weightKg: 4.8,
    lot: "L-2609-01",
    expected: "2026-10-02",
    receivedAt: "2026-10-02T09:15:00.000Z",
    bestBefore: null,
    status: "received",
    qc: "pass",
    note: null,
  },
  {
    id: "GR-2",
    sku: "TS-NAVY-M",
    product: "Tee · Navy · M",
    supplierId: "hanover",
    warehouseId: "tokyo",
    ordered: 36,
    received: null,
    unitPrice: 8.5,
    currency: "USD",
    discount: 5,
    weightKg: null,
    lot: "L-2609-02",
    expected: "2026-10-05",
    receivedAt: null,
    bestBefore: null,
    status: "pending",
    qc: null,
    note: null,
  },
  {
    id: "GR-3",
    sku: "TS-NAVY-L",
    product: "Tee · Navy · L",
    supplierId: "hanover",
    warehouseId: "osaka",
    ordered: 36,
    received: 30,
    unitPrice: 8.5,
    currency: "USD",
    discount: 12.5,
    weightKg: 7.25,
    lot: "L-2609-03",
    expected: "2026-10-02",
    receivedAt: "2026-10-03T14:40:00.000Z",
    bestBefore: null,
    status: "partial",
    qc: "hold",
    note: "6 short — backorder",
  },
  {
    id: "GR-4",
    sku: "HD-GREY-M",
    product: "Hoodie · Grey · M",
    supplierId: "kanto",
    warehouseId: null,
    ordered: 12,
    received: null,
    unitPrice: 4200,
    currency: "JPY",
    discount: 0,
    weightKg: null,
    lot: "K-1009-11",
    expected: "2026-10-09",
    receivedAt: null,
    bestBefore: null,
    status: "pending",
    qc: null,
    note: null,
  },
  {
    id: "GR-5",
    sku: "HD-GREY-L",
    product: "Hoodie · Grey · L",
    supplierId: "kanto",
    warehouseId: "nagoya",
    ordered: 12,
    received: 12,
    unitPrice: 4200,
    currency: "JPY",
    discount: 10,
    weightKg: 9.12,
    lot: "K-1009-12",
    expected: "2026-10-01",
    receivedAt: "2026-10-01T02:05:00.000Z",
    bestBefore: null,
    status: "damaged",
    qc: "fail",
    note: "2 with torn seams",
  },
  {
    id: "GR-6",
    sku: "WX-BEE-200",
    product: "Beeswax conditioner · 200 g",
    supplierId: "sagami",
    warehouseId: "osaka",
    ordered: 50,
    received: null,
    unitPrice: 5.25,
    currency: "USD",
    discount: 0,
    weightKg: null,
    lot: "S-2710-04",
    expected: null,
    receivedAt: null,
    bestBefore: "2027-03-31",
    status: "pending",
    qc: null,
    note: null,
  },
];

// Pretend server: saves after a short delay, and rejects unit prices above
// 10,000 so the demo can show a failed autosave reverting the cell.
function saveUnitPrice(value: number): Promise<void> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (value > 10_000) reject(new Error("Price above the approval limit"));
      else resolve();
    }, 600);
  });
}

const { column } = createColumnHelper<ReceiptLine>();

/**
 * Goods receipt with every inline editor and rule: typed numbers with limits
 * (Received, Unit price, Discount %, Weight), required and free text (Lot no.,
 * Note), dropdowns (Supplier, Warehouse), badge dropdowns (Status, QC), and
 * dates (Expected, Received at, Best before).
 */
export function InlineEditingDemo() {
  const toast = useToast();
  const [lines, setLines] = useState(RECEIPT_LINES);
  const [lastCommit, setLastCommit] = useState<string | null>(null);

  const update = (id: string, patch: Partial<ReceiptLine>, label: string) => {
    setLines((prev) => prev.map((line) => (line.id === id ? { ...line, ...patch } : line)));
    setLastCommit(`${id} · ${label}`);
  };

  const columns = [
    column({ id: "sku", label: "SKU", type: "text", width: 120, pin: "left" }),
    column({ id: "product", label: "Product", type: "text" }),
    column({
      id: "supplierId",
      label: "Supplier",
      type: "link",
      width: 170,
      typeOptions: { href: () => "/showcase/data-table-lab" },
      // A required dropdown while the line is still pending; afterwards a read-only link.
      edit: {
        options: SUPPLIERS,
        required: true,
        canEdit: (row) => row.status === "pending",
        onCommit: (row, value) =>
          update(row.id, { supplierId: value ?? row.supplierId }, `Supplier → ${value}`),
      },
    }),
    column({
      id: "warehouseId",
      label: "Warehouse",
      type: "text",
      width: 130,
      // Optional dropdown: offers "None".
      edit: {
        options: WAREHOUSES,
        onCommit: (row, value) =>
          update(row.id, { warehouseId: value }, `Warehouse → ${value ?? "none"}`),
      },
    }),
    column({ id: "ordered", label: "Ordered", type: "number", width: 88 }),
    column({
      id: "received",
      label: "Received",
      type: "number",
      width: 104,
      edit: {
        canEdit: (_row, { selected }) => selected,
        min: 0,
        maxDecimals: 0,
        validate: (value, row) =>
          value !== null && value > row.ordered
            ? `Can't exceed ordered (${row.ordered})`
            : undefined,
        onCommit: (row, value) =>
          update(row.id, { received: value }, `Received → ${value ?? "empty"}`),
      },
    }),
    column({
      id: "unitPrice",
      label: "Unit price",
      type: "money",
      width: 120,
      typeOptions: { currency: (row) => row.currency },
      edit: {
        min: 0,
        required: true,
        // Autosave: the cell shows the new price while the request runs, and
        // goes back to the old one if it fails.
        onCommit: async (row, value) => {
          // `required` means an emptied cell never reaches here.
          if (value === null) return;
          try {
            await saveUnitPrice(value);
            update(row.id, { unitPrice: value }, `Unit price → ${value}`);
          } catch (error) {
            toast.error(`Couldn't save ${row.sku}: ${(error as Error).message}`);
            throw error;
          }
        },
      },
    }),
    column({
      id: "discount",
      label: "Discount %",
      type: "number",
      width: 110,
      // A hard limit: 0–100, one decimal place. Try 150 or -5.
      edit: {
        min: 0,
        max: 100,
        maxDecimals: 1,
        required: true,
        onCommit: (row, value) => update(row.id, { discount: value ?? 0 }, `Discount → ${value}%`),
      },
    }),
    column({
      id: "total",
      label: "Total",
      type: "money",
      width: 120,
      accessor: (row) => (row.received ?? 0) * row.unitPrice * (1 - row.discount / 100),
      typeOptions: { currency: (row) => row.currency },
    }),
    column({
      id: "weightKg",
      label: "Weight (kg)",
      type: "number",
      width: 112,
      // Three decimal places, up to 500 kg.
      edit: {
        min: 0,
        max: 500,
        maxDecimals: 3,
        onCommit: (row, value) =>
          update(row.id, { weightKg: value }, `Weight → ${value ?? "empty"} kg`),
      },
    }),
    column({
      id: "lot",
      label: "Lot no.",
      type: "text",
      width: 120,
      // Required text: clearing it and pressing Enter shows "Required".
      edit: {
        required: true,
        onCommit: (row, value) => update(row.id, { lot: value ?? row.lot }, `Lot → ${value}`),
      },
    }),
    column({
      id: "expected",
      label: "Expected",
      type: "date",
      width: 140,
      edit: {
        min: "2026-09-01",
        onCommit: (row, value) =>
          update(row.id, { expected: value }, `Expected → ${value ?? "cleared"}`),
      },
    }),
    column({
      id: "receivedAt",
      label: "Received at",
      type: "date",
      width: 190,
      typeOptions: { dateFormat: "datetime" },
      // Date and time: pick a day, set the time, then Done.
      edit: {
        onCommit: (row, value) =>
          update(row.id, { receivedAt: value }, `Received at → ${value ?? "cleared"}`),
      },
    }),
    column({
      id: "bestBefore",
      label: "Best before",
      type: "date",
      width: 140,
      // Bounded: only days from Oct 2026 to Dec 2027 can be picked.
      edit: {
        min: "2026-10-01",
        max: "2027-12-31",
        onCommit: (row, value) =>
          update(row.id, { bestBefore: value }, `Best before → ${value ?? "cleared"}`),
      },
    }),
    column({
      id: "status",
      label: "Status",
      type: "badge",
      width: 130,
      typeOptions: {
        badgeLabelMap: {
          pending: "Pending",
          partial: "Partial",
          received: "Received",
          damaged: "Damaged",
        },
        badgeVariantMap: {
          pending: "outline-neutral",
          partial: "outline-warning",
          received: "outline-success",
          damaged: "outline-error",
        },
      },
      // Required badge dropdown; choices come from `badgeLabelMap`.
      edit: {
        required: true,
        onCommit: (row, value) =>
          update(row.id, { status: (value ?? row.status) as LineStatus }, `Status → ${value}`),
      },
    }),
    column({
      id: "qc",
      label: "QC",
      type: "badge",
      width: 110,
      typeOptions: {
        badgeLabelMap: { pass: "Pass", hold: "On hold", fail: "Fail" },
        badgeVariantMap: { pass: "success", hold: "warning", fail: "error" },
      },
      // Optional badge dropdown: offers "None".
      edit: {
        onCommit: (row, value) =>
          update(row.id, { qc: value as QcResult | null }, `QC → ${value ?? "none"}`),
      },
    }),
    column({
      id: "note",
      label: "Note",
      type: "text",
      truncate: true,
      width: 180,
      edit: {
        onCommit: (row, value) => update(row.id, { note: value }, `Note → ${value ?? "empty"}`),
      },
    }),
  ];

  const table = useDataTable<ReceiptLine>({
    columns,
    data: { rows: lines, total: lines.length },
    tableId: "lab-inline-editing-v3",
    onSelectionChange: () => {},
  });

  return (
    <DataTable.Root value={table}>
      <DataTable.Table />
      <DataTable.Footer>
        <p className="text-sm text-muted-foreground">
          Last commit: <span className="font-mono">{lastCommit ?? "—"}</span>
        </p>
      </DataTable.Footer>
    </DataTable.Root>
  );
}
