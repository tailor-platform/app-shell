import { DataTable, createColumnHelper, useDataTable, useToast } from "@tailor-platform/app-shell";
import { useRef, useState } from "react";

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

// Pretend server: the consumer owns optimistic updates and rollback.
function saveUnitPrice(value: number): Promise<void> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (value > 10_000) reject(new Error("Price above the approval limit"));
      else resolve();
    }, 600);
  });
}

const { column } = createColumnHelper<ReceiptLine>();

/** Typed editors notify changes; this screen owns rules, feedback, and saving. */
export function InlineEditingDemo() {
  const toast = useToast();
  const [lines, setLines] = useState(RECEIPT_LINES);
  const [lastChange, setLastChange] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [savingCount, setSavingCount] = useState(0);
  const priceSaves = useRef(
    new Map(
      RECEIPT_LINES.map((line) => [
        line.id,
        { revision: 0, savedRevision: 0, savedValue: line.unitPrice },
      ]),
    ),
  );

  const update = (id: string, patch: Partial<ReceiptLine>, label: string) => {
    setLines((prev) => prev.map((line) => (line.id === id ? { ...line, ...patch } : line)));
    setLastChange(`${id} · ${label}`);
    setFeedback(null);
  };

  const reject = (message: string) => {
    setFeedback(message);
    toast.error(message);
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
      // "None" is available in the editor; the consumer rejects it.
      edit: {
        options: SUPPLIERS,
        canEdit: (row) => row.status === "pending",
        onValueChange: (row, value) => {
          if (value === null) {
            reject(`${row.id}: Supplier is required`);
            return;
          }
          update(row.id, { supplierId: value }, `Supplier → ${value}`);
        },
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
        onValueChange: (row, value) =>
          update(row.id, { warehouseId: value }, `Warehouse → ${value ?? "none"}`),
      },
    }),
    column({ id: "ordered", label: "Ordered", type: "number", width: 88 }),
    column({
      id: "received",
      label: "Received",
      type: "number",
      width: 104,
      typeOptions: { maxDecimals: 0 },
      edit: {
        canEdit: (_row, { selected }) => selected,
        onValueChange: (row, value) => {
          if (value !== null && (!Number.isInteger(value) || value < 0 || value > row.ordered)) {
            reject(`${row.id}: Received must be a whole number from 0 to ${row.ordered}`);
            return;
          }
          update(row.id, { received: value }, `Received → ${value ?? "empty"}`);
        },
      },
    }),
    column({
      id: "unitPrice",
      label: "Unit price",
      type: "money",
      width: 120,
      typeOptions: { currency: (row) => row.currency },
      edit: {
        onValueChange: (row, value) => {
          const scale = row.currency === "JPY" ? 1 : 100;
          if (value === null || value < 0 || Math.round(value * scale) / scale !== value) {
            reject(
              `${row.id}: Unit price is required, non-negative, and must fit ${row.currency} precision`,
            );
            return;
          }
          const request = priceSaves.current.get(row.id)!;
          const revision = ++request.revision;
          update(row.id, { unitPrice: value }, `Unit price → ${value} (saving)`);
          setSavingCount((count) => count + 1);
          // Ignore stale failures; rollback changes only this field, not the whole row.
          void saveUnitPrice(value)
            .then(() => {
              if (revision > request.savedRevision) {
                request.savedRevision = revision;
                request.savedValue = value;
              }
              if (revision === request.revision) {
                setLastChange(`${row.id} · Unit price → ${value} (saved)`);
              }
            })
            .catch((error: unknown) => {
              if (revision !== request.revision) return;
              update(row.id, { unitPrice: request.savedValue }, "Unit price reverted by consumer");
              reject(
                `Couldn't save ${row.sku}: ${error instanceof Error ? error.message : "Unknown error"}`,
              );
            })
            .finally(() => setSavingCount((count) => count - 1));
        },
      },
    }),
    column({
      id: "discount",
      label: "Discount %",
      type: "number",
      width: 110,
      typeOptions: { maxDecimals: 1 },
      edit: {
        onValueChange: (row, value) => {
          if (value === null || value < 0 || value > 100 || Math.round(value * 10) / 10 !== value) {
            reject(`${row.id}: Discount must be 0–100 with at most one decimal`);
            return;
          }
          update(row.id, { discount: value }, `Discount → ${value}%`);
        },
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
      typeOptions: { maxDecimals: 3 },
      edit: {
        onValueChange: (row, value) => {
          if (
            value !== null &&
            (value < 0 || value > 500 || Math.round(value * 1000) / 1000 !== value)
          ) {
            reject(`${row.id}: Weight must be 0–500 kg with at most three decimals`);
            return;
          }
          update(row.id, { weightKg: value }, `Weight → ${value ?? "empty"} kg`);
        },
      },
    }),
    column({
      id: "lot",
      label: "Lot no.",
      type: "text",
      width: 120,
      edit: {
        onValueChange: (row, value) => {
          if (value === null || value.trim() === "") {
            reject(`${row.id}: Lot no. is required`);
            return;
          }
          update(row.id, { lot: value }, `Lot → ${value}`);
        },
      },
    }),
    column({
      id: "expected",
      label: "Expected",
      type: "date",
      width: 140,
      edit: {
        onValueChange: (row, value) => {
          if (value !== null && value < "2026-09-01") {
            reject(`${row.id}: Expected must be September 2026 or later`);
            return;
          }
          update(row.id, { expected: value }, `Expected → ${value ?? "cleared"}`);
        },
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
        onValueChange: (row, value) =>
          update(row.id, { receivedAt: value }, `Received at → ${value ?? "cleared"}`),
      },
    }),
    column({
      id: "bestBefore",
      label: "Best before",
      type: "date",
      width: 140,
      // The calendar is unconstrained; this screen decides whether to accept a day.
      edit: {
        onValueChange: (row, value) => {
          if (value !== null && (value < "2026-10-01" || value > "2027-12-31")) {
            reject(`${row.id}: Best before must be October 2026–December 2027`);
            return;
          }
          update(row.id, { bestBefore: value }, `Best before → ${value ?? "cleared"}`);
        },
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
      // Choices come from `badgeLabelMap`; requiredness belongs to the consumer.
      edit: {
        onValueChange: (row, value) => {
          if (value === null) {
            reject(`${row.id}: Status is required`);
            return;
          }
          update(row.id, { status: value as LineStatus }, `Status → ${value}`);
        },
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
        onValueChange: (row, value) =>
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
        onValueChange: (row, value) =>
          update(row.id, { note: value }, `Note → ${value ?? "empty"}`),
      },
    }),
  ];

  const table = useDataTable<ReceiptLine>({
    columns,
    data: { rows: lines, total: lines.length },
    tableId: "lab-inline-editing-on-value-change",
    rowSelection: {},
  });

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        <strong>Consumer-owned rules and saving.</strong> Editors notify on Enter, Tab, blur, or a
        pick. This screen accepts or rejects the value: rejected business values return to the
        existing data, without adding cell errors or blocking Tab navigation. Saving has no built-in
        indicator, rollback, or leave-page prompt.
      </p>
      {feedback && (
        <p
          role="alert"
          className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive"
        >
          {feedback}
        </p>
      )}
      <DataTable.Root value={table}>
        <DataTable.Table />
        <DataTable.Footer>
          <div aria-live="polite" className="space-y-1 text-sm text-muted-foreground">
            <p>
              Last change: <span className="font-mono">{lastChange ?? "—"}</span>
            </p>
            <p>Consumer saves in flight: {savingCount}</p>
          </div>
        </DataTable.Footer>
      </DataTable.Root>
    </div>
  );
}
