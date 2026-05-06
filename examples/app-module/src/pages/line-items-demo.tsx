import * as React from "react";
import {
  ActionPanel,
  ActivityCard,
  Button,
  Card,
  Combobox,
  DescriptionCard,
  Layout,
  LineItems,
  createLineItemHelper,
  defineResource,
  lineItemsFloatingBarStyles,
  useLineItems,
  type LineItemsField,
  type LineItemsMode,
  type LineItemsRowData,
} from "@tailor-platform/app-shell";

import { activityCardDemoActivities } from "./activity-card-demo";
import { ExternalLinkIcon, FileTextIcon, ReceiptIcon } from "./action-panel-demo";
import { mockPurchaseOrder } from "./purchase-order-demo";

/* ======================================================================== */
/* Domain                                                                    */
/* ======================================================================== */

type POLine = LineItemsRowData & {
  sku: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  total: number;
  expectedReady: string;
  note: string;
};

type CatalogItem = {
  sku: string;
  productName: string;
  unitPrice: number;
};

const CATALOG: CatalogItem[] = [
  { sku: "SKU-1001", productName: "Indigo Denim Roll", unitPrice: 24.5 },
  { sku: "SKU-2040", productName: "Copper Rivet Pack", unitPrice: 8.25 },
  { sku: "SKU-3300", productName: "Organic Cotton Jersey", unitPrice: 15.0 },
  { sku: "SKU-4412", productName: "Leather Patch Kit", unitPrice: 12.75 },
];

const round2 = (n: number) => Math.round(n * 100) / 100;
const fmtCurrency = (n: number) => n.toFixed(2);

/* ======================================================================== */
/* Field schema                                                              */
/* ======================================================================== */

const f = createLineItemHelper<POLine>();

const fields: LineItemsField<POLine>[] = [
  f.field({
    key: "sku",
    label: "SKU",
    render: (l) => l.sku,
    editable: ["edit"],
    type: {
      kind: "select",
      options: CATALOG.map((c) => ({
        value: c.sku,
        label: c.sku,
        description: c.productName,
      })),
      placeholder: "Pick SKU",
    },
    sort: { comparator: (a, b) => a.sku.localeCompare(b.sku) },
    search: (l, q) => l.sku.toLowerCase().includes(q.toLowerCase()),
    width: 200,
    hoverExpandWidth: 320,
  }),
  f.field({
    key: "productName",
    label: "Product",
    render: (l) => l.productName,
    editable: ["edit"],
    type: { kind: "text" },
    sort: { comparator: (a, b) => a.productName.localeCompare(b.productName) },
    search: (l, q) => l.productName.toLowerCase().includes(q.toLowerCase()),
    flex: true,
  }),
  f.field({
    key: "quantity",
    label: "Qty",
    render: (l) => l.quantity,
    editable: ["edit", "amend"],
    type: { kind: "number", decimals: 0 },
    align: "right",
    sort: { comparator: (a, b) => a.quantity - b.quantity },
    width: 90,
  }),
  f.field({
    key: "unitPrice",
    label: "Unit price",
    render: (l) => fmtCurrency(l.unitPrice),
    editable: ["edit"],
    type: { kind: "number", decimals: 2 },
    align: "right",
    sort: { comparator: (a, b) => a.unitPrice - b.unitPrice },
    width: 110,
  }),
  f.field({
    key: "total",
    label: "Total",
    render: (l) => fmtCurrency(l.total),
    align: "right",
    width: 110,
  }),
  f.field({
    key: "expectedReady",
    label: "Expected",
    render: (l) => l.expectedReady,
    editable: ["edit"],
    type: { kind: "date" },
    sort: { comparator: (a, b) => a.expectedReady.localeCompare(b.expectedReady) },
    width: 140,
  }),
  f.field({
    key: "note",
    label: "Note",
    render: (l) => l.note,
    editable: ["edit", "amend"],
    type: { kind: "text" },
    commit: "metadata",
    width: 200,
  }),
];

/* ======================================================================== */
/* Initial seed                                                              */
/* ======================================================================== */

/**
 * Seed the demo with 1,200 rows so the virtualized table is exercised at scale.
 * Catalogue items are recycled with deterministic per-row variations (qty,
 * unit-price tweaks) so the data feels realistic without ballooning the bundle.
 */
function buildInitialLines(): POLine[] {
  const TOTAL_ROWS = 1200;
  const lines: POLine[] = [];
  for (let i = 0; i < TOTAL_ROWS; i++) {
    const base = CATALOG[i % CATALOG.length]!;
    const quantity = ((i * 7) % 90) + 1;
    const unitPrice = round2(base.unitPrice * (1 + ((i % 11) - 5) / 100));
    // Cycle expected-ready dates +/- a few weeks for visual variety.
    const baseDate = new Date(2026, 4, 1); // 2026-05-01 — May (month is 0-indexed)
    baseDate.setDate(baseDate.getDate() + (i % 21));
    const iso = baseDate.toISOString().slice(0, 10);
    lines.push({
      lineRef: `seed-${i + 1}`,
      sku: base.sku,
      productName: base.productName,
      quantity,
      unitPrice,
      total: round2(quantity * unitPrice),
      expectedReady: iso,
      note: i % 50 === 0 ? "Highlight row" : "",
    });
  }
  return lines;
}

/* ======================================================================== */
/* Page                                                                      */
/* ======================================================================== */

export const lineItemsDemoResource = defineResource({
  path: "line-items-demo",
  component: LineItemsDemoPage,
  meta: {
    title: "Line items",
  },
});

/**
 * ✅ Reusable Component: the line-items section — a self-contained block
 * containing demo mode controls + the LineItems card + the floating action
 * dock. Pass `initialData={[]}` to start from empty and exercise the add-row.
 */
export function LineItemsSection({ initialData }: { initialData?: POLine[] } = {}) {
  const initialLines = React.useMemo(() => initialData ?? buildInitialLines(), [initialData]);
  const [mode, setMode] = React.useState<LineItemsMode>("edit");

  const lineItems = useLineItems<POLine>({
    fields,
    data: initialLines,
    mode,
    selection: true,
  });

  // Keep `total` in sync with quantity / unitPrice so the read-only column
  // reflects the latest cell edits without an external compute step. Depends
  // on `allLines` (whose reference only changes when row state actually
  // changes) instead of the whole hook return — otherwise this effect would
  // re-fire on every render.
  const allLines = lineItems.allLines;
  const updateLines = lineItems.updateLines;
  React.useEffect(() => {
    const updates: { lineRef: string; patch: Partial<POLine> }[] = [];
    for (const l of allLines) {
      const expected = round2(l.quantity * l.unitPrice);
      if (expected !== l.total) updates.push({ lineRef: l.lineRef, patch: { total: expected } });
    }
    if (updates.length) updateLines(updates);
  }, [allLines, updateLines]);

  const handleSave = React.useCallback(() => {
    const cs = lineItems.getChangeSet();
    if (cs.isEmpty) return; // true client-side no-op
    // In a real app, translate `cs.lineChanges` into the document's mutation
    // shape (PO update, SO update, etc.) and dispatch one transactional submit.
    // eslint-disable-next-line no-console
    console.log("[line-items demo] saving change set", cs);
    lineItems.reset();
  }, [lineItems]);

  return (
    <>
      {/* 🧪 Demo Dummy: mode + duplicate-last are demo-only knobs to flip the
          table into different states. They are NOT part of the LineItems
          component itself — kept in a separate card just for the demo. */}
      <Card.Root>
        <Card.Content className="astw:flex astw:flex-wrap astw:items-center astw:gap-2 astw:py-3">
          <span className="astw:text-muted-foreground astw:text-xs astw:font-medium">Mode</span>
          {(["edit", "display", "amend"] as const).map((m) => (
            <Button
              key={m}
              type="button"
              size="sm"
              variant={mode === m ? "default" : "outline"}
              onClick={() => setMode(m)}
            >
              {m}
            </Button>
          ))}
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() =>
              lineItems.duplicateLastLine((prev, newRef) => ({ ...prev, lineRef: newRef }))
            }
            disabled={mode === "display" || lineItems.allLines.length === 0}
          >
            Duplicate last
          </Button>
        </Card.Content>
      </Card.Root>

      <LineItems.Root value={lineItems}>
        {/* overflow-hidden clips the edge-to-edge table to the Card's rounded
            corners. Without it the table fills Card.Content flush to the card's
            bottom edge with square corners that poke outside `rounded-xl`. */}
        <Card.Root className="astw:overflow-hidden">
          <Card.Header className="astw:flex astw:flex-row astw:items-center astw:justify-between astw:gap-3 astw:border-b">
            <div className="astw:flex astw:min-w-0 astw:flex-col astw:gap-1">
              <h3 className="astw:leading-none astw:font-semibold">Line items</h3>
              <p className="astw:text-muted-foreground astw:text-sm">
                {lineItems.allLines.length} lines ·{" "}
                {lineItems.isDirty ? "Unsaved changes" : "All saved"}
              </p>
            </div>
            <div className="astw:flex astw:shrink-0 astw:items-center astw:gap-1">
              <LineItems.SearchToggle
                placeholder="Search lines…"
                variant="outline"
                triggerSizeClassName="astw:size-8"
                collapsedWidth={32}
              />
              {/* 🧪 Dummy Data: hook these up to real flows later */}
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => alert("Import from CSV clicked")}
              >
                Import from CSV
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => alert("Bulk add clicked")}
              >
                Bulk add
              </Button>
              <LineItems.FullscreenToggle variant="outline" className="astw:size-8" />
            </div>
          </Card.Header>

          <Card.Content className="astw:flex astw:flex-col astw:p-0">
            <LineItems.Table
              maxBodyHeight={600}
              renderFullscreenToggle={false}
              tableContainerClassName="astw:rounded-none astw:border-0"
            />

            {mode !== "display" ? (
              <InlineCatalogueAddRow
                onPick={(picked) => {
                  lineItems.addLine({
                    sku: picked.sku,
                    productName: picked.productName,
                    quantity: 1,
                    unitPrice: picked.unitPrice,
                    total: round2(picked.unitPrice),
                    expectedReady: new Date().toISOString().slice(0, 10),
                    note: "",
                  });
                }}
                disabled={mode !== "edit"}
              />
            ) : null}
          </Card.Content>
        </Card.Root>

        {/* ✅ Library pattern: dirty + selection bars auto-mount/unmount
            based on hook state. Discard defaults to lineItems.revert();
            warnOnNav blocks anchor clicks + window unload while dirty. */}
        <LineItems.FloatingDock>
          <LineItems.DirtyBar warnOnNav onSave={() => void handleSave()} />
          <LineItems.SelectionBar<POLine>>
            {({ bulkRemove, clear }) => (
              <>
                <button
                  type="button"
                  style={lineItemsFloatingBarStyles.primaryButton}
                  onClick={bulkRemove}
                >
                  Delete selected
                </button>
                <button
                  type="button"
                  style={lineItemsFloatingBarStyles.secondaryButton}
                  onClick={clear}
                >
                  Clear
                </button>
              </>
            )}
          </LineItems.SelectionBar>
        </LineItems.FloatingDock>
      </LineItems.Root>
    </>
  );
}

export function LineItemsDemoPage() {
  const handleSave = React.useCallback(() => {
    // Page-level save (e.g. PO header). Distinct from the LineItemsSection's
    // own discard/save in the floating dock.
    alert("Page-level Save changes clicked");
  }, []);

  const headerActions = [
    <Button key="cancel" variant="secondary" size="sm" onClick={() => alert("Cancel clicked")}>
      Cancel
    </Button>,
    <Button key="save" size="sm" onClick={() => void handleSave()}>
      Save changes
    </Button>,
  ];

  const sidebarActions = [
    {
      key: "create-invoice",
      label: "Create sales invoice",
      icon: <ReceiptIcon />,
      onClick: () => alert("Create invoice clicked"),
    },
    {
      key: "delivery-note",
      label: "Create delivery note",
      icon: <FileTextIcon />,
      onClick: () => alert("Create delivery note clicked"),
    },
    {
      key: "view-po",
      label: "View Purchase Order",
      icon: <ExternalLinkIcon />,
      onClick: () => alert("Navigate to PO detail"),
    },
  ];

  return (
    <Layout>
      <Layout.Header
        title={`Purchase Order ${mockPurchaseOrder.docNumber}`}
        actions={headerActions}
      />
      <Layout.Column>
        <DescriptionCard
          data={mockPurchaseOrder}
          title="Order Overview"
          columns={4}
          fields={[
            { key: "docNumber", label: "PO Number", meta: { copyable: true } },
            { key: "externalReference", label: "External Ref", meta: { copyable: true } },
            { key: "supplierName", label: "Supplier" },
            { type: "divider" },
            {
              key: "expectedDeliveryDate",
              label: "Expected Delivery",
              type: "date",
              meta: { dateFormat: "medium" },
            },
            {
              key: "confirmedAt",
              label: "Confirmed",
              type: "date",
              meta: { dateFormat: "medium" },
            },
            {
              key: "createdAt",
              label: "Created",
              type: "date",
              meta: { dateFormat: "relative" },
            },
            { key: "shipToLocation.name", label: "Warehouse" },
            { type: "divider" },
            {
              key: "shipToLocation.address",
              label: "Shipping Address",
              type: "address",
              meta: { copyable: true },
            },
            { key: "note", label: "Notes", meta: { truncateLines: 3 } },
          ]}
        />

        <LineItemsSection />
      </Layout.Column>
      <Layout.Column>
        <ActionPanel title="Actions" actions={sidebarActions} />
        <ActivityCard
          title="Activity"
          maxVisible={6}
          overflowLabel="more"
          groupBy="day"
          items={activityCardDemoActivities}
        />
      </Layout.Column>
    </Layout>
  );
}

/* ======================================================================== */
/* Inline catalogue add-row                                                  */
/* ======================================================================== */

function InlineCatalogueAddRow({
  onPick,
  disabled,
}: {
  onPick: (item: CatalogItem) => void;
  disabled?: boolean;
}) {
  const [resetKey, setResetKey] = React.useState(0);
  return (
    <div
      style={{ margin: 8 }}
      className="astw:flex astw:items-center astw:gap-1"
    >
      <Combobox<CatalogItem>
        key={resetKey}
        items={CATALOG}
        disabled={disabled}
        placeholder="+   Add product — type to search…"
        emptyText="No matching products."
        mapItem={(p) => ({
          key: p.sku,
          // `label` drives type-to-filter — include both SKU and product name
          // so either matches the query.
          label: `${p.sku} ${p.productName}`,
          render: (
            <div className="astw:flex astw:flex-col astw:gap-0.5">
              <span className="astw:text-sm astw:font-medium">{p.sku}</span>
              <span className="astw:text-muted-foreground astw:text-xs">{p.productName}</span>
            </div>
          ),
        })}
        onValueChange={(picked) => {
          if (!picked) return;
          onPick(picked);
          setResetKey((k) => k + 1);
        }}
        className="astw:flex-1"
      />
      {/* 🧪 Dummy Data: hook this up to a real flow later */}
      <Button
        type="button"
        variant="outline"
        onClick={() => alert("Bulk add clicked")}
        disabled={disabled}
        style={{ boxShadow: "none" }}
      >
        Bulk add
      </Button>
    </div>
  );
}

