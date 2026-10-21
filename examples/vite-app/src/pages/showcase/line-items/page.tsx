import {
  TreePicker,
  Button,
  Card,
  Combobox,
  createLineItemHelper,
  Layout,
  LineItems,
  useLineItems,
  type AppShellPageProps,
  type TreePickerNode,
  type LineItemsChangeSet,
  type LineItemsMode,
} from "@tailor-platform/app-shell";
import { Copy, ExternalLink, PackageCheck, Trash2, Upload, X } from "lucide-react";
import { useState } from "react";

// 🧪 Dummy Data: Replace with real data later
type PurchaseOrderLine = {
  /** Server id; unset on lines added since the last save. */
  id?: string;
  sku: string;
  description: string;
  uom: string;
  quantity: number;
  unitPrice: number;
  receivedQty: number;
  expected: string;
  note: string;
};

// No descriptions here on purpose: the select cell's input shows label plus
// description (so SKU cells are searchable by product name), which would read
// as "Case 12 units per case" for a unit of measure.
const UOM_OPTIONS = [
  { value: "EA", label: "Each" },
  { value: "CS", label: "Case" },
  { value: "PLT", label: "Pallet" },
];

// 🧪 Dummy Data: Replace with real data later — the catalog both pickers browse
type CatalogItem = { sku: string; name: string; price: number };

const CATALOG: CatalogItem[] = [
  { sku: "DT-TEE-WHT-S", name: "Cotton Wreath Tee, White, Small", price: 18.5 },
  { sku: "DT-TEE-WHT-M", name: "Cotton Wreath Tee, White, Medium", price: 18.5 },
  { sku: "DT-TEE-GRY-XL", name: "Cotton Wreath Tee, Grey, XL", price: 19.75 },
  { sku: "DT-HOOD-BLK-M", name: "Heavyweight Hoodie, Black, Medium", price: 62 },
  { sku: "DT-JKT-DNM-L", name: "Denim Chore Jacket, Indigo, Large", price: 148 },
  { sku: "DT-CAP-BLK-OS", name: "Embroidered Cap, Black", price: 14.25 },
  { sku: "DT-TOTE-NAT-OS", name: "Canvas Tote, Natural", price: 22 },
];

// 🧪 Dummy Data: stands in for a backend product search, with a little latency.
async function searchCatalog(
  query: string | null,
  { signal }: { signal: AbortSignal },
): Promise<CatalogItem[]> {
  await new Promise((resolve) => setTimeout(resolve, 250));
  signal.throwIfAborted();
  const q = (query ?? "").toLowerCase();
  return CATALOG.filter((c) => `${c.sku} ${c.name}`.toLowerCase().includes(q));
}

const CATALOG_TREE: TreePickerNode<CatalogItem>[] = [
  {
    id: "cat-tees",
    data: { sku: "TEES", name: "T-Shirts", price: 0 },
    children: CATALOG.filter((c) => c.sku.includes("TEE")).map((c) => ({ id: c.sku, data: c })),
  },
  {
    id: "cat-outerwear",
    data: { sku: "OUTER", name: "Outerwear", price: 0 },
    children: CATALOG.filter((c) => c.sku.includes("HOOD") || c.sku.includes("JKT")).map((c) => ({
      id: c.sku,
      data: c,
    })),
  },
  {
    id: "cat-accessories",
    data: { sku: "ACC", name: "Accessories", price: 0 },
    children: CATALOG.filter((c) => c.sku.includes("CAP") || c.sku.includes("TOTE")).map((c) => ({
      id: c.sku,
      data: c,
    })),
  },
];

// 🧪 Dummy Data: Replace with real data later
const INITIAL_LINES: PurchaseOrderLine[] = [
  {
    id: "pol-1001",
    sku: "DT-TEE-BLK-M",
    description: "Cotton Wreath Tee, Black, Medium",
    uom: "CS",
    quantity: 24,
    unitPrice: 18.5,
    receivedQty: 24,
    expected: "2026-04-30",
    note: "",
  },
  {
    id: "pol-1002",
    sku: "DT-TEE-BLK-L",
    description: "Cotton Wreath Tee, Black, Large",
    uom: "CS",
    quantity: 18,
    unitPrice: 18.5,
    receivedQty: 12,
    expected: "2026-05-01",
    note: "Short shipped",
  },
  {
    id: "pol-1003",
    sku: "DT-HOOD-CRM-L",
    description: "Heavyweight Hoodie, Cream, Large",
    uom: "EA",
    quantity: 40,
    unitPrice: 62,
    receivedQty: 40,
    expected: "2026-05-02",
    note: "",
  },
  {
    id: "pol-1004",
    sku: "DT-CAP-NVY-OS",
    description: "Embroidered Cap, Navy, One Size",
    uom: "EA",
    quantity: 120,
    unitPrice: 14.25,
    receivedQty: 96,
    expected: "2026-05-03",
    note: "",
  },
  {
    id: "pol-1005",
    sku: "DT-SOCK-WHT-OS",
    description: "Crew Socks, White, One Size",
    uom: "PLT",
    quantity: 6,
    unitPrice: 210,
    receivedQty: 6,
    expected: "2026-05-04",
    note: "",
  },
];

const money = (n: number) => `$${(n ?? 0).toFixed(2)}`;
const lineTotal = (l: PurchaseOrderLine) => (l.quantity ?? 0) * (l.unitPrice ?? 0);

// ✅ Reusable Component: Can be moved to components/ui/
const f = createLineItemHelper<PurchaseOrderLine>();

// 🧪 Dummy Data: stands in for the ids a real backend returns for created lines.
let nextServerId = 9000;
function fakeServerIds(changeSet: LineItemsChangeSet): Record<string, string> {
  const idMap: Record<string, string> = {};
  for (const change of changeSet.lineChanges) {
    if (change.action === "add") idMap[change.tempId] = `pol-${nextServerId++}`;
  }
  return idMap;
}

const fields = [
  f.field({
    key: "sku",
    label: "SKU",
    render: (l) => <span className="font-mono text-xs">{l.sku}</span>,
    editable: ["edit"],
    type: {
      kind: "select",
      options: CATALOG.map((c) => ({ value: c.sku, label: c.sku, description: c.name })),
      placeholder: "Pick a product",
    },
    width: 200,
    pin: "left",
    search: (l, q) => l.sku.toLowerCase().includes(q.toLowerCase()),
    sort: { comparator: (a, b) => a.sku.localeCompare(b.sku) },
  }),
  f.field({
    key: "description",
    label: "Product",
    render: (l) => l.description ?? "",
    editable: ["edit"],
    type: { kind: "text" },
    flex: true,
    search: (l, q) => (l.description ?? "").toLowerCase().includes(q.toLowerCase()),
  }),
  f.field({
    key: "uom",
    label: "UoM",
    render: (l) => UOM_OPTIONS.find((o) => o.value === l.uom)?.label ?? l.uom ?? "",
    editable: ["edit"],
    type: { kind: "select", options: UOM_OPTIONS, placeholder: "Unit" },
    width: 120,
  }),
  f.field({
    key: "quantity",
    label: "Ordered",
    render: (l) => l.quantity ?? 0,
    editable: ["edit"],
    type: { kind: "number", decimals: 0 },
    // Blocks Save and shows why, until it's fixed.
    validate: (value) => (Number(value) < 0 ? "Quantity can't be negative" : null),
    width: 100,
    sort: { comparator: (a, b) => (a.quantity ?? 0) - (b.quantity ?? 0) },
  }),
  f.field({
    key: "receivedQty",
    label: "Received",
    // Still correctable after the PO is confirmed, so it opts into amend.
    editable: ["edit", "amend"],
    render: (l) => l.receivedQty ?? 0,
    type: { kind: "number", decimals: 0 },
    width: 100,
    className: (l) =>
      (l.receivedQty ?? 0) !== (l.quantity ?? 0) ? "bg-destructive/10 text-destructive" : undefined,
  }),
  f.field({
    key: "unitPrice",
    label: "Unit price",
    render: (l) => money(l.unitPrice),
    editable: ["edit"],
    type: { kind: "number", decimals: 2 },
    width: 120,
  }),
  f.field({
    key: "expected",
    label: "Expected",
    render: (l) => l.expected ?? "",
    editable: ["edit"],
    type: { kind: "date" },
    width: 150,
  }),
  f.field({
    key: "note",
    label: "Note",
    // 🧪 Notes save out-of-band, so they never enter the document change-set.
    render: (l) => l.note ?? "",
    editable: ["edit", "amend"],
    commit: "metadata",
    type: { kind: "text" },
    width: 160,
  }),
  f.field({
    key: "lineTotal",
    label: "Total",
    render: (l) => <span className="font-medium">{money(lineTotal(l))}</span>,
    width: 120,
    align: "right",
    pin: "right",
  }),
];

const MODES: LineItemsMode[] = ["edit", "view", "amend"];

// 🧪 Dummy Data: Replace with real data later — a long PO for checking scroll,
// virtualization and pinned columns at volume.
const LARGE_LINE_COUNT = 1000;
const NOTES = [
  "",
  "",
  "",
  "Short shipped",
  "Backordered until next week",
  "Damaged carton on arrival",
];

function generateLines(count: number): PurchaseOrderLine[] {
  return Array.from({ length: count }, (_, i) => {
    const item = CATALOG[i % CATALOG.length]!;
    const quantity = 1 + ((i * 37) % 240);
    const day = 1 + (i % 28);
    return {
      id: `pol-${2000 + i}`,
      sku: item.sku,
      description: item.name,
      uom: UOM_OPTIONS[i % UOM_OPTIONS.length]!.value,
      quantity,
      unitPrice: item.price,
      receivedQty: i % 5 === 0 ? Math.floor(quantity * 0.75) : quantity,
      expected: `2026-06-${String(day).padStart(2, "0")}`,
      note: NOTES[i % NOTES.length]!,
    };
  });
}

const LARGE_LINES = generateLines(LARGE_LINE_COUNT);

const LineItemsDemoPage = () => {
  const [large, setLarge] = useState(false);
  // Uncontrolled `data` only seeds the hook, so swapping datasets remounts it.
  return (
    <PurchaseOrderDemo
      key={large ? "large" : "small"}
      initialLines={large ? LARGE_LINES : INITIAL_LINES}
      large={large}
      onToggleLarge={() => setLarge((v) => !v)}
    />
  );
};

const PurchaseOrderDemo = ({
  initialLines,
  large,
  onToggleLarge,
}: {
  initialLines: PurchaseOrderLine[];
  large: boolean;
  onToggleLarge: () => void;
}) => {
  const [mode, setMode] = useState<LineItemsMode>("edit");
  const [ordering, setOrdering] = useState<"sort" | "manual">("manual");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [lastSaved, setLastSaved] = useState<LineItemsChangeSet | null>(null);
  const [metadataLog, setMetadataLog] = useState<string[]>([]);

  const lineItems = useLineItems<PurchaseOrderLine>({
    fields,
    defaultLines: initialLines,
    mode,
    ordering,
    // 🔽 Bulk actions: the same footer bar DataTable shows while rows are selected.
    // Actions get the selected line keys; look lines up from `allLines` when needed.
    // Block-bodied handlers keep TypeScript from inferring `lineItems` from itself.
    // 🔽 Detail panel per line — here, how much of it has arrived.
    rowExpansion: {
      render: (line) => (
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <div className="text-muted-foreground">Ordered</div>
            <div className="tabular-nums">{line.quantity}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Received</div>
            <div className="tabular-nums">{line.receivedQty}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Still to come</div>
            <div className="tabular-nums">{Math.max(0, line.quantity - line.receivedQty)}</div>
          </div>
        </div>
      ),
      getLabel: (line) => line.sku,
    },
    rowSelection: {
      actions: [
        {
          id: "receive",
          label: "Mark received",
          icon: <PackageCheck className="size-4" />,
          onClick: (ids) => {
            // Eligibility is the app's call: only lines still short are touched.
            const picked = new Set(ids);
            lineItems.updateLines(
              lineItems.allLines
                .filter(
                  (line) =>
                    picked.has(lineItems.getLineKey(line)) && line.receivedQty < line.quantity,
                )
                .map((line) => ({
                  lineKey: lineItems.getLineKey(line),
                  patch: { receivedQty: line.quantity },
                })),
            );
          },
        },
        {
          id: "duplicate",
          label: "Duplicate",
          icon: <Copy className="size-4" />,
          onClick: (ids) => {
            const picked = new Set(ids);
            // Copies come in without an id, as new lines.
            lineItems.addLines(
              lineItems.allLines.filter((line) => picked.has(lineItems.getLineKey(line))),
            );
          },
        },
        {
          id: "remove",
          label: "Remove",
          icon: <Trash2 className="size-4" />,
          variant: "destructive",
          onClick: (ids) => {
            lineItems.removeLines(ids);
          },
        },
      ],
    },
    onMetadataCommit: (event) =>
      setMetadataLog((log) =>
        [`${event.lineId}: note → ${JSON.stringify(event.patch.note)}`, ...log].slice(0, 5),
      ),
  });

  const addFromCatalog = (item: CatalogItem) =>
    lineItems.addLine({
      sku: item.sku,
      description: item.name,
      uom: "EA",
      quantity: 1,
      unitPrice: item.price,
      receivedQty: 0,
      expected: "",
      note: "",
    });

  return (
    <Layout>
      <Layout.Column>
        {/* 🔽 Demo controls */}
        <div className="flex flex-wrap items-center gap-2">
          {MODES.map((m) => (
            <Button
              key={m}
              variant={mode === m ? "default" : "outline"}
              size="sm"
              onClick={() => setMode(m)}
            >
              {`${m[0]?.toUpperCase()}${m.slice(1)} mode`}
            </Button>
          ))}
          <Button
            variant={ordering === "manual" ? "default" : "outline"}
            size="sm"
            onClick={() => setOrdering(ordering === "manual" ? "sort" : "manual")}
          >
            {ordering === "manual" ? "Manual order" : "Sorted"}
          </Button>
          <Button variant={large ? "default" : "outline"} size="sm" onClick={onToggleLarge}>
            {large ? `${LARGE_LINE_COUNT.toLocaleString()} lines` : "Load 1,000 lines"}
          </Button>
        </div>

        <LineItems.Root value={lineItems}>
          {/* 🔽 Line items section */}
          <Card.Root>
            <Card.Header
              title="Line items"
              description={`${lineItems.allLines.length} lines · ${
                lineItems.isDirty ? "Unsaved changes" : "All saved"
              }`}
            >
              <div className="flex items-center justify-end gap-2">
                <LineItems.SearchToggle placeholder="Search SKU or product" />
                <Button variant="outline" size="sm" onClick={() => alert("Import from CSV")}>
                  <Upload className="size-4" />
                  Import from CSV
                </Button>
                <LineItems.FullscreenToggle />
              </div>
            </Card.Header>

            <Card.Content>
              <LineItems.Table
                rowHeight={36}
                rowActionsWidth={72}
                renderRowActions={(row: PurchaseOrderLine, { lineKey, isNew }) => (
                  <>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`View ${row.sku}`}
                      // A new line has no page to open until it's saved.
                      disabled={isNew}
                      onClick={() => alert(`View ${row.id}`)}
                    >
                      <ExternalLink className="size-3.5" />
                    </Button>
                    {/* Removing lines is an edit; amend only corrects a confirmed document. */}
                    {mode === "edit" ? (
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Remove ${row.sku}`}
                        onClick={() => lineItems.removeLine(lineKey)}
                      >
                        <X className="size-3.5 text-destructive" />
                      </Button>
                    ) : null}
                  </>
                )}
              />

              <LineItems.TotalsRow>
                {(lines: PurchaseOrderLine[]) => ({
                  description: `${lines.length} lines`,
                  quantity: lines.reduce((s, l) => s + (l.quantity ?? 0), 0),
                  receivedQty: lines.reduce((s, l) => s + (l.receivedQty ?? 0), 0),
                  lineTotal: money(lines.reduce((s, l) => s + lineTotal(l), 0)),
                })}
              </LineItems.TotalsRow>

              {/* 🔽 Add lines from the bottom of the table — one at a time from a backend
                  lookup, or many with Bulk add; save sits beside them, in the card */}
              <div className="mt-2 flex items-center justify-between gap-2">
                <LineItems.AddRow className="flex-1">
                  <Combobox.Async
                    fetcher={searchCatalog}
                    placeholder="+   Add product — type to search…"
                    aria-label="Add product"
                    className="max-w-md flex-1"
                    mapItem={(item) => ({ label: `${item.sku} ${item.name}`, key: item.sku })}
                    onValueChange={(item) => {
                      if (item) addFromCatalog(item);
                    }}
                  />
                  <Button variant="outline" onClick={() => setPickerOpen(true)}>
                    Bulk add
                  </Button>
                </LineItems.AddRow>
                <LineItems.SaveActions
                  onSave={(cs) => {
                    setLastSaved(cs);
                    // A real save would submit first, then re-key new lines with the
                    // ids the server returns (or pass the saved lines to reset).
                    lineItems.reset({ idMap: fakeServerIds(cs) }, { sent: cs });
                  }}
                />
              </div>
            </Card.Content>
          </Card.Root>
        </LineItems.Root>

        {/* 🔽 Change-set inspector — what a real submit would send */}
        {lastSaved ? (
          <Card.Root>
            <Card.Header
              title="Last submitted change-set"
              description="The transport-agnostic payload handed to onSave."
            />
            <Card.Content>
              <pre className="max-h-64 overflow-auto rounded-md bg-muted p-3 text-xs">
                {JSON.stringify(lastSaved, null, 2)}
              </pre>
            </Card.Content>
          </Card.Root>
        ) : null}

        {/* 🔽 Out-of-band note commits, which bypass the change-set */}
        {metadataLog.length > 0 ? (
          <Card.Root>
            <Card.Header
              title="Metadata commits"
              description="Note edits report here instead of entering the change-set."
            />
            <Card.Content>
              <ul className="text-muted-foreground space-y-1 text-xs">
                {metadataLog.map((entry, i) => (
                  <li key={i}>{entry}</li>
                ))}
              </ul>
            </Card.Content>
          </Card.Root>
        ) : null}

        <TreePicker<CatalogItem>
          open={pickerOpen}
          onOpenChange={setPickerOpen}
          title="Bulk line item picker"
          items={CATALOG_TREE}
          rowLabel="Product name"
          metricLabel="Unit price"
          renderRow={({ node }) => (
            <span className="flex flex-col">
              <span className="text-sm">{node.data.name}</span>
              {node.children ? null : (
                <span className="text-muted-foreground font-mono text-xs">{node.data.sku}</span>
              )}
            </span>
          )}
          renderMetric={({ node }) => (node.children ? null : money(node.data.price))}
          matchesSearch={({ node, query }) =>
            `${node.data.sku} ${node.data.name}`.toLowerCase().includes(query.toLowerCase())
          }
          ctaLabel={(n) => (n === 0 ? "Add items" : `Add ${n} item${n === 1 ? "" : "s"}`)}
          onCommit={(picked) => {
            lineItems.addLines(
              picked.map((node) => ({
                sku: node.data.sku,
                description: node.data.name,
                uom: "EA",
                quantity: 1,
                unitPrice: node.data.price,
                receivedQty: 0,
                expected: "",
                note: "",
              })),
            );
          }}
        />
      </Layout.Column>
    </Layout>
  );
};

LineItemsDemoPage.appShellPageProps = {
  meta: {
    title: "Line Items",
  },
} satisfies AppShellPageProps;

export default LineItemsDemoPage;
