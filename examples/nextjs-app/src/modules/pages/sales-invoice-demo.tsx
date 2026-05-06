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
/* Domain — Sales Invoice                                                    */
/* ======================================================================== */

type InvoiceLine = LineItemsRowData & {
  description: string;
  quantity: number;
  rate: number;
  discountPct: number;
  taxCode: string;
  amount: number;
};

const TAX_CODES: ReadonlyArray<{ value: string; label: string; description?: string }> = [
  { value: "STD", label: "STD", description: "Standard rate" },
  { value: "RED", label: "RED", description: "Reduced 8%" },
  { value: "ZER", label: "ZER", description: "Zero-rated" },
  { value: "EXM", label: "EXM", description: "Exempt" },
];

const TAX_PCT: Record<string, number> = { STD: 0.1, RED: 0.08, ZER: 0, EXM: 0 };

const round2 = (n: number) => Math.round(n * 100) / 100;
const fmt = (n: number) => `$${n.toFixed(2)}`;

const computeAmount = (l: InvoiceLine): number => {
  const subtotal = l.quantity * l.rate;
  const afterDiscount = subtotal * (1 - l.discountPct / 100);
  const taxRate = TAX_PCT[l.taxCode] ?? 0;
  return round2(afterDiscount * (1 + taxRate));
};

/* ======================================================================== */
/* Field schema                                                              */
/* ======================================================================== */

const f = createLineItemHelper<InvoiceLine>();

const fields: LineItemsField<InvoiceLine>[] = [
  f.field({
    key: "description",
    label: "Description",
    render: (l) => l.description,
    editable: ["edit"],
    type: { kind: "text" },
    flex: true,
  }),
  f.field({
    key: "quantity",
    label: "Qty",
    render: (l) => l.quantity,
    editable: ["edit"],
    type: { kind: "number", decimals: 2 },
    width: 100,
  }),
  f.field({
    key: "rate",
    label: "Rate",
    render: (l) => fmt(l.rate),
    editable: ["edit"],
    type: { kind: "number", decimals: 2 },
    width: 120,
  }),
  f.field({
    key: "discountPct",
    label: "Discount %",
    render: (l) => `${l.discountPct}%`,
    editable: ["edit"],
    type: { kind: "number", decimals: 0 },
    width: 120,
  }),
  f.field({
    key: "taxCode",
    label: "Tax",
    render: (l) => l.taxCode,
    editable: ["edit"],
    type: { kind: "select", options: TAX_CODES },
    width: 120,
  }),
  f.field({
    key: "amount",
    label: "Amount",
    render: (l) => fmt(l.amount),
    width: 140,
  }),
];

const SERVICE_CATALOG: ReadonlyArray<{ description: string; rate: number; taxCode: string }> = [
  { description: "Consulting hour", rate: 150, taxCode: "STD" },
  { description: "Premium support — quarterly", rate: 1200, taxCode: "STD" },
  { description: "Training session — half day", rate: 600, taxCode: "RED" },
  { description: "Travel reimbursement", rate: 480, taxCode: "EXM" },
];

const seed = (): InvoiceLine[] => [
  {
    lineRef: "L1",
    description: "Consulting hours — June",
    quantity: 24,
    rate: 150,
    discountPct: 0,
    taxCode: "STD",
    amount: 0,
  },
  {
    lineRef: "L2",
    description: "Premium support — Q2",
    quantity: 1,
    rate: 1200,
    discountPct: 10,
    taxCode: "STD",
    amount: 0,
  },
  {
    lineRef: "L3",
    description: "Travel reimbursement",
    quantity: 1,
    rate: 480,
    discountPct: 0,
    taxCode: "EXM",
    amount: 0,
  },
  {
    lineRef: "L4",
    description: "Training session — half day",
    quantity: 2,
    rate: 600,
    discountPct: 5,
    taxCode: "RED",
    amount: 0,
  },
];

/* ======================================================================== */
/* Page                                                                      */
/* ======================================================================== */

export const salesInvoiceDemoResource = defineResource({
  path: "sales-invoice-demo",
  component: SalesInvoiceDemoPage,
  meta: { title: "Sales Invoice (totals row)" },
});

export function SalesInvoiceDemoPage() {
  const initialLines = React.useMemo(() => {
    const rows = seed();
    return rows.map((r) => ({ ...r, amount: computeAmount(r) }));
  }, []);

  const lineItems = useLineItems<InvoiceLine>({
    fields,
    data: initialLines,
    mode: "edit",
    selection: true,
  });

  // Recompute amount when qty / rate / discount / tax changes.
  const allLines = lineItems.allLines;
  const updateLines = lineItems.updateLines;
  React.useEffect(() => {
    const updates: { lineRef: string; patch: Partial<InvoiceLine> }[] = [];
    for (const l of allLines) {
      const expected = computeAmount(l);
      if (expected !== l.amount) updates.push({ lineRef: l.lineRef, patch: { amount: expected } });
    }
    if (updates.length) updateLines(updates);
  }, [allLines, updateLines]);

  const handleSave = React.useCallback(() => {
    const cs = lineItems.getChangeSet();
    if (cs.isEmpty) return;
    // eslint-disable-next-line no-console
    console.log("[sales invoice] save", cs);
    lineItems.reset();
  }, [lineItems]);

  return (
    <Layout>
      <Layout.Header
        title="Invoice INV-2026-0142"
        actions={[
          <Button key="discard" variant="secondary" size="sm" onClick={() => lineItems.revert()}>
            Discard
          </Button>,
          <Button key="save" size="sm" onClick={() => void handleSave()}>
            Save changes
          </Button>,
        ]}
      />
      <Layout.Column>
        <LineItems.Root value={lineItems}>
          <Card.Root className="astw:overflow-hidden">
            <Card.Header className="astw:flex astw:flex-row astw:items-center astw:justify-between astw:gap-3 astw:border-b">
              <div className="astw:flex astw:min-w-0 astw:flex-col astw:gap-1">
                <h3 className="astw:leading-none astw:font-semibold">Invoice lines</h3>
                <p className="astw:text-muted-foreground astw:text-sm">
                  {lineItems.allLines.length} lines ·{" "}
                  {lineItems.isDirty ? "Unsaved changes" : "All saved"}
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

              <AddInvoiceLineRow
                onPick={(picked) => {
                  const line: Partial<InvoiceLine> = {
                    description: picked.description,
                    quantity: 1,
                    rate: picked.rate,
                    discountPct: 0,
                    taxCode: picked.taxCode,
                    amount: 0,
                  };
                  lineItems.addLine(line);
                }}
              />
            </Card.Content>
          </Card.Root>

          <LineItems.FloatingDock>
            <LineItems.DirtyBar warnOnNav onSave={() => void handleSave()} />
            <LineItems.SelectionBar<InvoiceLine>>
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

          {/* ✅ Reusable Pattern: a sticky totals row, fed by the live row state. */}
          <LineItems.TotalsRow<InvoiceLine>>
            {(lines) => {
              const totalQty = round2(lines.reduce((s, l) => s + Number(l.quantity), 0));
              const totalAmt = round2(lines.reduce((s, l) => s + Number(l.amount), 0));
              return {
                description: <span className="astw:text-muted-foreground">Total</span>,
                quantity: totalQty,
                amount: <strong>{fmt(totalAmt)}</strong>,
              };
            }}
          </LineItems.TotalsRow>
        </LineItems.Root>
      </Layout.Column>
    </Layout>
  );
}

/* ======================================================================== */
/* Bottom add-line picker                                                    */
/* ======================================================================== */

function AddInvoiceLineRow({
  onPick,
}: {
  onPick: (item: { description: string; rate: number; taxCode: string }) => void;
}) {
  const [resetKey, setResetKey] = React.useState(0);
  return (
    <div style={{ margin: 8 }} className="astw:flex astw:items-center astw:gap-1">
      <Combobox<{ description: string; rate: number; taxCode: string }>
        key={resetKey}
        items={SERVICE_CATALOG as Array<{ description: string; rate: number; taxCode: string }>}
        placeholder="+   Add line item — type to search…"
        emptyText="No matching services."
        mapItem={(p) => ({
          key: p.description,
          label: `${p.description} ${p.rate}`,
          render: (
            <div className="astw:flex astw:flex-col astw:gap-0.5">
              <span className="astw:text-sm astw:font-medium">{p.description}</span>
              <span className="astw:text-muted-foreground astw:text-xs">{`$${p.rate} · ${p.taxCode}`}</span>
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
