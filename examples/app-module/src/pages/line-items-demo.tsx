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
  }),
  f.field({
    key: "quantity",
    label: "Qty",
    render: (l) => l.quantity,
    editable: ["edit", "amend"],
    type: { kind: "number", decimals: 0 },
    align: "right",
    sort: { comparator: (a, b) => a.quantity - b.quantity },
  }),
  f.field({
    key: "unitPrice",
    label: "Unit price",
    render: (l) => fmtCurrency(l.unitPrice),
    editable: ["edit"],
    type: { kind: "number", decimals: 2 },
    align: "right",
    sort: { comparator: (a, b) => a.unitPrice - b.unitPrice },
  }),
  f.field({
    key: "total",
    label: "Total",
    render: (l) => fmtCurrency(l.total),
    align: "right",
  }),
  f.field({
    key: "note",
    label: "Note",
    render: (l) => l.note,
    editable: ["edit", "amend"],
    type: { kind: "text" },
    commit: "metadata",
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
    lines.push({
      lineRef: `seed-${i + 1}`,
      sku: base.sku,
      productName: base.productName,
      quantity,
      unitPrice,
      total: round2(quantity * unitPrice),
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
    // In a real app, send `cs` to the server here.
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
        <Card.Root>
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
                    note: "",
                  });
                }}
                disabled={mode !== "edit"}
              />
            ) : null}
          </Card.Content>
        </Card.Root>

        <FloatingActions
          selectedCount={lineItems.selectedIds.length}
          onBulkDelete={() => lineItems.bulkRemove()}
          onClearSelection={() => lineItems.clearSelection()}
          isDirty={lineItems.isDirty}
          onDiscard={() => lineItems.revert()}
          onSave={() => void handleSave()}
        />
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

/* ======================================================================== */
/* Floating bottom action bars                                              */
/* ======================================================================== */

/**
 * ✅ Reusable Component: floating bottom-center action pills. Mirrors the
 * denim-tears `FloatingActions` pattern (apps/ims/.../purchase-orders-table.tsx)
 * — a single `position: fixed` element rendered inline in the React tree (no
 * portal needed). All styling is inline so no Tailwind class-generation
 * gotchas; theme tokens come from `--foreground` / `--background` /
 * `--muted-foreground` defined in `theme.css`.
 *
 * Two bars stack vertically: the bulk-selection bar (when rows selected) and
 * the dirty-state bar (when there are unsaved changes).
 */
type FloatingActionsProps = {
  selectedCount: number;
  onBulkDelete: () => void;
  onClearSelection: () => void;
  isDirty: boolean;
  onDiscard: () => void;
  onSave: () => void;
};

const dockStyle: React.CSSProperties = {
  position: "fixed",
  bottom: "20px",
  left: "50%",
  transform: "translateX(-50%)",
  zIndex: 60,
  pointerEvents: "none",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: "8px",
};

const pillStyle: React.CSSProperties = {
  pointerEvents: "auto",
  display: "flex",
  alignItems: "center",
  gap: "12px",
  padding: "12px 20px",
  borderRadius: "16px",
  backgroundColor: "var(--foreground)",
  boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
};

const labelStyle: React.CSSProperties = {
  color: "var(--background)",
  fontSize: "14px",
  fontWeight: 500,
  whiteSpace: "nowrap",
};

const dividerStyle: React.CSSProperties = {
  width: "1px",
  height: "24px",
  backgroundColor: "var(--muted-foreground)",
  opacity: 0.4,
};

const primaryButtonStyle: React.CSSProperties = {
  backgroundColor: "var(--background)",
  color: "var(--foreground)",
  padding: "6px 12px",
  borderRadius: "6px",
  fontSize: "14px",
  fontWeight: 500,
  border: "none",
  cursor: "pointer",
};

const secondaryButtonStyle: React.CSSProperties = {
  background: "transparent",
  color: "var(--muted-foreground)",
  padding: "6px 12px",
  borderRadius: "6px",
  fontSize: "14px",
  fontWeight: 500,
  border: "none",
  cursor: "pointer",
};

/**
 * Jiggles the dirty bar to draw attention when the user is about to navigate
 * away (tab visibility change, window blur). The keyframe is injected as a
 * `<style>` tag below; we re-mount the bar with a bumped React `key` to
 * restart the animation.
 */
const JIGGLE_KEYFRAMES = `
@keyframes line-items-jiggle {
  0%, 100% { transform: translateX(0); }
  15% { transform: translateX(-8px); }
  30% { transform: translateX(8px); }
  45% { transform: translateX(-6px); }
  60% { transform: translateX(6px); }
  75% { transform: translateX(-3px); }
  90% { transform: translateX(3px); }
}
`;

function FloatingActions({
  selectedCount,
  onBulkDelete,
  onClearSelection,
  isDirty,
  onDiscard,
  onSave,
}: FloatingActionsProps) {
  // Bump when the user attempts to leave the page while dirty; used as a React
  // key to restart the jiggle animation on the dirty pill.
  const [jiggleNonce, setJiggleNonce] = React.useState(0);
  const isDirtyRef = React.useRef(isDirty);
  React.useEffect(() => {
    isDirtyRef.current = isDirty;
  }, [isDirty]);

  React.useEffect(() => {
    const triggerJiggle = () => setJiggleNonce((n) => n + 1);

    /**
     * Capture-phase click handler. If the user clicks on a navigational anchor
     * (sidebar link, breadcrumb, etc.) while there are unsaved changes, we
     * swallow the click and shake the dirty pill instead of letting the SPA
     * navigate away.
     *
     * Anchor refs starting with `#` (in-page) or with target=_blank are
     * allowed through — they don't unmount the current page.
     */
    const onDocumentClick = (e: MouseEvent) => {
      if (!isDirtyRef.current) return;
      if (e.defaultPrevented) return;
      const target = e.target as Element | null;
      if (!target) return;

      // Don't block clicks happening inside our own UI surfaces.
      if (
        target.closest('[data-slot="floating-actions"]') ||
        target.closest('[data-slot="card"]')
      ) {
        return;
      }

      const anchor = target.closest("a[href]") as HTMLAnchorElement | null;
      if (!anchor) return;

      const href = anchor.getAttribute("href") ?? "";
      if (!href || href.startsWith("#")) return;
      if (anchor.target && anchor.target !== "" && anchor.target !== "_self") return;

      e.preventDefault();
      e.stopPropagation();
      triggerJiggle();
    };

    /**
     * Browser-level navigation (close tab, refresh, hard-coded URL change).
     * `preventDefault` + setting `returnValue` triggers the native confirmation
     * dialog. We also fire the jiggle so the bar shakes if the user cancels.
     */
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!isDirtyRef.current) return;
      e.preventDefault();
      // Required for legacy Chrome/Edge support.
      e.returnValue = "";
      triggerJiggle();
    };

    document.addEventListener("click", onDocumentClick, { capture: true });
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      document.removeEventListener("click", onDocumentClick, { capture: true });
      window.removeEventListener("beforeunload", onBeforeUnload);
    };
  }, []);

  if (selectedCount === 0 && !isDirty) return null;

  const dirtyPillStyle: React.CSSProperties = {
    ...pillStyle,
    animation:
      jiggleNonce > 0 ? "line-items-jiggle 0.5s cubic-bezier(0.36, 0.07, 0.19, 0.97)" : undefined,
  };

  return (
    <div data-slot="floating-actions" style={dockStyle}>
      <style>{JIGGLE_KEYFRAMES}</style>
      {selectedCount > 0 ? (
        <div style={pillStyle}>
          <span style={labelStyle}>{selectedCount} selected</span>
          <span aria-hidden style={dividerStyle} />
          <button type="button" style={primaryButtonStyle} onClick={onBulkDelete}>
            Delete selected
          </button>
          <button type="button" style={secondaryButtonStyle} onClick={onClearSelection}>
            Clear
          </button>
        </div>
      ) : null}
      {isDirty ? (
        <div key={jiggleNonce} style={dirtyPillStyle}>
          <span style={labelStyle}>Unsaved changes</span>
          <span aria-hidden style={dividerStyle} />
          <button type="button" style={secondaryButtonStyle} onClick={onDiscard}>
            Discard
          </button>
          <button type="button" style={primaryButtonStyle} onClick={onSave}>
            Save
          </button>
        </div>
      ) : null}
    </div>
  );
}
