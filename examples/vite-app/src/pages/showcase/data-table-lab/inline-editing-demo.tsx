import { DataTable, createColumnHelper, useDataTable, useToast } from "@tailor-platform/app-shell";
import { useState } from "react";

// ─── Dummy data ──────────────────────────────────────────────────────────────
// 🧪 Dummy Data: Replace with a real goods-receipt query later.

type LineStatus = "pending" | "partial" | "received" | "damaged";

type ReceiptLine = {
  id: string;
  sku: string;
  product: string;
  supplierId: string;
  ordered: number;
  received: number | null;
  unitPrice: number;
  currency: "USD" | "JPY";
  expected: string | null;
  status: LineStatus;
  note: string | null;
};

const SUPPLIERS = [
  { value: "hanover", label: "Hanover Apparel Co." },
  { value: "kanto", label: "Kanto Textile" },
  { value: "sagami", label: "Sagami Cap Works" },
  { value: "northfield", label: "Northfield Knitting" },
];

const RECEIPT_LINES: ReceiptLine[] = [
  {
    id: "GR-1",
    sku: "TS-NAVY-S",
    product: "Tee · Navy · S",
    supplierId: "hanover",
    ordered: 24,
    received: 24,
    unitPrice: 8.5,
    currency: "USD",
    expected: "2026-10-02",
    status: "received",
    note: null,
  },
  {
    id: "GR-2",
    sku: "TS-NAVY-M",
    product: "Tee · Navy · M",
    supplierId: "hanover",
    ordered: 36,
    received: null,
    unitPrice: 8.5,
    currency: "USD",
    expected: "2026-10-05",
    status: "pending",
    note: null,
  },
  {
    id: "GR-3",
    sku: "TS-NAVY-L",
    product: "Tee · Navy · L",
    supplierId: "hanover",
    ordered: 36,
    received: 30,
    unitPrice: 8.5,
    currency: "USD",
    expected: "2026-10-02",
    status: "partial",
    note: "6 short — backorder",
  },
  {
    id: "GR-4",
    sku: "HD-GREY-M",
    product: "Hoodie · Grey · M",
    supplierId: "kanto",
    ordered: 12,
    received: null,
    unitPrice: 4200,
    currency: "JPY",
    expected: "2026-10-09",
    status: "pending",
    note: null,
  },
  {
    id: "GR-5",
    sku: "HD-GREY-L",
    product: "Hoodie · Grey · L",
    supplierId: "kanto",
    ordered: 12,
    received: 12,
    unitPrice: 4200,
    currency: "JPY",
    expected: "2026-10-01",
    status: "damaged",
    note: "2 with torn seams",
  },
  {
    id: "GR-6",
    sku: "CP-BLK-OS",
    product: "Cap · Black · One size",
    supplierId: "sagami",
    ordered: 50,
    received: null,
    unitPrice: 5.25,
    currency: "USD",
    expected: null,
    status: "pending",
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
 * Goods receipt with every inline editor: a dropdown (Supplier), a badge
 * dropdown (Status), a date (Expected), numbers (Received, Unit price) and text
 * (Note).
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
      // A dropdown while the line is still pending; afterwards a read-only link.
      edit: {
        options: SUPPLIERS,
        required: true,
        canEdit: (row) => row.status === "pending",
        onCommit: (row, value) =>
          update(row.id, { supplierId: value ?? row.supplierId }, `Supplier → ${value}`),
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
      id: "total",
      label: "Total",
      type: "money",
      width: 120,
      accessor: (row) => (row.received ?? 0) * row.unitPrice,
      typeOptions: { currency: (row) => row.currency },
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
      // Choices come from `badgeLabelMap`, rendered as the same badges.
      edit: {
        required: true,
        onCommit: (row, value) =>
          update(row.id, { status: (value ?? row.status) as LineStatus }, `Status → ${value}`),
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
    tableId: "lab-inline-editing-v2",
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
