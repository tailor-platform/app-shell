import { useRef, useState } from "react";
import {
  Button,
  DataTable,
  aggregations,
  createColumnHelper,
  useDataTable,
} from "@tailor-platform/app-shell";

export function ColumnFooters() {
  type Line = { id: string; item: string; quantity: number | null };
  const [rows, setRows] = useState<Line[]>([
    { id: "1", item: "Small carton", quantity: 2 },
    { id: "2", item: "Large carton", quantity: 3 },
  ]);
  const { column } = createColumnHelper<Line>();
  const table = useDataTable({
    data: { rows },
    columns: [
      column({
        id: "item",
        label: "Item",
        type: "text",
        footer: "Total",
      }),
      column({
        id: "quantity",
        label: "Quantity",
        type: "number",
        edit: {
          onValueCommitted: (row, quantity) =>
            setRows((current) =>
              current.map((line) => (line.id === row.id ? { ...line, quantity } : line)),
            ),
        },
        footer: aggregations.sum(),
      }),
    ],
  });

  return (
    <DataTable.Root value={table}>
      <DataTable.Table />
    </DataTable.Root>
  );
}

export function ColumnAggregations() {
  type Line = {
    id: string;
    item: string;
    quantity: number | null;
    weightKg: number | null;
    discount: number;
    unitPrice: number;
    note: string | null;
  };
  const rows: Line[] = [
    {
      id: "1",
      item: "Small carton",
      quantity: 2,
      weightKg: 1.25,
      discount: 0,
      unitPrice: 12,
      note: null,
    },
    {
      id: "2",
      item: "Large carton",
      quantity: 3,
      weightKg: 2.5,
      discount: 5,
      unitPrice: 10,
      note: "Ready",
    },
  ];
  const { column } = createColumnHelper<Line>();
  const table = useDataTable({
    data: { rows },
    columns: [
      column({ id: "item", label: "Item", type: "text", footer: "Aggregates" }),
      column({ id: "quantity", label: "Quantity", type: "number", footer: aggregations.sum() }),
      column({
        id: "weightKg",
        label: "Weight (kg)",
        type: "number",
        typeOptions: { maxDecimals: 3 },
        footer: aggregations.avg((average) => <strong>{average?.toFixed(3) ?? "–"}</strong>),
      }),
      column({ id: "discount", label: "Discount %", type: "number", footer: aggregations.max() }),
      column({ id: "unitPrice", label: "Unit price", type: "number", footer: aggregations.min() }),
      column({
        id: "note",
        label: "Note",
        type: "text",
        footer: aggregations.count((count) => `${count} with notes`),
      }),
    ],
  });

  return (
    <DataTable.Root value={table}>
      <DataTable.Table />
    </DataTable.Root>
  );
}

export function ImmediateSaving() {
  type Line = { id: string; item: string; ordered: number; received: number | null };
  const initialRows: Line[] = [
    { id: "1", item: "Small carton", ordered: 24, received: 12 },
    { id: "2", item: "Large carton", ordered: 36, received: null },
  ];
  const [rows, setRows] = useState(initialRows);
  const [error, setError] = useState<string | null>(null);
  const [savingCount, setSavingCount] = useState(0);
  const saves = useRef(
    new Map(
      initialRows.map((row) => [
        row.id,
        {
          revision: 0,
          savedRevision: 0,
          savedValue: row.received,
        },
      ]),
    ),
  );
  const { column } = createColumnHelper<Line>();
  const update = (id: string, received: number | null) =>
    setRows((current) => current.map((row) => (row.id === id ? { ...row, received } : row)));

  async function persistField(id: string, received: number | null) {
    // Demo API: replace with a request that patches only this row's received field.
    await new Promise((resolve) => setTimeout(resolve, 400));
    if (received === 13) throw new Error(`Could not save row ${id}; quantity 13 was rejected`);
  }

  const table = useDataTable({
    data: { rows },
    columns: [
      column({ id: "item", label: "Item", type: "text" }),
      column({ id: "ordered", label: "Ordered", type: "number" }),
      column({
        id: "received",
        label: "Received",
        type: "number",
        edit: {
          onValueCommitted: (row, value) => {
            if (value !== null && (!Number.isInteger(value) || value < 0 || value > row.ordered)) {
              setError(`Enter a whole number from 0 to ${row.ordered}, or clear the cell`);
              return;
            }
            const request = saves.current.get(row.id)!;
            const revision = ++request.revision;
            setError(null);
            update(row.id, value);
            setSavingCount((count) => count + 1);
            void persistField(row.id, value)
              .then(() => {
                if (revision > request.savedRevision) {
                  request.savedRevision = revision;
                  request.savedValue = value;
                }
              })
              .catch((cause: unknown) => {
                if (revision !== request.revision) return;
                update(row.id, request.savedValue);
                setError(cause instanceof Error ? cause.message : "Save failed");
              })
              .finally(() => setSavingCount((count) => count - 1));
          },
        },
      }),
    ],
  });

  return (
    <div className="space-y-3">
      <p role="status">
        {savingCount ? `${savingCount} field save(s) pending` : "No saves pending"}
      </p>
      {error && <p role="alert">{error}</p>}
      <DataTable.Root value={table}>
        <DataTable.Table />
      </DataTable.Root>
    </div>
  );
}

export function CollectThenSubmit() {
  type Line = { id: string; item: string; ordered: number; received: number | null };
  const initialRows: Line[] = [
    { id: "1", item: "Small carton", ordered: 24, received: 12 },
    { id: "2", item: "Large carton", ordered: 36, received: null },
  ];
  const [savedRows, setSavedRows] = useState(initialRows);
  const [rows, setRows] = useState(initialRows);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { column } = createColumnHelper<Line>();

  async function save() {
    const invalid = rows.find(
      (row) =>
        row.received !== null &&
        (!Number.isInteger(row.received) || row.received < 0 || row.received > row.ordered),
    );
    if (invalid) {
      setError(`${invalid.item}: enter a whole number from 0 to ${invalid.ordered}, or clear it`);
      return;
    }
    // This snapshot contains adopted confirmations, not unfinished editor input.
    const confirmedRows = rows;
    setSaving(true);
    setError(null);
    try {
      // Demo API: replace with a batch request for confirmedRows.
      await new Promise((resolve) => setTimeout(resolve, 400));
      if (confirmedRows.some((row) => row.received === 13)) {
        throw new Error("Batch rejected quantity 13; correct it and try again");
      }
      setSavedRows(confirmedRows);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  const table = useDataTable({
    data: { rows },
    columns: [
      column({ id: "item", label: "Item", type: "text" }),
      column({ id: "ordered", label: "Ordered", type: "number" }),
      column({
        id: "received",
        label: "Received",
        type: "number",
        edit: {
          canEdit: () => !saving,
          onValueCommitted: (row, value) =>
            setRows((current) =>
              current.map((line) => (line.id === row.id ? { ...line, received: value } : line)),
            ),
        },
      }),
    ],
  });

  return (
    <div className="space-y-3">
      <p role="status">{saving ? "Saving batch…" : "Confirm edits, then Save or Cancel"}</p>
      {error && <p role="alert">{error}</p>}
      <DataTable.Root value={table}>
        <DataTable.Table />
      </DataTable.Root>
      <div className="flex gap-2">
        <Button disabled={saving} onClick={() => void save()}>
          Save
        </Button>
        <Button
          disabled={saving}
          variant="outline"
          onClick={() => {
            setRows(savedRows);
            setError(null);
          }}
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}
