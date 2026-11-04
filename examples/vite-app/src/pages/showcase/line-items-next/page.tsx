import { useRef, useState, type ReactNode } from "react";
import {
  Badge,
  Button,
  Card,
  Layout,
  LineItems,
  Text,
  Toolbar,
  createLineItemHelper,
  useLineItems,
  type AppShellPageProps,
  type LineItemsChangeSet,
} from "@tailor-platform/app-shell";
import { Minus, Plus, RotateCcw, Rows3, Save, Trash2 } from "lucide-react";

type Line = {
  id?: string;
  sku: string;
  description: string | null;
  quantity: number | null;
  unitPrice: number | null;
  supplier: string | null;
  warehouse: string | null;
  location: string | null;
  unitOfMeasure: string | null;
  expedite: boolean;
  priority: 1 | 2 | 3 | null;
  packSize: { units: number } | null;
  requestedDate: string | null;
  promisedDate: string | null;
  receivedQuantity: number | null;
  projectCode: string | null;
  costCenter: string | null;
  notes: string | null;
};

const supplierOptions = [
  { value: "SUP-001", label: "Supplier 001" },
  { value: "SUP-002", label: "Supplier 002" },
  { value: "SUP-003", label: "Supplier 003" },
];
const unitOptions = [
  { value: "pcs", label: "Pieces" },
  { value: "box", label: "Box" },
  { value: "pallet", label: "Pallet" },
];
const priorityOptions = [
  { value: 1, label: "High (1)" },
  { value: 2, label: "Normal (2)" },
  { value: 3, label: "Low (3)" },
] as const;
const supplierLabel = (value: string | null) =>
  supplierOptions.find((option) => option.value === value)?.label ?? value ?? "—";
const searchSuppliers = async (query: string | null, { signal }: { signal: AbortSignal }) => {
  signal.throwIfAborted();
  const search = (query ?? "").trim().toLowerCase();
  return supplierOptions.filter((option) =>
    `${option.value} ${option.label}`.toLowerCase().includes(search),
  );
};

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const amount = (line: Line) => (line.quantity ?? 0) * (line.unitPrice ?? 0);
const { column } = createLineItemHelper<Line>();
const columns = [
  column({
    accessorKey: "sku",
    label: "SKU",
    type: "text",
    pin: "left",
    footer: "Total",
    render: (line) => (
      <div className="flex items-center gap-2">
        <span className="font-mono text-body-sm">{line.sku}</span>
        {!line.id && <Badge variant="outline-info">New</Badge>}
      </div>
    ),
  }),
  column({
    accessorKey: "description",
    label: "Product name",
    type: "text",
    edit: { editorType: "text" },
    width: "flex",
    truncate: true,
    validate: (value) => (value?.trim() ? null : "Enter a product name."),
    footer: ({ rows }) => `${rows.length} items`,
  }),
  column({
    accessorKey: "quantity",
    label: "Qty",
    type: "number",
    edit: { editorType: "number" },
    width: 112,
    validate: (value) =>
      value !== null && value > 0 ? null : "Quantity must be greater than zero.",
  }),
  column({
    accessorKey: "unitPrice",
    label: "Unit price",
    type: "money",
    typeOptions: { currency: "USD", locale: "en-US" },
    edit: { editorType: "number" },
    width: 144,
    validate: (value) =>
      value !== null && value >= 0 ? null : "Unit price must be zero or greater.",
  }),
  column({
    accessorKey: "supplier",
    label: "Supplier (async)",
    type: "text",
    render: (line) => supplierLabel(line.supplier),
    search: (line, query) =>
      `${line.supplier ?? ""} ${supplierLabel(line.supplier)}`.toLowerCase().includes(query),
    edit: {
      editorType: "combobox",
      fetcher: searchSuppliers,
      getOptionLabel: supplierLabel,
      placeholder: "Search suppliers",
    },
    width: 184,
  }),
  column({
    accessorKey: "warehouse",
    label: "Warehouse",
    type: "text",
    edit: { editorType: "text" },
    width: 160,
  }),
  column({
    accessorKey: "location",
    label: "Bin / location",
    type: "text",
    edit: { editorType: "text" },
    width: 136,
  }),
  column({
    accessorKey: "unitOfMeasure",
    label: "Unit (choices)",
    search: (line, query) =>
      `${line.unitOfMeasure ?? ""} ${unitOptions.find((option) => option.value === line.unitOfMeasure)?.label ?? ""}`
        .toLowerCase()
        .includes(query),
    type: "text",
    render: (line) =>
      unitOptions.find((option) => option.value === line.unitOfMeasure)?.label ??
      line.unitOfMeasure ??
      "—",
    edit: { editorType: "combobox", options: unitOptions },
    width: 144,
  }),
  column({
    accessorKey: "requestedDate",
    label: "Requested date",
    type: "date",
    typeOptions: { locale: "en-US" },
    edit: { editorType: "date", min: "2026-12-01", max: "2027-12-31" },
    width: 160,
  }),
  column({
    accessorKey: "promisedDate",
    label: "Promised date",
    type: "date",
    typeOptions: { locale: "en-US" },
    edit: { editorType: "date", min: "2026-12-01", max: "2027-12-31" },
    width: 160,
  }),
  column({
    accessorKey: "expedite",
    label: "Expedite",
    type: "text",
    edit: { editorType: "boolean" },
    align: "center",
    width: 112,
  }),
  column({
    accessorKey: "priority",
    label: "Priority (numeric)",
    search: (line, query) =>
      `${line.priority ?? ""} ${priorityOptions.find((option) => option.value === line.priority)?.label ?? ""}`
        .toLowerCase()
        .includes(query),
    type: "number",
    render: (line) =>
      priorityOptions.find((option) => option.value === line.priority)?.label ?? "—",
    edit: { editorType: "combobox", options: priorityOptions },
    width: 168,
  }),
  column({
    accessorKey: "packSize",
    label: "Pack size (custom)",
    render: (line) => (line.packSize ? `${line.packSize.units} units / pack` : "—"),
    search: (line, query) =>
      !!line.packSize && `${line.packSize.units} units / pack`.includes(query),
    edit: {
      editorType: "custom",
      renderEditor: ({ value, onCommit, onCancel, ariaLabel }) => (
        <fieldset
          aria-label={ariaLabel}
          className="m-0 flex h-full min-w-0 items-center justify-center gap-1 border-0 p-0"
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.preventDefault();
              event.stopPropagation();
              onCancel();
            }
          }}
        >
          <Button
            size="xs"
            variant="ghost"
            aria-label={`Decrease ${ariaLabel}`}
            disabled={value === null || value.units <= 1}
            onClick={() => onCommit({ units: (value?.units ?? 1) - 1 })}
          >
            <Minus />
          </Button>
          <span className="min-w-6 text-center tabular-nums">{value?.units ?? "—"}</span>
          <Button
            size="xs"
            variant="ghost"
            aria-label={`Increase ${ariaLabel}`}
            onClick={() => onCommit({ units: (value?.units ?? 0) + 1 })}
          >
            <Plus />
          </Button>
          <Button
            size="xs"
            variant="ghost"
            aria-label={`Clear ${ariaLabel}`}
            disabled={value === null}
            onClick={() => onCommit(null)}
          >
            Clear
          </Button>
        </fieldset>
      ),
    },
    validate: (value) =>
      value === null || (Number.isInteger(value.units) && value.units > 0)
        ? null
        : "Pack size must be a positive whole number.",
    width: 208,
  }),
  column({
    accessorKey: "receivedQuantity",
    label: "Received qty",
    type: "number",
    edit: { editorType: "number" },
    width: 144,
    validate: (value) =>
      value !== null && value >= 0 ? null : "Received quantity must be zero or greater.",
  }),
  column({
    accessorKey: "projectCode",
    label: "Project",
    type: "text",
    edit: { editorType: "text" },
    width: 160,
  }),
  column({
    accessorKey: "costCenter",
    label: "Cost center",
    type: "text",
    edit: { editorType: "text" },
    width: 160,
  }),
  column({
    accessorKey: "notes",
    label: "Notes",
    type: "text",
    edit: { editorType: "text" },
    width: 320,
    truncate: true,
  }),
  column({
    id: "amount",
    label: "Amount",
    accessor: amount,
    pin: "right",
    type: "money",
    typeOptions: { currency: "USD", locale: "en-US" },
    width: 144,
    footer: ({ rows }) => money.format(rows.reduce((sum, line) => sum + amount(line), 0)),
  }),
];
const lineDefaults = {
  supplier: "SUP-001",
  warehouse: "North warehouse",
  location: "A-01-03",
  unitOfMeasure: "pcs",
  expedite: false,
  priority: 2 as const,
  packSize: { units: 5 },
  requestedDate: "2026-12-10",
  promisedDate: "2026-12-12",
  receivedQuantity: 0,
  projectCode: "PRJ-2026-042",
  costCenter: "OPS-100",
  notes:
    "Deliver to the receiving dock during business hours; keep the purchase order reference on every carton.",
};
const initialLines: Line[] = [
  {
    ...lineDefaults,
    id: "line-1",
    sku: "SKU-4100",
    description: "Steel bracket, 40 mm",
    quantity: 12,
    unitPrice: 4.8,
  },
  {
    ...lineDefaults,
    id: "line-2",
    sku: "SKU-4107",
    description: "Hex bolt M8 × 30",
    quantity: 40,
    unitPrice: 0.85,
    supplier: "SUP-002",
    expedite: true,
    priority: 1,
    packSize: { units: 20 },
    warehouse: "Central warehouse",
    location: "B-04-02",
    receivedQuantity: 10,
    notes: "Partial delivery received. Include the remaining quantity in the next shipment.",
  },
  {
    ...lineDefaults,
    id: "line-3",
    sku: "SKU-4114",
    description: "Nylon washer, 8 mm",
    quantity: 80,
    unitPrice: 0.24,
    location: "A-02-06",
    supplier: "SUP-003",
    priority: 3,
    packSize: null,
    promisedDate: "2026-12-15",
    projectCode: "PRJ-2026-051",
    notes: "Pack separately from metal parts and label the storage location clearly.",
  },
  {
    ...lineDefaults,
    id: "line-4",
    sku: "SKU-4121",
    description: "Rubber gasket, 25 mm",
    quantity: 24,
    unitPrice: 1.6,
    supplier: "SUP-002",
    unitOfMeasure: "box",
    packSize: { units: 12 },
    warehouse: "Central warehouse",
    location: "B-03-05",
    notes: "Keep sealed until installation and store away from direct sunlight.",
  },
  {
    ...lineDefaults,
    id: "line-5",
    sku: "SKU-4138",
    description: "Aluminium spacer, 12 mm",
    quantity: 30,
    unitPrice: 2.1,
    supplier: "SUP-003",
    expedite: true,
    priority: 1,
    packSize: { units: 10 },
    warehouse: "South warehouse",
    location: "C-01-08",
    requestedDate: "2026-12-14",
    promisedDate: "2026-12-16",
    notes: "Check dimensions before receiving and keep this batch together.",
  },
];

function LineItemsNextPage() {
  const [pending, setPending] = useState<LineItemsChangeSet<Line> | null>(null);
  const [lastSent, setLastSent] = useState<LineItemsChangeSet<Line> | null>(null);
  const [preparing, setPreparing] = useState(false);
  const [message, setMessage] = useState(
    "Try every editor type. Text and number inputs confirm with Enter or Tab; choices and toggles commit their selected values.",
  );
  const nextSku = useRef(1);
  const nextId = useRef(1);
  const lineItems = useLineItems<Line>({
    columns,
    defaultLines: initialLines,
    ordering: "manual",
    tableId: "showcase:line-items-next",
    rowSelection: {
      actions: [
        {
          id: "delete",
          label: "Delete selected",
          icon: <Trash2 />,
          onClick: (ids, { clearSelection }) => {
            lineItems.removeLines(ids);
            clearSelection();
            setMessage(
              `Deleted ${ids.length} selected lines. Start save to persist the changes, or Discard to restore them.`,
            );
          },
        },
      ],
    },
    rowActions: {
      width: 64,
      render: (line, { lineKey }): ReactNode => {
        return (
          <div className="flex justify-end gap-1">
            <Button
              variant="ghost"
              size="xs"
              aria-label={`Remove ${line.sku}`}
              onClick={() => {
                lineItems.removeLine(lineKey);
              }}
            >
              <Trash2 />
            </Button>
          </div>
        );
      },
    },
  });
  const changeSet = lineItems.getChangeSet();
  const unsaved = lineItems.hasUnsavedChanges();
  const selecting = lineItems.selectedIds.length > 0;
  function addLine() {
    lineItems.addLine({
      ...lineDefaults,
      sku: `NEW-${String(nextSku.current++).padStart(3, "0")}`,
      description: "New item",
      quantity: 1,
      unitPrice: 10,
    });
  }
  async function save() {
    setPreparing(true);
    try {
      if (!pending) {
        const sent = await lineItems.commitEdits();
        if (sent === null) {
          setMessage("Cannot save. Check the input values and errors.");
          return;
        }
        if (sent.isEmpty) {
          setMessage("There are no changes to save.");
          return;
        }
        setPending(sent);
        setLastSent(sent);
        setMessage("Save request sent. Keep editing, then click Apply save response.");
        return;
      }
      const idMap: Record<string, string> = {};
      for (const change of pending.lineChanges) {
        if (change.action === "add") idMap[change.tempId] = `saved-${nextId.current++}`;
      }
      lineItems.reset({ idMap }, { sent: pending });
      lineItems.clearSelection?.();
      setPending(null);
      setMessage(
        lineItems.hasUnsavedChanges()
          ? "Submitted changes saved. Edits made after the request are still pending."
          : "All changes saved. New lines now have server IDs.",
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Save failed.");
    } finally {
      setPreparing(false);
    }
  }

  return (
    <Layout>
      <Layout.Header title="Line items" />
      <Layout.Column>
        <div className="flex flex-wrap items-center gap-3">
          <Badge variant="outline-info">Development preview</Badge>
          <Text variant="body-sm" className="text-muted-foreground">
            A purchase order example using LineItems and useLineItems from the built package.
          </Text>
        </div>
        <div className="flex flex-col gap-2">
          <Text.h3>Purchase order lines</Text.h3>
          <Text variant="body-sm" className="text-muted-foreground">
            PO-2026-0042 · Saves are mocked locally. Reload to restore the initial data.
          </Text>
          {lineItems.errors.length > 0 && (
            <Badge variant="outline-error">Errors: {lineItems.errors.length}</Badge>
          )}
        </div>
        <LineItems.Root value={lineItems}>
          <Toolbar.Root>
            <Toolbar.Row justify="between" aria-label="Line item tools">
              <Toolbar.Group>
                <LineItems.Search />
              </Toolbar.Group>
              <Toolbar.Group>
                <LineItems.ColumnSettings />
              </Toolbar.Group>
            </Toolbar.Row>
          </Toolbar.Root>
          <LineItems.Table aria-label="Purchase order lines" />
          <LineItems.Footer>
            <Toolbar.Row
              justify="between"
              aria-label="Line item document actions"
              className={selecting ? "astw:ml-auto" : "astw:w-full"}
            >
              {!selecting && (
                <Toolbar.Group>
                  <Button variant="outline" size="xs" onClick={addLine}>
                    <Plus /> Add line
                  </Button>
                </Toolbar.Group>
              )}
              <Toolbar.Group>
                <Button
                  variant="outline"
                  size="xs"
                  disabled={!unsaved}
                  onClick={() => {
                    lineItems.revert();
                    lineItems.clearSelection?.();
                    setMessage("Document changes were restored to the saved state.");
                  }}
                >
                  <RotateCcw /> Discard
                </Button>
                <Button
                  size="xs"
                  disabled={preparing || (!pending && !unsaved)}
                  onClick={() => {
                    void save();
                  }}
                >
                  <Save /> {pending ? "Apply save response" : "Start save"}
                </Button>
              </Toolbar.Group>
            </Toolbar.Row>
          </LineItems.Footer>
        </LineItems.Root>
        <Text variant="body-sm" render={<output />} className="text-muted-foreground">
          {message}
        </Text>
        <Text variant="body-sm" className="text-muted-foreground">
          Change a quantity → Start save → edit it again → Apply save response to see how edits made
          during a save stay pending. Inputs remain drafts until confirmed, and invalid numbers
          block saving. Independent metadata saves, virtualization, and spreadsheet operations are
          not included yet. The 18 data columns intentionally overflow the viewport: scroll
          horizontally to inspect them while SKU, Amount, and Actions stay pinned. Use Columns to
          reorder columns or change their pinned edge; these preferences are saved locally. Search
          narrows the visible rows as you type without changing document totals or the save
          snapshot. Drag the row handles to reorder lines, or focus a handle and use
          ArrowUp/ArrowDown. Select all checks only visible lines; Delete selected also removes
          selected lines hidden by search. Selection is configured through useLineItems, does not
          make the document dirty, and the example clears it on Discard or applying a save response.
        </Text>
        <Text variant="body-sm" className="text-muted-foreground">
          Editors: Product name uses text; Qty and Unit price use number inputs with number/money
          display; Expedite uses boolean; Requested and Promised dates use date pickers; Unit uses
          fixed string choices; Priority uses numeric choices (1, 2, or 3); Supplier uses an async
          combobox backed by a mock catalogue; Pack size uses a custom object editor. Choice labels
          are rendered explicitly, separately from their stored values. The custom buttons commit
          immutable pack-size objects directly; Clear commits null.
        </Text>
        <div className="grid min-w-0 gap-4 lg:grid-cols-2">
          <Card.Root>
            <Card.Header
              title="Current change set"
              description="Changes to confirmed values. commitEdits confirms any pending input before saving."
            />
            <Card.Content>
              <pre
                data-testid="current-change-set"
                className="max-h-80 overflow-auto rounded-md bg-muted p-4 text-body-sm"
              >
                {JSON.stringify(changeSet, null, 2)}
              </pre>
            </Card.Content>
          </Card.Root>
          <Card.Root>
            <Card.Header
              title="Last submitted snapshot"
              description="This snapshot stays unchanged while a save response is pending."
            />
            <Card.Content>
              <pre
                data-testid="sent-change-set"
                className="max-h-80 overflow-auto rounded-md bg-muted p-4 text-body-sm"
              >
                {lastSent
                  ? JSON.stringify(lastSent, null, 2)
                  : "No save request has been sent yet."}
              </pre>
            </Card.Content>
          </Card.Root>
        </div>
      </Layout.Column>
    </Layout>
  );
}

LineItemsNextPage.appShellPageProps = {
  meta: { title: "Line items (preview)", icon: <Rows3 /> },
} satisfies AppShellPageProps;

export default LineItemsNextPage;
