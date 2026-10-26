import { useRef, useState } from "react";
import { Button, DataTable, createColumnHelper, useDataTable } from "@tailor-platform/app-shell";

export function PerCellStyling() {
  type Overtime = { id: string; employee: string; january: number; february: number };
  const { column } = createColumnHelper<Overtime>();
  const overtimeStyle = (hours: number) => {
    const tone = hours >= 60 ? "danger" : hours >= 40 ? "warning" : "success";
    return {
      backgroundColor: `var(--${tone}-solid)`,
      color: `var(--${tone}-contrast)`,
    };
  };
  const table = useDataTable({
    data: {
      rows: [
        { id: "1", employee: "Alex", january: 24, february: 48 },
        { id: "2", employee: "Sam", january: 45, february: 64 },
        { id: "3", employee: "Robin", january: 62, february: 32 },
      ],
    },
    columns: [
      column({ id: "employee", label: "Employee", type: "text", width: 160 }),
      column({
        id: "january",
        label: "January (hours)",
        type: "number",
        width: 180,
        cellProps: (row) => ({
          style: overtimeStyle(row.january),
          title: `${row.january} hours of overtime`,
        }),
      }),
      column({
        id: "february",
        label: "February (hours)",
        type: "number",
        width: 180,
        pin: "right",
        headerProps: () => ({
          className: "astw:whitespace-nowrap",
          style: { backgroundColor: "var(--muted)" },
          title: "February overtime summary",
        }),
        cellProps: (row) => ({
          className: "astw:tabular-nums",
          style: overtimeStyle(row.february),
          title: `${row.february} hours of overtime`,
        }),
      }),
    ],
    rowSelection: {},
  });

  return (
    <div className="space-y-3">
      <p>Overtime: below 40 hours is safe, 40–59 is caution, 60 or more is danger.</p>
      <DataTable.Root value={table}>
        <DataTable.Table />
      </DataTable.Root>
    </div>
  );
}

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
        footer: ({ rows }) => rows.reduce((sum, row) => sum + (row.quantity ?? 0), 0),
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
