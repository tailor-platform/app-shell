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
/* Domain — Stock Transfer                                                   */
/* ======================================================================== */

type TransferLine = LineItemsRowData & {
  sku: string;
  productName: string;
  fromWarehouse: string;
  toWarehouse: string;
  quantity: number;
  lotNumber: string;
};

const WAREHOUSES = [
  { value: "WH-NYC", label: "WH-NYC", description: "New York" },
  { value: "WH-LAX", label: "WH-LAX", description: "Los Angeles" },
  { value: "WH-CHI", label: "WH-CHI", description: "Chicago" },
  { value: "WH-DAL", label: "WH-DAL", description: "Dallas" },
];

/* ======================================================================== */
/* Field schema                                                              */
/* ======================================================================== */

const f = createLineItemHelper<TransferLine>();

const fields: LineItemsField<TransferLine>[] = [
  f.field({
    key: "sku",
    label: "SKU",
    render: (l) => l.sku,
    editable: ["edit"],
    type: { kind: "text" },
    width: 160,
  }),
  f.field({
    key: "productName",
    label: "Product",
    render: (l) => l.productName,
    editable: ["edit"],
    type: { kind: "text" },
    flex: true,
  }),
  f.field({
    key: "fromWarehouse",
    label: "From",
    render: (l) => l.fromWarehouse,
    editable: ["edit"],
    type: { kind: "select", options: WAREHOUSES },
    width: 140,
  }),
  f.field({
    key: "toWarehouse",
    label: "To",
    render: (l) => l.toWarehouse,
    editable: ["edit"],
    type: { kind: "select", options: WAREHOUSES },
    width: 140,
    // 🎨 Highlight when from === to (cross-field validation hint).
    className: (l) =>
      l.fromWarehouse && l.fromWarehouse === l.toWarehouse
        ? "astw:bg-destructive/10 astw:text-destructive"
        : undefined,
  }),
  f.field({
    key: "quantity",
    label: "Qty",
    render: (l) => l.quantity,
    editable: ["edit"],
    type: { kind: "number", decimals: 0 },
    width: 100,
  }),
  f.field({
    key: "lotNumber",
    label: "Lot No",
    render: (l) => l.lotNumber,
    editable: ["edit"],
    type: { kind: "text" },
    width: 140,
  }),
];

const ST_CATALOG: ReadonlyArray<{ sku: string; productName: string }> = [
  { sku: "SKU-1001", productName: "Indigo Denim Roll" },
  { sku: "SKU-2040", productName: "Copper Rivet Pack" },
  { sku: "SKU-3300", productName: "Organic Cotton Jersey" },
  { sku: "SKU-4412", productName: "Leather Patch Kit" },
];

const seed = (): TransferLine[] => [
  { lineRef: "T1", sku: "SKU-1001", productName: "Indigo Denim Roll",     fromWarehouse: "WH-NYC", toWarehouse: "WH-LAX", quantity: 20, lotNumber: "L-0701" },
  { lineRef: "T2", sku: "SKU-2040", productName: "Copper Rivet Pack",     fromWarehouse: "WH-NYC", toWarehouse: "WH-CHI", quantity: 50, lotNumber: "L-0702" },
  { lineRef: "T3", sku: "SKU-3300", productName: "Organic Cotton Jersey", fromWarehouse: "WH-DAL", toWarehouse: "WH-LAX", quantity: 80, lotNumber: "L-0703" },
];

/* ======================================================================== */
/* Page                                                                      */
/* ======================================================================== */

export const stockTransferDemoResource = defineResource({
  path: "stock-transfer-demo",
  component: StockTransferDemoPage,
  meta: { title: "Stock Transfer (row actions)" },
});

export function StockTransferDemoPage() {
  const lineItems = useLineItems<TransferLine>({
    fields,
    data: seed(),
    mode: "edit",
    selection: true,
  });

  const [errors, setErrors] = React.useState<string[]>([]);

  const handleSave = React.useCallback(() => {
    // Cross-field validation at submit: from must differ from to.
    const offending = lineItems.allLines.filter((l) => l.fromWarehouse === l.toWarehouse);
    if (offending.length) {
      setErrors(offending.map((l) => `${l.sku}: From / To warehouse must differ.`));
      return;
    }
    setErrors([]);
    const cs = lineItems.getChangeSet();
    if (cs.isEmpty) return;
    // eslint-disable-next-line no-console
    console.log("[stock transfer] save", cs);
    lineItems.reset();
  }, [lineItems]);

  return (
    <Layout>
      <Layout.Header
        title="Stock Transfer ST-2026-0099"
        actions={[
          <Button key="discard" variant="secondary" size="sm" onClick={() => lineItems.revert()}>
            Discard
          </Button>,
          <Button key="save" size="sm" onClick={() => void handleSave()}>
            Submit transfer
          </Button>,
        ]}
      />
      <Layout.Column>
        {errors.length ? (
          <Card.Root className="astw:border-destructive">
            <Card.Content className="astw:py-3">
              <p className="astw:text-destructive astw:text-sm astw:font-medium">
                {errors.length} validation error{errors.length === 1 ? "" : "s"}
              </p>
              <ul className="astw:text-muted-foreground astw:mt-1 astw:list-disc astw:pl-5 astw:text-xs">
                {errors.map((e) => (
                  <li key={e}>{e}</li>
                ))}
              </ul>
            </Card.Content>
          </Card.Root>
        ) : null}

        <LineItems.Root value={lineItems}>
          <Card.Root className="astw:overflow-hidden">
            <Card.Header className="astw:flex astw:flex-row astw:items-center astw:justify-between astw:gap-3 astw:border-b">
              <div className="astw:flex astw:min-w-0 astw:flex-col astw:gap-1">
                <h3 className="astw:leading-none astw:font-semibold">Transfer lines</h3>
                <p className="astw:text-muted-foreground astw:text-sm">
                  {lineItems.allLines.length} lines · trailing actions stay visible while you scroll
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
                rowActions={(line) => (
                  <>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="astw:size-7"
                      style={{ boxShadow: "none" }}
                      onClick={() => alert(`View movement history for ${line.sku}`)}
                      aria-label="View movement history"
                    >
                      ↗
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="astw:size-7 astw:text-destructive"
                      style={{ boxShadow: "none" }}
                      onClick={() => lineItems.removeLine(line.lineRef)}
                      aria-label="Remove line"
                    >
                      ×
                    </Button>
                  </>
                )}
              />

              <AddTransferLineRow
                onPick={(picked) => {
                  lineItems.addLine({
                    sku: picked.sku,
                    productName: picked.productName,
                    fromWarehouse: WAREHOUSES[0]!.value,
                    toWarehouse: WAREHOUSES[1]!.value,
                    quantity: 1,
                    lotNumber: "",
                  });
                }}
              />
            </Card.Content>
          </Card.Root>

          <LineItems.FloatingDock>
            <LineItems.DirtyBar warnOnNav onSave={() => void handleSave()} />
            <LineItems.SelectionBar<TransferLine>>
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

function AddTransferLineRow({
  onPick,
}: {
  onPick: (item: { sku: string; productName: string }) => void;
}) {
  const [resetKey, setResetKey] = React.useState(0);
  return (
    <div style={{ margin: 8 }} className="astw:flex astw:items-center astw:gap-1">
      <Combobox<{ sku: string; productName: string }>
        key={resetKey}
        items={ST_CATALOG as Array<{ sku: string; productName: string }>}
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
