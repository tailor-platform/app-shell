import { useRef, useState } from "react";
import {
  Button,
  CellEditError,
  Checkbox,
  DataTable,
  Dialog,
  Select,
  Toolbar,
  aggregations,
  createColumnHelper,
  Text,
  useCollectionVariables,
  useDataTable,
  useDataTableContext,
  withURLCollectionState,
} from "@tailor-platform/app-shell";

export function BasicUsage() {
  const table = useDataTable<{ id: string; name: string; quantity: number }>({
    columns: [
      { id: "name", label: "Product", type: "text" },
      { id: "quantity", label: "Quantity", type: "number" },
    ],
    data: {
      rows: [
        { id: "1", name: "Small carton", quantity: 24 },
        { id: "2", name: "Large carton", quantity: 12 },
      ],
    },
  });

  return (
    <DataTable.Root value={table}>
      <DataTable.Table />
    </DataTable.Root>
  );
}

export function LoadingState() {
  const [state, setState] = useState("Loaded");
  const table = useDataTable<{ id: string; name: string }>({
    columns: [{ id: "name", label: "Product", type: "text" }],
    data: { rows: state === "Empty" ? [] : [{ id: "1", name: "Small carton" }] },
    loading: state === "Loading",
    error: state === "Error" ? new Error("Could not load products") : null,
  });

  return (
    <div className="space-y-3">
      <Select
        aria-label="Table state"
        items={["Loaded", "Loading", "Empty", "Error"]}
        value={state}
        onValueChange={(value) => {
          if (value) setState(value);
        }}
        className="max-w-xs"
      />
      <DataTable.Root value={table} className="h-60">
        <DataTable.Table />
      </DataTable.Root>
    </div>
  );
}

export function ColumnLayout() {
  type Product = { id: string; name: string; description: string; price: number; quantity: number };
  const { column } = createColumnHelper<Product>();
  const table = useDataTable({
    columns: [
      column({ id: "name", label: "Product", type: "text", width: 180, pin: "left" }),
      column({ id: "description", label: "Description", type: "text", width: 280, truncate: true }),
      column({
        id: "price",
        label: "Unit price",
        type: "money",
        width: 160,
        typeOptions: { currency: "USD" },
      }),
      column({ id: "quantity", label: "Quantity", type: "number", width: 120, pin: "right" }),
    ],
    data: {
      rows: [
        {
          id: "1",
          name: "Small carton",
          description: "Recycled cardboard packaging for small shipments",
          price: 2.5,
          quantity: 24,
        },
        {
          id: "2",
          name: "Large carton",
          description: "Double-wall cardboard packaging for large shipments",
          price: 5,
          quantity: 12,
        },
      ],
    },
  });

  return (
    <DataTable.Root value={table} className="max-w-xl">
      <Toolbar.Root>
        <Toolbar.Row aria-label="Column layout controls">
          <Toolbar.Group>
            <DataTable.ColumnSettings />
          </Toolbar.Group>
        </Toolbar.Row>
      </Toolbar.Root>
      <DataTable.Table />
    </DataTable.Root>
  );
}

export function Sorting() {
  type Product = { id: string; name: string; quantity: number };
  const [multiple, setMultiple] = useState(false);
  const { control } = useCollectionVariables({});
  const rows: Product[] = [
    { id: "1", name: "Carton", quantity: 24 },
    { id: "2", name: "Box", quantity: 12 },
    { id: "3", name: "Carton", quantity: 6 },
  ];
  const sortedRows = rows.toSorted((a, b) => {
    for (const { field, direction } of control.sortStates) {
      const difference = field === "name" ? a.name.localeCompare(b.name) : a.quantity - b.quantity;
      if (difference) return direction === "Desc" ? -difference : difference;
    }
    return 0;
  });
  const table = useDataTable<Product>({
    columns: [
      { id: "name", label: "Product", type: "text", sort: { field: "name", type: "string" } },
      {
        id: "quantity",
        label: "Quantity",
        type: "number",
        sort: { field: "quantity", type: "number" },
      },
    ],
    data: { rows: sortedRows },
    control,
    sort: { multiple },
  });

  return (
    <div className="space-y-3">
      <Checkbox
        label="Multi-column sorting"
        checked={multiple}
        onCheckedChange={(checked) => {
          setMultiple(checked);
          control.clearSort();
        }}
      />
      <DataTable.Root value={table}>
        <DataTable.Table />
      </DataTable.Root>
      <pre role="status" className="overflow-x-auto text-sm">
        {JSON.stringify(table.sortStates, null, 2)}
      </pre>
    </div>
  );
}

export function Filtering() {
  type Product = { id: string; name: string; quantity: number; status: string };
  const { variables, control } = useCollectionVariables({});
  const products: Product[] = [
    { id: "1", name: "Small carton", quantity: 24, status: "Available" },
    { id: "2", name: "Large CARTON", quantity: 12, status: "Available" },
    { id: "3", name: "Storage box", quantity: 0, status: "Sold out" },
  ];
  // shortcut: evaluates only the configured demo filters, use your API for other operators.
  const rows = products.filter((row) =>
    control.filters.every((filter) => {
      if (filter.field === "name") {
        const value = String(filter.value);
        return filter.caseSensitive
          ? row.name.includes(value)
          : row.name.toLowerCase().includes(value.toLowerCase());
      }
      if (filter.field === "quantity") return row.quantity >= Number(filter.value);
      if (filter.field === "status")
        return Array.isArray(filter.value) && filter.value.includes(row.status);
      return false;
    }),
  );
  const table = useDataTable<Product>({
    columns: [
      {
        id: "name",
        label: "Product",
        type: "text",
        filter: { field: "name", type: "string", operators: ["contains"] },
      },
      {
        id: "quantity",
        label: "Quantity",
        type: "number",
        filter: { field: "quantity", type: "number", operators: ["gte"] },
      },
      {
        id: "status",
        label: "Status",
        type: "badge",
        filter: {
          field: "status",
          type: "enum",
          operators: ["in"],
          options: [
            { value: "Available", label: "Available" },
            { value: "Sold out", label: "Sold out" },
          ],
        },
      },
    ],
    data: { rows },
    control,
  });

  return (
    <div className="space-y-3">
      <DataTable.Root value={table}>
        <Toolbar.Root>
          <Toolbar.Row justify="between" aria-label="Product filter controls">
            <Toolbar.Group>
              <DataTable.Filters slot="add" addIconOnly={false} />
            </Toolbar.Group>
            <Toolbar.Group>
              <Button
                variant="outline"
                disabled={!control.filters.length}
                onClick={control.clearFilters}
              >
                Clear filters
              </Button>
            </Toolbar.Group>
          </Toolbar.Row>
          <Toolbar.Row aria-label="Active product filters">
            <Toolbar.Group>
              <DataTable.Filters slot="chips" />
            </Toolbar.Group>
          </Toolbar.Row>
        </Toolbar.Root>
        <DataTable.Table />
      </DataTable.Root>
      <pre role="status" className="overflow-x-auto text-sm">
        {JSON.stringify(variables.query ?? {}, null, 2)}
      </pre>
    </div>
  );
}

export function Pagination() {
  const { variables, control } = useCollectionVariables({ params: { pageSize: 2 } });
  const allRows = Array.from({ length: 5 }, (_, index) => ({
    id: String(index + 1),
    name: `Product ${index + 1}`,
  }));
  const { first, after, last, before } = variables.pagination;
  let start: number;
  let end: number;
  if (last !== undefined) {
    end = before != null ? Number(before) : allRows.length;
    start = Math.max(0, end - last);
  } else {
    start = after != null ? Number(after) + 1 : 0;
    end = Math.min(allRows.length, start + (first ?? 2));
  }
  const rows = allRows.slice(start, end);
  const table = useDataTable({
    columns: [{ id: "name", label: "Product", type: "text" }],
    control,
    rowSelection: {},
    data: {
      rows,
      total: allRows.length,
      pageInfo: {
        startCursor: rows.length ? String(start) : null,
        endCursor: rows.length ? String(start + rows.length - 1) : null,
        hasPreviousPage: start > 0,
        hasNextPage: start + rows.length < allRows.length,
      },
    },
  });

  return (
    <div className="space-y-3">
      <DataTable.Root value={table}>
        <DataTable.Table />
        <DataTable.Footer>
          <DataTable.Pagination pageSizeOptions={[2, 5]} />
        </DataTable.Footer>
      </DataTable.Root>
      <pre role="status" className="overflow-x-auto text-sm">
        {JSON.stringify(variables.pagination, null, 2)}
      </pre>
    </div>
  );
}

export function MetadataFilters() {
  const metadata = {
    name: "request",
    pluralForm: "requests",
    fields: [
      { name: "amount", type: "decimal", required: false, description: "Exact amount" },
      { name: "dueDate", type: "date", required: false, description: "Due date" },
      { name: "createdAt", type: "datetime", required: false, description: "Created at" },
      { name: "reminder", type: "time", required: false, description: "Reminder" },
      { name: "active", type: "boolean", required: false, description: "Active" },
      { name: "reference", type: "uuid", required: false, description: "Reference ID" },
    ],
  } as const;
  const { variables, control } = useCollectionVariables({ tableMetadata: metadata });
  const { column, inferColumns } = createColumnHelper<Record<string, unknown>>();
  const infer = inferColumns(metadata);
  const table = useDataTable({
    columns: metadata.fields.map((field) => column({ ...infer(field.name), type: "text" })),
    data: undefined,
    control,
  });

  return (
    <div className="space-y-3">
      <Text.p>
        Try the metadata-generated filter editors. This playground shows query variables, not
        backend results.
      </Text.p>
      <DataTable.Root value={table}>
        <DataTable.Filters addIconOnly={false} />
      </DataTable.Root>
      <pre role="status" className="overflow-x-auto text-sm">
        {JSON.stringify(variables.query ?? {}, null, 2)}
      </pre>
    </div>
  );
}

export function CollectionUrlState() {
  const [searchParams, setSearchParams] = useState(() => new URLSearchParams("p=2&s=title:asc"));
  const { variables, control } = useCollectionVariables(
    withURLCollectionState({ params: { pageSize: 2 } }, [searchParams, setSearchParams]),
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={() => control.addFilter("status", "eq", "approved")}>
          Filter approved
        </Button>
        <Button variant="outline" onClick={control.clearFilters}>
          Clear URL filters
        </Button>
        <Button variant="outline" onClick={() => control.setSort("title", "Desc")}>
          Sort descending
        </Button>
      </div>
      <Select
        aria-label="URL page size"
        items={["2", "5", "10"]}
        value={String(control.pageSize)}
        onValueChange={(value) => {
          if (value) control.setPageSize(Number(value));
        }}
        className="max-w-xs"
      />
      <Text.p role="status">Local query string: ?{searchParams.toString()}</Text.p>
      <pre className="overflow-x-auto text-sm">{JSON.stringify(variables, null, 2)}</pre>
    </div>
  );
}

export function TableContext() {
  function SelectionSummary() {
    const { selectedIds, clearSelection } = useDataTableContext();
    return (
      <div className="flex items-center gap-3">
        <Text.p role="status">Selected count: {selectedIds.length}</Text.p>
        <Button variant="outline" disabled={!selectedIds.length} onClick={() => clearSelection?.()}>
          Clear from context
        </Button>
      </div>
    );
  }
  const table = useDataTable<{ id: string; name: string }>({
    columns: [{ id: "name", label: "Product", type: "text" }],
    data: {
      rows: [
        { id: "1", name: "Small carton" },
        { id: "2", name: "Large carton" },
      ],
    },
    rowSelection: {},
  });

  return (
    <DataTable.Root value={table}>
      <DataTable.Table />
      <DataTable.Footer>
        <SelectionSummary />
      </DataTable.Footer>
    </DataTable.Root>
  );
}

export function EmptyContent() {
  const table = useDataTable<{ id: string; title: string }>({
    columns: [{ id: "title", label: "Request", type: "text" }],
    data: { rows: [] },
  });

  return (
    <DataTable.Root value={table} className="h-80">
      <DataTable.Table
        emptyContent={
          <div className="space-y-2 whitespace-normal">
            <Text.p>No requests awaiting approval</Text.p>
            <Text.p variant="body-sm" className="text-muted-foreground">
              New requests will appear here when they are ready for review.
            </Text.p>
          </div>
        }
      />
    </DataTable.Root>
  );
}

export function ErrorContent() {
  const table = useDataTable<{ id: string; title: string }>({
    columns: [{ id: "title", label: "Request", type: "text" }],
    data: { rows: [] },
    error: new Error("Request timed out"),
  });

  return (
    <DataTable.Root value={table} className="h-80">
      <DataTable.Table
        errorContent={
          <div className="space-y-2 whitespace-normal">
            <Text.p className="text-danger-text">Unable to load requests</Text.p>
            <Text.p variant="body-sm" className="text-muted-foreground">
              Please try again later. Contact support if the problem persists.
            </Text.p>
          </div>
        }
      />
    </DataTable.Root>
  );
}

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
      <Text.p>Overtime: below 40 hours is safe, 40–59 is caution, 60 or more is danger.</Text.p>
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
        footer: aggregations.sum((row) => row.quantity),
        footerProps: ({ rows }) =>
          rows.length > 0
            ? {
                className: "tabular-nums",
                style: {
                  backgroundColor: "var(--success-solid)",
                  color: "var(--success-contrast)",
                },
                title: `Quantity total for ${rows.length} items on this page`,
              }
            : undefined,
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
      column({
        id: "quantity",
        label: "Quantity",
        type: "number",
        footer: aggregations.sum((row) => row.quantity),
      }),
      column({
        id: "weightKg",
        label: "Weight (kg)",
        type: "number",
        typeOptions: { maxDecimals: 3 },
        footer: aggregations.avg(
          (row) => row.weightKg,
          (average) => <strong>{average?.toFixed(3) ?? "–"}</strong>,
        ),
      }),
      column({
        id: "discount",
        label: "Discount %",
        type: "number",
        footer: aggregations.max((row) => row.discount),
      }),
      column({
        id: "unitPrice",
        label: "Unit price",
        type: "number",
        footer: aggregations.min((row) => row.unitPrice),
      }),
      column({
        id: "note",
        label: "Note",
        type: "text",
        footer: aggregations.count(
          (row) => row.note,
          (count) => `${count} with notes`,
        ),
      }),
    ],
  });

  return (
    <DataTable.Root value={table}>
      <DataTable.Table />
    </DataTable.Root>
  );
}

export function ComposedAggregations() {
  type Line = { id: string; amount: number | null; currency: "JPY" | "USD" };
  const [mixed, setMixed] = useState(false);
  const rows: Line[] = [
    { id: "1", amount: 1000, currency: "JPY" },
    { id: "2", amount: 500, currency: mixed ? "USD" : "JPY" },
    { id: "3", amount: null, currency: "USD" },
  ];
  const sumAmount = aggregations.sum(
    (row: Line) => row.amount,
    (total) => (total === null ? "Invalid amount" : total.toLocaleString("en-US")),
  );
  const { column } = createColumnHelper<Line>();
  const table = useDataTable({
    data: { rows },
    columns: [
      column({ id: "id", label: "Line", type: "text" }),
      column({
        id: "amount",
        label: "Amount",
        type: "money",
        typeOptions: { currency: (row) => row.currency },
        footer: (ctx) => {
          const currencies = new Set(
            ctx.rows.filter((row) => row.amount != null).map((row) => row.currency),
          );
          if (currencies.size > 1) {
            return `Mixed currencies: ${[...currencies].join(", ")}`;
          }
          return sumAmount(ctx);
        },
      }),
    ],
  });

  return (
    <div className="space-y-3">
      <Button variant="outline" aria-pressed={mixed} onClick={() => setMixed((value) => !value)}>
        Mix currencies
      </Button>
      <DataTable.Root value={table}>
        <DataTable.Table />
      </DataTable.Root>
    </div>
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
      <Text.p role="status">
        {savingCount ? `${savingCount} field save(s) pending` : "No saves pending"}
      </Text.p>
      {error && <Text.p role="alert">{error}</Text.p>}
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
      <Text.p role="status">
        {saving ? "Saving batch…" : "Confirm edits, then Save or Cancel"}
      </Text.p>
      {error && <Text.p role="alert">{error}</Text.p>}
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

export function TextCells() {
  type Row = { id: string; name: string | null };
  const { column } = createColumnHelper<Row>();
  const table = useDataTable({
    columns: [column({ id: "name", label: "Name", type: "text" })],
    data: {
      rows: [
        { id: "1", name: "Small carton" },
        { id: "2", name: "" },
        { id: "3", name: null },
      ],
    },
  });

  return (
    <DataTable.Root value={table}>
      <DataTable.Table />
    </DataTable.Root>
  );
}

export function NumberCells() {
  type Row = { id: string; quantity: number | null };
  const { column } = createColumnHelper<Row>();
  const table = useDataTable({
    columns: [
      column({
        id: "rounded",
        label: "Whole units",
        accessor: (row) => row.quantity,
        type: "number",
        typeOptions: { maxDecimals: 0, locale: "en-US" },
      }),
      column({
        id: "precise",
        label: "With decimals",
        accessor: (row) => row.quantity,
        type: "number",
        typeOptions: { minDecimals: 2, maxDecimals: 4, locale: "en-US" },
      }),
    ],
    data: {
      rows: [
        { id: "1", quantity: 1234.56789 },
        { id: "2", quantity: 0 },
        { id: "3", quantity: null },
      ],
    },
  });

  return (
    <DataTable.Root value={table}>
      <DataTable.Table />
    </DataTable.Root>
  );
}

export function MoneyCells() {
  type Row = { id: string; amount: number; currency: string };
  const { column } = createColumnHelper<Row>();
  const table = useDataTable({
    columns: [
      column({ id: "currency", label: "Currency", type: "text" }),
      column({
        id: "usd",
        label: "USD formatting",
        accessor: (row) => row.amount,
        type: "money",
        typeOptions: { currency: "USD", currencySign: "accounting", locale: "en-US" },
      }),
      column({
        id: "amount",
        label: "Row currency",
        type: "money",
        typeOptions: { currency: (row) => row.currency, maxDecimals: 4, locale: "en-US" },
      }),
    ],
    data: {
      rows: [
        { id: "1", amount: 12.3456, currency: "USD" },
        { id: "2", amount: 1500, currency: "JPY" },
        { id: "3", amount: 19.9, currency: "EUR" },
        { id: "4", amount: -12.35, currency: "USD" },
      ],
    },
  });

  return (
    <div className="space-y-3">
      <Text.p>The same amount is formatted two ways; no currency conversion is performed.</Text.p>
      <DataTable.Root value={table}>
        <DataTable.Table />
      </DataTable.Root>
    </div>
  );
}

export function DateCells() {
  type Row = { id: string; placedAt: string | null };
  const { column } = createColumnHelper<Row>();
  const table = useDataTable({
    columns: [
      column({
        id: "short",
        label: "Short date",
        accessor: (row) => row.placedAt,
        type: "date",
        typeOptions: { dateFormat: "short", locale: "en-US" },
      }),
      column({
        id: "long",
        label: "Long date",
        accessor: (row) => row.placedAt,
        type: "date",
        typeOptions: { dateFormat: "long", locale: "en-US" },
      }),
      column({
        id: "datetime",
        label: "Date and time",
        accessor: (row) => row.placedAt,
        type: "date",
        typeOptions: { dateFormat: "datetime", locale: "en-US" },
      }),
    ],
    data: {
      rows: [
        { id: "1", placedAt: "2026-04-09T15:45:00Z" },
        { id: "2", placedAt: null },
      ],
    },
  });

  return (
    <div className="space-y-3">
      <Text.p>All three columns format the same instant in the AppShell timezone.</Text.p>
      <DataTable.Root value={table}>
        <DataTable.Table />
      </DataTable.Root>
    </div>
  );
}

export function BadgeCells() {
  type Row = { id: string; status: string };
  const { column } = createColumnHelper<Row>();
  const table = useDataTable({
    columns: [
      column({
        id: "status",
        label: "Status",
        type: "badge",
        typeOptions: {
          badgeVariantMap: {
            shipped: "success",
            processing: "outline-warning",
            cancelled: "subtle-error",
          },
          badgeLabelMap: { shipped: "Shipped", processing: "Processing", cancelled: "Cancelled" },
          defaultBadgeVariant: "outline-neutral",
        },
      }),
    ],
    data: {
      rows: [
        { id: "1", status: "shipped" },
        { id: "2", status: "processing" },
        { id: "3", status: "cancelled" },
        { id: "4", status: "unknown" },
      ],
    },
  });

  return (
    <DataTable.Root value={table}>
      <DataTable.Table />
    </DataTable.Root>
  );
}

export function ArrayBadges() {
  type Row = { id: string; name: string; tags: string[] };
  const { column } = createColumnHelper<Row>();
  const table = useDataTable({
    columns: [
      column({ id: "name", label: "Product", type: "text" }),
      column({
        id: "tags",
        label: "Tags",
        type: "badge",
        typeOptions: {
          badgeVariantMap: { Premium: "warning", Office: "outline-info" },
          maxVisible: 2,
        },
      }),
    ],
    data: {
      rows: [
        { id: "1", name: "Desk organizer", tags: ["Premium", "Office", "Bulk", "Seasonal"] },
        { id: "2", name: "Storage box", tags: ["Office"] },
      ],
    },
  });

  return (
    <DataTable.Root value={table}>
      <DataTable.Table />
    </DataTable.Root>
  );
}

export function LinkCells() {
  type Row = { id: string; title: string; path: string | null };
  const { column } = createColumnHelper<Row>();
  const table = useDataTable({
    columns: [
      column({
        id: "title",
        label: "Documentation",
        type: "link",
        typeOptions: { href: (row) => row.path },
      }),
    ],
    data: {
      rows: [
        { id: "1", title: "Form", path: "/components/form" },
        { id: "2", title: "Button", path: "/components/button" },
        { id: "3", title: "No detail page yet", path: null },
      ],
    },
  });

  return (
    <DataTable.Root value={table}>
      <DataTable.Table />
    </DataTable.Root>
  );
}

export function CustomRenderer() {
  type Row = { id: string; name: string; stock: number };
  const { column } = createColumnHelper<Row>();
  const table = useDataTable({
    columns: [
      column({ id: "name", label: "Product", type: "text" }),
      column({
        id: "stock",
        label: "Stock",
        accessor: (row) => row.stock,
        type: "number",
        render: (row) => <strong>{row.stock} units</strong>,
      }),
    ],
    data: {
      rows: [
        { id: "1", name: "Small carton", stock: 24 },
        { id: "2", name: "Large carton", stock: 0 },
      ],
    },
  });

  return (
    <DataTable.Root value={table}>
      <DataTable.Table />
    </DataTable.Root>
  );
}

export function ExpandableRows() {
  type Order = { id: string; reference: string; note: string | null };
  const table = useDataTable<Order>({
    columns: [{ id: "reference", label: "Order", type: "text" }],
    data: {
      rows: [
        { id: "1", reference: "ORD-1001", note: "Deliver to the loading dock." },
        { id: "2", reference: "ORD-1002", note: null },
      ],
    },
    rowExpansion: {
      render: (row) => <Text.p>{row.note}</Text.p>,
      canExpand: (row) => row.note !== null,
      getLabel: (row) => row.reference,
    },
  });

  return (
    <DataTable.Root value={table}>
      <DataTable.Table />
    </DataTable.Root>
  );
}

export function ControlledExpansion() {
  type Order = { id: string; reference: string; note: string };
  const [expandedIds, setExpandedIds] = useState<string[]>([]);
  const table = useDataTable<Order>({
    columns: [{ id: "reference", label: "Order", type: "text" }],
    data: {
      rows: [
        { id: "1", reference: "ORD-1001", note: "Deliver to the loading dock." },
        { id: "2", reference: "ORD-1002", note: "Call before delivery." },
      ],
    },
    rowExpansion: {
      render: (row) => <Text.p>{row.note}</Text.p>,
      getLabel: (row) => row.reference,
      expandedIds,
      onChange: setExpandedIds,
    },
  });

  return (
    <div className="space-y-3">
      <Button
        variant="outline"
        disabled={expandedIds.length === 0}
        onClick={() => table.collapseAllRows?.()}
      >
        Collapse all
      </Button>
      <DataTable.Root value={table}>
        <DataTable.Table />
      </DataTable.Root>
      <Text.p role="status">Expanded IDs: {expandedIds.join(", ") || "None"}</Text.p>
    </div>
  );
}

export function SubRows() {
  type Account = { id: string; name: string; code: string; children?: Account[] };
  const table = useDataTable<Account>({
    columns: [{ id: "code", label: "Code", type: "text" }],
    data: {
      rows: [
        {
          id: "assets",
          name: "Assets",
          code: "1000",
          children: [
            { id: "cash", name: "Cash", code: "1110" },
            { id: "receivables", name: "Receivables", code: "1120" },
          ],
        },
        { id: "equity", name: "Equity", code: "3000" },
      ],
    },
    subRows: {
      getSubRows: (row) => row.children,
      hierarchyColumn: { label: "Account", accessor: (row) => row.name, width: 240 },
      defaultExpandedIds: ["assets"],
    },
    rowSelection: {},
  });

  return (
    <div className="space-y-3">
      <Text.p>Select Assets to select its leaf accounts, not the parent ID.</Text.p>
      <DataTable.Root value={table}>
        <DataTable.Table />
      </DataTable.Root>
      <Text.p role="status">Selected IDs: {table.selectedIds.join(", ") || "None"}</Text.p>
    </div>
  );
}

export function InlineEditing() {
  type Line = { id: string; item: string | null; quantity: number | null };
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
        edit: {
          onValueCommitted: (row, item) =>
            setRows((current) =>
              current.map((line) => (line.id === row.id ? { ...line, item } : line)),
            ),
        },
      }),
      column({
        id: "quantity",
        label: "Quantity",
        type: "number",
        edit: {
          onValueCommitted: (row, quantity) => {
            if (quantity !== null && (!Number.isInteger(quantity) || quantity < 0)) {
              throw new CellEditError("Enter a non-negative whole number.");
            }
            setRows((current) =>
              current.map((line) => (line.id === row.id ? { ...line, quantity } : line)),
            );
          },
        },
      }),
    ],
  });

  return (
    <div className="space-y-3">
      <Text.p>
        Click an item or quantity to edit. Enter confirms; Escape cancels. Quantities must be
        non-negative whole numbers, or empty.
      </Text.p>
      <DataTable.Root value={table}>
        <DataTable.Table />
      </DataTable.Root>
      <pre role="status" className="overflow-x-auto text-sm">
        {JSON.stringify(rows, null, 2)}
      </pre>
    </div>
  );
}

export function ControlledSelection() {
  type Invoice = { id: string; customer: string };
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const table = useDataTable<Invoice>({
    columns: [{ id: "customer", label: "Customer", type: "text" }],
    data: {
      rows: [
        { id: "INV-1001", customer: "Alex" },
        { id: "INV-1002", customer: "Sam" },
      ],
    },
    rowSelection: { selectedIds, onChange: setSelectedIds },
  });

  return (
    <div className="space-y-3">
      <Button
        variant="outline"
        disabled={selectedIds.length === 0}
        onClick={() => setSelectedIds([])}
      >
        Clear selection
      </Button>
      <DataTable.Root value={table}>
        <DataTable.Table />
      </DataTable.Root>
      <Text.p role="status">Selected IDs: {selectedIds.join(", ") || "None"}</Text.p>
    </div>
  );
}

export function UncontrolledSelection() {
  type Invoice = { id: string; customer: string };
  const table = useDataTable<Invoice>({
    columns: [{ id: "customer", label: "Customer", type: "text" }],
    data: {
      rows: [
        { id: "INV-1001", customer: "Alex" },
        { id: "INV-1002", customer: "Sam" },
      ],
    },
    rowSelection: { defaultSelectedIds: ["INV-1001"] },
  });

  return (
    <div className="space-y-3">
      <DataTable.Root value={table}>
        <DataTable.Table />
      </DataTable.Root>
      <Text.p role="status">Selected IDs: {table.selectedIds.join(", ") || "None"}</Text.p>
    </div>
  );
}

export function SelectionActions() {
  type Invoice = { id: string; customer: string };
  const [recordedIds, setRecordedIds] = useState<string[]>([]);
  const table = useDataTable<Invoice>({
    columns: [{ id: "customer", label: "Customer", type: "text" }],
    data: {
      rows: [
        { id: "INV-1001", customer: "Alex" },
        { id: "INV-1002", customer: "Sam" },
        { id: "INV-1003", customer: "Robin" },
      ],
    },
    rowSelection: {
      actions: [
        { id: "record", label: "Record selected IDs", onClick: (ids) => setRecordedIds(ids) },
      ],
    },
  });

  return (
    <div className="space-y-3">
      <Text.p>
        Select rows to reveal the bulk-action bar. Recording does not clear selection.
      </Text.p>
      <DataTable.Root value={table}>
        <DataTable.Table />
        <DataTable.Footer />
      </DataTable.Root>
      <Text.p role="status">Recorded IDs: {recordedIds.join(", ") || "None"}</Text.p>
    </div>
  );
}

export function RowActions() {
  type Order = { id: string; reference: string; status: "Draft" | "Approved" };
  const [rows, setRows] = useState<Order[]>([
    { id: "1", reference: "ORD-1001", status: "Draft" },
    { id: "2", reference: "ORD-1002", status: "Approved" },
  ]);
  const [clickedReference, setClickedReference] = useState<string | null>(null);
  const table = useDataTable<Order>({
    data: { rows },
    columns: [
      { id: "reference", label: "Order", type: "text" },
      {
        id: "status",
        label: "Status",
        type: "badge",
        typeOptions: { badgeVariantMap: { Draft: "neutral", Approved: "success" } },
      },
    ],
    onClickRow: (row) => setClickedReference(row.reference),
    rowActions: [
      {
        id: "approve",
        label: "Approve",
        canApply: (row) => row.status === "Draft",
        onClick: (row) =>
          setRows((current) =>
            current.map((order) =>
              order.id === row.id ? { ...order, status: "Approved" } : order,
            ),
          ),
      },
    ],
  });

  return (
    <div className="space-y-3">
      <Text.p>Click a row to inspect its reference, or use its menu to approve a draft.</Text.p>
      <DataTable.Root value={table}>
        <DataTable.Table />
      </DataTable.Root>
      <Text.p role="status">Last row clicked: {clickedReference ?? "None"}</Text.p>
    </div>
  );
}

export function ChoiceAndDateEditing() {
  type Order = {
    id: string;
    status: string | null;
    dueDate: string | null;
    appointment: string | null;
  };
  const [rows, setRows] = useState<Order[]>([
    { id: "ORD-1001", status: "draft", dueDate: "2026-04-09", appointment: "2026-04-09T01:00:00Z" },
    { id: "ORD-1002", status: "approved", dueDate: "2026-04-10", appointment: null },
  ]);
  const { column } = createColumnHelper<Order>();
  const table = useDataTable({
    data: { rows },
    columns: [
      column({ id: "id", label: "Order", type: "text" }),
      column({
        id: "status",
        label: "Status",
        type: "badge",
        typeOptions: {
          badgeLabelMap: { draft: "Draft", approved: "Approved" },
          badgeVariantMap: { draft: "neutral", approved: "success" },
        },
        edit: {
          onValueCommitted: (row, status) =>
            setRows((current) =>
              current.map((order) => (order.id === row.id ? { ...order, status } : order)),
            ),
        },
      }),
      column({
        id: "dueDate",
        label: "Due date",
        type: "date",
        edit: {
          onValueCommitted: (row, dueDate) =>
            setRows((current) =>
              current.map((order) => (order.id === row.id ? { ...order, dueDate } : order)),
            ),
        },
      }),
      column({
        id: "appointment",
        label: "Appointment",
        type: "date",
        typeOptions: { dateFormat: "datetime" },
        edit: {
          onValueCommitted: (row, appointment) =>
            setRows((current) =>
              current.map((order) => (order.id === row.id ? { ...order, appointment } : order)),
            ),
        },
      }),
    ],
  });

  return (
    <div className="space-y-3">
      <Text.p>
        Click a status, date, or appointment to edit it. Status choices come from badgeLabelMap.
        Appointments use the AppShell timezone; choose both a day and time, then Done.
      </Text.p>
      <DataTable.Root value={table}>
        <DataTable.Table />
      </DataTable.Root>
      <pre role="status" className="overflow-x-auto text-sm">
        {JSON.stringify(rows, null, 2)}
      </pre>
    </div>
  );
}

export function BulkDeleteConfirmation() {
  type Order = { id: string; customer: string };
  const [rows, setRows] = useState<Order[]>([
    { id: "ORD-1001", customer: "Alex" },
    { id: "ORD-1002", customer: "Sam" },
    { id: "ORD-1003", customer: "Robin" },
  ]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [deleteTargetIds, setDeleteTargetIds] = useState<string[] | null>(null);
  const table = useDataTable<Order>({
    data: { rows },
    columns: [
      { id: "id", label: "Order", type: "text" },
      { id: "customer", label: "Customer", type: "text" },
    ],
    rowSelection: {
      selectedIds,
      onChange: setSelectedIds,
      actions: [
        {
          id: "delete",
          label: "Delete selected",
          variant: "destructive",
          onClick: (ids) => setDeleteTargetIds(ids),
        },
      ],
    },
  });

  function confirmDelete() {
    if (deleteTargetIds === null) return;
    const deleted = new Set(deleteTargetIds);
    setRows((current) => current.filter((row) => !deleted.has(row.id)));
    setSelectedIds((current) => current.filter((id) => !deleted.has(id)));
    setDeleteTargetIds(null);
  }

  return (
    <div className="space-y-3">
      <Text.p>Only local demo rows are deleted. Cancel preserves rows and selection.</Text.p>
      <DataTable.Root value={table}>
        <DataTable.Table />
        <DataTable.Footer />
      </DataTable.Root>
      <Text.p role="status">Selected IDs: {selectedIds.join(", ") || "None"}</Text.p>
      <Dialog.Root
        open={deleteTargetIds !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTargetIds(null);
        }}
      >
        <Dialog.Content>
          <Dialog.Header>
            <Dialog.Title>Delete selected orders?</Dialog.Title>
            <Dialog.Description>
              Delete these local demo orders: {deleteTargetIds?.join(", ")}. No server data is
              changed.
            </Dialog.Description>
          </Dialog.Header>
          <Dialog.Footer>
            <Dialog.Close render={<Button type="button" variant="outline" />}>Cancel</Dialog.Close>
            <Button type="button" variant="destructive" onClick={confirmDelete}>
              Delete orders
            </Button>
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog.Root>
    </div>
  );
}
