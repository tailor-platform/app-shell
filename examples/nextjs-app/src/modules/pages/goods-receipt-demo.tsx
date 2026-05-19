import * as React from "react";
import {
  Button,
  Card,
  Combobox,
  Layout,
  LineItems,
  createLineItemHelper,
  defineResource,
  lineItemsFloatingBarStyles,
  useLineItems,
  type LineItemsField,
  type LineItemsRowData,
} from "@tailor-platform/app-shell";

/* ======================================================================== */
/* Domain — Goods Receipt                                                    */
/* ======================================================================== */

type GRLine = LineItemsRowData & {
  sku: string;
  productName: string;
  expectedQty: number;
  receivedQty: number;
  condition: "OK" | "DAMAGED" | "SHORT";
  lotNumber: string;
  expiryDate: string;
};

const CONDITION_OPTIONS = [
  { value: "OK", label: "OK" },
  { value: "DAMAGED", label: "DAMAGED" },
  { value: "SHORT", label: "SHORT" },
];

/* ======================================================================== */
/* Field schema                                                              */
/* ======================================================================== */

const f = createLineItemHelper<GRLine>();

const fields: LineItemsField<GRLine>[] = [
  f.field({
    key: "sku",
    label: "SKU",
    render: (l) => l.sku,
    width: 160,
    pinned: "left",
  }),
  f.field({
    key: "productName",
    label: "Product",
    render: (l) => l.productName,
    width: 220,
    pinned: "left",
    flex: true,
  }),
  f.field({
    key: "expectedQty",
    label: "Expected",
    render: (l) => l.expectedQty,
    width: 110,
  }),
  f.field({
    key: "receivedQty",
    label: "Received",
    render: (l) => l.receivedQty,
    editable: ["edit", "amend"],
    type: { kind: "number", decimals: 0 },
    width: 110,
    // 🎨 Highlight the cell red when received quantity differs from expected.
    className: (l) =>
      l.receivedQty !== l.expectedQty ? "astw:bg-destructive/10 astw:text-destructive" : undefined,
  }),
  f.field({
    key: "condition",
    label: "Condition",
    render: (l) => l.condition,
    editable: ["edit"],
    type: { kind: "select", options: CONDITION_OPTIONS },
    width: 140,
  }),
  f.field({
    key: "lotNumber",
    label: "Lot No",
    render: (l) => l.lotNumber,
    editable: ["edit"],
    type: { kind: "text" },
    width: 140,
  }),
  f.field({
    key: "expiryDate",
    label: "Expiry",
    render: (l) => l.expiryDate,
    editable: ["edit"],
    type: { kind: "date" },
    width: 160,
  }),
];

const GR_CATALOG: ReadonlyArray<{ sku: string; productName: string }> = [
  { sku: "SKU-1001", productName: "Indigo Denim Roll" },
  { sku: "SKU-2040", productName: "Copper Rivet Pack" },
  { sku: "SKU-3300", productName: "Organic Cotton Jersey" },
  { sku: "SKU-4412", productName: "Leather Patch Kit" },
];

const seed = (): GRLine[] => [
  {
    lineRef: "GR1",
    sku: "SKU-1001",
    productName: "Indigo Denim Roll",
    expectedQty: 50,
    receivedQty: 50,
    condition: "OK",
    lotNumber: "L-0612",
    expiryDate: "2027-06-30",
  },
  {
    lineRef: "GR2",
    sku: "SKU-2040",
    productName: "Copper Rivet Pack",
    expectedQty: 100,
    receivedQty: 92,
    condition: "SHORT",
    lotNumber: "L-0613",
    expiryDate: "2028-01-15",
  },
  {
    lineRef: "GR3",
    sku: "SKU-3300",
    productName: "Organic Cotton Jersey",
    expectedQty: 200,
    receivedQty: 200,
    condition: "OK",
    lotNumber: "L-0614",
    expiryDate: "2027-03-10",
  },
  {
    lineRef: "GR4",
    sku: "SKU-4412",
    productName: "Leather Patch Kit",
    expectedQty: 30,
    receivedQty: 28,
    condition: "DAMAGED",
    lotNumber: "L-0615",
    expiryDate: "2026-11-22",
  },
];

/* ======================================================================== */
/* Page                                                                      */
/* ======================================================================== */

export const goodsReceiptDemoResource = defineResource({
  path: "goods-receipt-demo",
  component: GoodsReceiptDemoPage,
  meta: { title: "Goods Receipt (pinned columns)" },
});

export function GoodsReceiptDemoPage() {
  const lineItems = useLineItems<GRLine>({
    fields,
    data: seed(),
    mode: "edit",
    selection: true,
  });

  const handleSave = React.useCallback(() => {
    const cs = lineItems.getChangeSet();
    if (cs.isEmpty) return;
    // eslint-disable-next-line no-console
    console.log("[goods receipt] save", cs);
    lineItems.reset();
  }, [lineItems]);

  return (
    <Layout>
      <Layout.Header
        title="Goods Receipt GR-2026-0314"
        actions={[
          <Button key="discard" variant="secondary" size="sm" onClick={() => lineItems.revert()}>
            Discard
          </Button>,
          <Button key="save" size="sm" onClick={() => void handleSave()}>
            Confirm receipt
          </Button>,
        ]}
      />
      <Layout.Column>
        <LineItems.Root value={lineItems}>
          <Card.Root className="astw:overflow-hidden">
            <Card.Header className="astw:flex astw:flex-row astw:items-center astw:justify-between astw:gap-3 astw:border-b">
              <div className="astw:flex astw:min-w-0 astw:flex-col astw:gap-1">
                <h3 className="astw:leading-none astw:font-semibold">Receipt lines</h3>
                <p className="astw:text-muted-foreground astw:text-sm">
                  {lineItems.allLines.length} lines · scroll horizontally — SKU + Product stay
                  pinned
                </p>
              </div>
              <div className="astw:flex astw:shrink-0 astw:items-center astw:gap-1">
                <LineItems.SearchToggle
                  variant="outline"
                  triggerSizeClassName="astw:size-8"
                  collapsedWidth={32}
                />
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
                maxBodyHeight={420}
                renderFullscreenToggle={false}
                tableContainerClassName="astw:rounded-none astw:border-0"
              />

              <AddReceiptLineRow
                onPick={(picked) => {
                  lineItems.addLine({
                    sku: picked.sku,
                    productName: picked.productName,
                    expectedQty: 0,
                    receivedQty: 0,
                    condition: "OK",
                    lotNumber: "",
                    expiryDate: "",
                  });
                }}
              />
            </Card.Content>
          </Card.Root>

          <LineItems.FloatingDock>
            <LineItems.DirtyBar warnOnNav onSave={() => void handleSave()} />
            <LineItems.SelectionBar<GRLine>>
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
      </Layout.Column>
    </Layout>
  );
}

function AddReceiptLineRow({
  onPick,
}: {
  onPick: (item: { sku: string; productName: string }) => void;
}) {
  const [resetKey, setResetKey] = React.useState(0);
  return (
    <div style={{ margin: 8 }} className="astw:flex astw:items-center astw:gap-1">
      <Combobox<{ sku: string; productName: string }>
        key={resetKey}
        items={GR_CATALOG as Array<{ sku: string; productName: string }>}
        placeholder="+   Add line item — type to search…"
        emptyText="No matching products."
        mapItem={(p) => ({
          key: p.sku,
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
      <Button
        type="button"
        variant="outline"
        onClick={() => alert("Bulk add clicked")}
        style={{ boxShadow: "none" }}
      >
        Bulk add
      </Button>
    </div>
  );
}
