import { DataTable, createColumnHelper, useDataTable, useToast } from "@tailor-platform/app-shell";
import { useState } from "react";

// ─── Dummy data ──────────────────────────────────────────────────────────────
// 🧪 Dummy Data: Replace with a real goods-receipt query later.

type ReceiptLine = {
  id: string;
  sku: string;
  product: string;
  supplier: string;
  ordered: number;
  received: number | null;
  unitPrice: number;
  currency: "USD" | "JPY";
  note: string | null;
};

const RECEIPT_LINES: ReceiptLine[] = [
  {
    id: "GR-1",
    sku: "TS-NAVY-S",
    product: "Tee · Navy · S",
    supplier: "Globex Apparel",
    ordered: 24,
    received: 24,
    unitPrice: 8.5,
    currency: "USD",
    note: null,
  },
  {
    id: "GR-2",
    sku: "TS-NAVY-M",
    product: "Tee · Navy · M",
    supplier: "Globex Apparel",
    ordered: 36,
    received: null,
    unitPrice: 8.5,
    currency: "USD",
    note: null,
  },
  {
    id: "GR-3",
    sku: "TS-NAVY-L",
    product: "Tee · Navy · L",
    supplier: "Globex Apparel",
    ordered: 36,
    received: 30,
    unitPrice: 8.5,
    currency: "USD",
    note: "6 short — backorder",
  },
  {
    id: "GR-4",
    sku: "HD-GREY-M",
    product: "Hoodie · Grey · M",
    supplier: "Kanto Textile",
    ordered: 12,
    received: null,
    unitPrice: 4200,
    currency: "JPY",
    note: null,
  },
  {
    id: "GR-5",
    sku: "HD-GREY-L",
    product: "Hoodie · Grey · L",
    supplier: "Kanto Textile",
    ordered: 12,
    received: 12,
    unitPrice: 4200,
    currency: "JPY",
    note: null,
  },
  {
    id: "GR-6",
    sku: "CP-BLK-OS",
    product: "Cap · Black · One size",
    supplier: "Initech Goods",
    ordered: 50,
    received: null,
    unitPrice: 5.25,
    currency: "USD",
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
 * Goods receipt with inline editing: tick a row to enter its received
 * quantity; unit price autosaves to a (fake) server; notes save on leave.
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
    column({ id: "sku", label: "SKU", type: "text", width: 120 }),
    column({ id: "product", label: "Product", type: "text" }),
    column({
      id: "supplier",
      label: "Supplier",
      type: "link",
      typeOptions: { href: () => "/showcase/data-table-lab" },
      // Suppliers can only be corrected on lines nothing has been received for.
      edit: {
        canEdit: (row) => row.received === null,
        required: true,
        onCommit: (row, value) =>
          update(row.id, { supplier: value ?? row.supplier }, `Supplier → ${value}`),
      },
    }),
    column({ id: "ordered", label: "Ordered", type: "number", width: 96 }),
    column({
      id: "received",
      label: "Received",
      type: "number",
      width: 112,
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
      width: 128,
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
      width: 128,
      accessor: (row) => (row.received ?? 0) * row.unitPrice,
      typeOptions: { currency: (row) => row.currency },
    }),
    column({
      id: "note",
      label: "Note",
      type: "text",
      truncate: true,
      width: 200,
      edit: {
        onCommit: (row, value) => update(row.id, { note: value }, `Note → ${value ?? "empty"}`),
      },
    }),
  ];

  const table = useDataTable<ReceiptLine>({
    columns,
    data: { rows: lines, total: lines.length },
    tableId: "lab-inline-editing",
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
