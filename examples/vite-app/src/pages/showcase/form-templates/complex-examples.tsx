import * as React from "react";
import {
  Badge,
  Button,
  Card,
  Checkbox,
  Combobox,
  DataTable,
  DatePicker,
  Field,
  Fieldset,
  Form,
  FormLayout,
  Grid,
  Select,
  Tabs,
  Text,
  Textarea,
  aggregations,
  createColumnHelper,
  CellEditError,
  useDataTable,
  useResolvedLocale,
} from "@tailor-platform/app-shell";
import {
  BUYERS,
  CARRIERS,
  COUNTRIES,
  CURRENCIES,
  DeliveryFields,
  PAYMENT_TERMS,
  SUPPLIERS,
  SupplierFields,
  WAREHOUSES,
} from "./fields";
import { InPlaceExamples } from "./in-place-examples";

// Complex examples: how far FormLayout stretches before you need anything
// custom. Each one is self-contained so it can be lifted into a real page.

// ✅ Reusable Component: Can be moved to components/ui/
function ExampleHeader({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <Text.h2 variant="heading-md">
        <span className="text-muted-foreground mr-2">{id}</span>
        {title}
      </Text.h2>
      <Text variant="body-md" className="text-muted-foreground max-w-3xl">
        {children}
      </Text>
    </div>
  );
}

// 🔽 Reusable address block — a nested FormLayout reflows inside whatever span it gets
function AddressFields({ prefix }: { prefix: string }) {
  return (
    <FormLayout columns={2}>
      <Field.Root name={`${prefix}.street`} span="full">
        <Field.Label required>Street</Field.Label>
        <Field.Control required placeholder="1-2-3 Umeda" />
      </Field.Root>
      <Field.Root name={`${prefix}.city`}>
        <Field.Label required>City</Field.Label>
        <Field.Control required placeholder="Osaka" />
      </Field.Root>
      <Field.Root name={`${prefix}.postcode`}>
        <Field.Label>Postcode</Field.Label>
        <Field.Control placeholder="530-0001" />
      </Field.Root>
      <Field.Root name={`${prefix}.country`} span="full">
        <Field.Label required>Country</Field.Label>
        <Select items={COUNTRIES} defaultValue="Japan" required />
      </Field.Root>
    </FormLayout>
  );
}

// ============================================================================
// E1 — Width playground
// ============================================================================

const WIDTHS = [
  { value: "360", label: "360px", note: "Phone or narrow sheet → 1 column" },
  { value: "560", label: "560px", note: "Dialog md → 2 columns" },
  { value: "760", label: "760px", note: "Dialog lg / sheet lg → 3 columns" },
  { value: "1040", label: "1040px", note: "Page → 4 columns" },
];

function WidthPlayground() {
  const [width, setWidth] = React.useState("760");
  return (
    <div className="flex flex-col gap-4">
      <ExampleHeader id="E1" title="Width playground">
        One field set with <code>columns=&#123;4&#125;</code> and mixed spans. Pick a container
        width and watch it reflow — the grid reads its container, not the window.
      </ExampleHeader>
      <Tabs.Root value={width} onValueChange={(value) => setWidth(String(value))}>
        <Tabs.List>
          {WIDTHS.map((option) => (
            <Tabs.Tab key={option.value} value={option.value}>
              {option.label}
            </Tabs.Tab>
          ))}
        </Tabs.List>
      </Tabs.Root>
      <Text variant="body-md" className="text-muted-foreground">
        {WIDTHS.find((option) => option.value === width)?.note}
      </Text>
      <div
        className="rounded-xl border border-dashed p-4 transition-[max-width] duration-300"
        style={{ maxWidth: Number(width) }}
      >
        <Form>
          <FormLayout columns={4}>
            <Field.Root name="name" span={2}>
              <Field.Label required>Product name · span 2</Field.Label>
              <Field.Control placeholder="Cotton Wreath Hoodie" />
            </Field.Root>
            <Field.Root name="sku">
              <Field.Label required>SKU</Field.Label>
              <Field.Control placeholder="DT-HD-BLK" />
            </Field.Root>
            <Field.Root name="status">
              <Field.Label>Status</Field.Label>
              <Select items={["Draft", "Active", "Discontinued"]} defaultValue="Draft" />
            </Field.Root>
            <Field.Root name="supplier" span={3}>
              <Field.Label>Supplier · span 3</Field.Label>
              <Combobox items={SUPPLIERS} placeholder="Search suppliers" />
            </Field.Root>
            <Field.Root name="currency">
              <Field.Label>Currency</Field.Label>
              <Select items={CURRENCIES} defaultValue="USD" />
            </Field.Root>
            <Field.Root name="cost">
              <Field.Label>Unit cost</Field.Label>
              <Field.Control type="number" placeholder="38.50" />
            </Field.Root>
            <Field.Root name="price">
              <Field.Label>Retail price</Field.Label>
              <Field.Control type="number" placeholder="120.00" />
            </Field.Root>
            <Field.Root name="moq">
              <Field.Label>MOQ</Field.Label>
              <Field.Control type="number" placeholder="50" />
            </Field.Root>
            <Field.Root name="leadTime">
              <Field.Label>Lead time (days)</Field.Label>
              <Field.Control type="number" placeholder="45" />
            </Field.Root>
            <Field.Root name="notes" span="full">
              <Field.Label>Notes · span full</Field.Label>
              <Textarea rows={2} />
            </Field.Root>
          </FormLayout>
        </Form>
      </div>
    </div>
  );
}

// ============================================================================
// E2 — Dense master record: per-section columns + nested groups
// ============================================================================

function DenseItemMaster() {
  return (
    <div className="flex flex-col gap-4">
      <ExampleHeader id="E2" title="Dense master record (26 fields)">
        Each section picks its own column count. Billing and shipping are two{" "}
        <code>Fieldset.Root span=&#123;2&#125;</code> groups side by side, each holding a nested
        FormLayout that reflows inside its half.
      </ExampleHeader>
      <Form>
        <FormLayout columns={4}>
          <FormLayout.Section
            title="Identity"
            description="How the supplier is named and referenced."
          >
            <Field.Root name="legalName" span={2}>
              <Field.Label required>Legal name</Field.Label>
              <Field.Control required placeholder="Kansai Textile Co., Ltd." />
            </Field.Root>
            <Field.Root name="tradingName">
              <Field.Label>Trading name</Field.Label>
              <Field.Control placeholder="Kansai Textile" />
            </Field.Root>
            <Field.Root name="code">
              <Field.Label required>Supplier code</Field.Label>
              <Field.Control required placeholder="SUP-0042" />
            </Field.Root>
            <Field.Root name="taxId">
              <Field.Label>Tax ID</Field.Label>
              <Field.Control placeholder="T1234567890123" />
            </Field.Root>
            <Field.Root name="category">
              <Field.Label>Category</Field.Label>
              <Select
                items={["Fabric", "Trims", "Packaging", "Finished goods"]}
                placeholder="Select"
              />
            </Field.Root>
            <Field.Root name="owner">
              <Field.Label>Account owner</Field.Label>
              <Combobox items={BUYERS} placeholder="Search people" />
            </Field.Root>
            <Field.Root name="since">
              <Field.Label>Supplier since</Field.Label>
              <DatePicker />
            </Field.Root>
          </FormLayout.Section>

          {/* 🔽 Narrow numeric fields: four across, even on a medium page */}
          <FormLayout.Section title="Terms">
            <Field.Root name="currency">
              <Field.Label required>Currency</Field.Label>
              <Select items={CURRENCIES} defaultValue="JPY" required />
            </Field.Root>
            <Field.Root name="paymentTerms">
              <Field.Label>Payment terms</Field.Label>
              <Select items={PAYMENT_TERMS} defaultValue="Net 30" />
            </Field.Root>
            <Field.Root name="creditLimit">
              <Field.Label>Credit limit</Field.Label>
              <Field.Control type="number" placeholder="5,000,000" />
            </Field.Root>
            <Field.Root name="discount">
              <Field.Label>Early-pay discount %</Field.Label>
              <Field.Control type="number" placeholder="2" />
            </Field.Root>
            <Field.Root name="leadTime">
              <Field.Label>Default lead time</Field.Label>
              <Field.Control type="number" placeholder="30 days" />
            </Field.Root>
            <Field.Root name="moq">
              <Field.Label>Minimum order</Field.Label>
              <Field.Control type="number" placeholder="100" />
            </Field.Root>
            <Field.Root name="carrier">
              <Field.Label>Preferred carrier</Field.Label>
              <Combobox items={CARRIERS} placeholder="Search carriers" />
            </Field.Root>
            <Field.Root name="warehouse">
              <Field.Label>Receiving warehouse</Field.Label>
              <Select items={WAREHOUSES} placeholder="Select" />
            </Field.Root>
          </FormLayout.Section>

          {/* 🔽 Two address groups side by side, each a nested two-column layout */}
          <FormLayout.Section title="Addresses">
            <Fieldset.Root span={2} className="flex flex-col gap-3">
              <Fieldset.Legend>Billing address</Fieldset.Legend>
              <AddressFields prefix="billing" />
            </Fieldset.Root>
            <Fieldset.Root span={2} className="flex flex-col gap-3">
              <Fieldset.Legend>Shipping address</Fieldset.Legend>
              <AddressFields prefix="shipping" />
            </Fieldset.Root>
          </FormLayout.Section>

          {/* 🔽 Long text gets fewer, wider columns */}
          <FormLayout.Section title="Notes" columns={2}>
            <Field.Root name="qualityNotes">
              <Field.Label>Quality notes</Field.Label>
              <Textarea rows={3} />
            </Field.Root>
            <Field.Root name="internalNotes">
              <Field.Label>Internal notes</Field.Label>
              <Textarea rows={3} />
            </Field.Root>
          </FormLayout.Section>
        </FormLayout>
      </Form>
    </div>
  );
}

// ============================================================================
// E3 — Conditional fields, header actions, locked section
// ============================================================================

function ConditionalFields() {
  const [dropShip, setDropShip] = React.useState(false);
  const [rush, setRush] = React.useState(false);
  return (
    <div className="flex flex-col gap-4">
      <ExampleHeader id="E3" title="Conditional fields and locked sections">
        Fields appear and disappear without the layout jumping: a checkbox reveals a nested address
        group, a section has a header action, and a confirmed section is disabled as a whole.
      </ExampleHeader>
      <Form>
        <FormLayout columns={3}>
          <FormLayout.Section
            title="Shipping"
            action={
              <Button variant="outline" size="sm" type="button">
                Copy from supplier
              </Button>
            }
          >
            <Field.Root name="shipTo">
              <Field.Label required>Ship to</Field.Label>
              <Select items={WAREHOUSES} placeholder="Select warehouse" required />
            </Field.Root>
            <Field.Root name="carrier">
              <Field.Label>Carrier</Field.Label>
              <Combobox items={CARRIERS} placeholder="Search carriers" />
            </Field.Root>
            <Field.Root name="eta">
              <Field.Label>Expected delivery</Field.Label>
              <DatePicker />
            </Field.Root>
            <Field.Root name="dropShip" span="full">
              <Checkbox
                label="Ship directly to the customer (drop ship)"
                checked={dropShip}
                onCheckedChange={(checked) => setDropShip(checked === true)}
              />
            </Field.Root>
            {dropShip && (
              <FormLayout.Item span="full">
                <AddressFields prefix="dropShip" />
              </FormLayout.Item>
            )}
            <Field.Root name="rush" span="full">
              <Checkbox
                label="Rush order"
                checked={rush}
                onCheckedChange={(checked) => setRush(checked === true)}
              />
            </Field.Root>
            {rush && (
              <>
                <Field.Root name="rushReason" span={2}>
                  <Field.Label required>Reason for rush</Field.Label>
                  <Field.Control required placeholder="Launch on 12 Nov" />
                </Field.Root>
                <Field.Root name="rushFee">
                  <Field.Label>Rush fee</Field.Label>
                  <Field.Control type="number" placeholder="15,000" />
                </Field.Root>
              </>
            )}
          </FormLayout.Section>

          <FormLayout.Section
            title="Approval"
            description="Locked once the PO is confirmed."
            action={<Badge variant="subtle-success">Confirmed</Badge>}
            disabled
          >
            <Field.Root name="approver">
              <Field.Label>Approved by</Field.Label>
              <Combobox items={BUYERS} defaultValue="Kenji Mori" />
            </Field.Root>
            <Field.Root name="approvedOn">
              <Field.Label>Approved on</Field.Label>
              <Field.Control defaultValue="2026-10-28" />
            </Field.Root>
            <Field.Root name="budget">
              <Field.Label>Budget line</Field.Label>
              <Field.Control defaultValue="FW26-MERCH-04" />
            </Field.Root>
          </FormLayout.Section>
        </FormLayout>
      </Form>
    </div>
  );
}

// ============================================================================
// E4 — Form beside a sticky summary
// ============================================================================

function FormWithSummary() {
  return (
    <div className="flex flex-col gap-4">
      <ExampleHeader id="E4" title="Form beside a sticky summary">
        A <code>Grid</code> puts the form next to a 320px summary on wide screens and stacks them on
        narrow ones. The form&apos;s own columns adapt to whatever width is left.
      </ExampleHeader>
      <Grid columns={{ initial: 1, lg: "minmax(0, 1fr) 320px" }} gap={4}>
        <Form>
          <FormLayout columns={3}>
            <FormLayout.Section title="Supplier">
              <SupplierFields />
            </FormLayout.Section>
            <FormLayout.Section title="Delivery">
              <DeliveryFields />
            </FormLayout.Section>
          </FormLayout>
        </Form>
        {/* 🔽 Summary panel */}
        <Card.Root className="lg:sticky lg:top-4 self-start">
          <Card.Header title="Summary" description="Updates as you fill the form." />
          <Card.Content>
            {/* 🧪 Dummy Data: Replace with real data later */}
            <dl className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-2 text-body-md">
              <dt className="text-muted-foreground">Lines</dt>
              <dd className="tabular-nums">3</dd>
              <dt className="text-muted-foreground">Units</dt>
              <dd className="tabular-nums">276</dd>
              <dt className="text-muted-foreground">Subtotal</dt>
              <dd className="tabular-nums">$11,556.00</dd>
              <dt className="text-muted-foreground">Freight (est.)</dt>
              <dd className="tabular-nums">$420.00</dd>
              <dt className="font-semibold">Total</dt>
              <dd className="font-semibold tabular-nums">$11,976.00</dd>
            </dl>
          </Card.Content>
        </Card.Root>
      </Grid>
    </div>
  );
}

// ============================================================================
// E5 — Document with editable line items (DataTable inline editing)
// ============================================================================

type Line = {
  id: string;
  item: string | null;
  quantity: number | null;
  unitPrice: number | null;
  discount: number | null;
};

// 🧪 Dummy Data: Replace with real data later
const ITEM_OPTIONS = [
  { value: "DT-HD-BLK-M", label: "Cotton Wreath Hoodie — Black / M" },
  { value: "DT-HD-BLK-L", label: "Cotton Wreath Hoodie — Black / L" },
  { value: "DT-JN-IND-32", label: "Selvedge Jean — Indigo / 32" },
  { value: "DT-TS-WHT-M", label: "Heavyweight Tee — White / M" },
];
// 🧪 Dummy Data: Replace with real data later
const INITIAL_LINES: Line[] = [
  { id: "1", item: "DT-HD-BLK-M", quantity: 120, unitPrice: 38.5, discount: 0 },
  { id: "2", item: "DT-HD-BLK-L", quantity: 96, unitPrice: 38.5, discount: 5 },
  { id: "3", item: "DT-JN-IND-32", quantity: 60, unitPrice: 54, discount: 0 },
];

const lineAmount = (line: Line) =>
  (line.quantity ?? 0) * (line.unitPrice ?? 0) * (1 - (line.discount ?? 0) / 100);

const { column } = createColumnHelper<Line>();

function DocumentWithLineItems() {
  // Same locale as the table's money cells, so totals and cells read alike.
  const { locale } = useResolvedLocale();
  const money = (n: number) =>
    new Intl.NumberFormat(locale, { style: "currency", currency: "USD" }).format(n);
  const [lines, setLines] = React.useState(INITIAL_LINES);
  const nextId = React.useRef(INITIAL_LINES.length + 1);
  const patch = (id: string, change: Partial<Line>) =>
    setLines((current) => current.map((line) => (line.id === id ? { ...line, ...change } : line)));

  const table = useDataTable({
    data: { rows: lines },
    columns: [
      column({
        id: "item",
        label: "Item",
        type: "text",
        footer: "Total",
        edit: {
          options: ITEM_OPTIONS,
          onValueCommitted: (row, value) => {
            if (value === null) throw new CellEditError("Choose an item");
            patch(row.id, { item: value });
          },
        },
      }),
      column({
        id: "quantity",
        label: "Quantity",
        type: "number",
        width: 120,
        typeOptions: { maxDecimals: 0 },
        footer: aggregations.sum((row) => row.quantity),
        edit: {
          onValueCommitted: (row, value) => {
            if (value === null || !Number.isInteger(value) || value <= 0) {
              throw new CellEditError("Enter a whole number above 0");
            }
            patch(row.id, { quantity: value });
          },
        },
      }),
      column({
        id: "unitPrice",
        label: "Unit price",
        type: "money",
        width: 130,
        typeOptions: { currency: "USD" },
        edit: {
          onValueCommitted: (row, value) => {
            if (value === null || value < 0) throw new CellEditError("Enter a price of 0 or more");
            patch(row.id, { unitPrice: value });
          },
        },
      }),
      column({
        id: "discount",
        label: "Discount %",
        type: "number",
        width: 120,
        edit: {
          onValueCommitted: (row, value) => {
            if (value !== null && (value < 0 || value > 100)) {
              throw new CellEditError("Enter 0–100");
            }
            patch(row.id, { discount: value });
          },
        },
      }),
      column({
        id: "amount",
        label: "Amount",
        type: "money",
        width: 140,
        accessor: lineAmount,
        typeOptions: { currency: "USD" },
        footer: aggregations.sum(lineAmount, (total) => money(total ?? 0)),
      }),
    ],
  });

  const subtotal = lines.reduce((sum, line) => sum + lineAmount(line), 0);
  const tax = subtotal * 0.1;

  return (
    <div className="flex flex-col gap-4">
      <ExampleHeader id="E5" title="Document with editable line items">
        Header fields four across, then a <code>DataTable</code> with inline-editable cells, footer
        totals and an add-line action in the section header. Click a quantity, price or item to edit
        it; totals update as you confirm.
      </ExampleHeader>
      <Form>
        <FormLayout columns={4}>
          <FormLayout.Section title="Order">
            <SupplierFields />
            <DeliveryFields withInstructions={false} />
          </FormLayout.Section>

          <FormLayout.Section
            title="Lines"
            description={`${lines.length} lines · click a cell to edit`}
            action={
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setLines((current) => [
                    ...current,
                    {
                      id: String(nextId.current++),
                      item: null,
                      quantity: 1,
                      unitPrice: 0,
                      discount: 0,
                    },
                  ])
                }
              >
                Add line
              </Button>
            }
          >
            <FormLayout.Item span="full">
              <DataTable.Root value={table}>
                <DataTable.Table />
              </DataTable.Root>
            </FormLayout.Item>

            {/* 🔽 Totals block, right-aligned under the table */}
            <FormLayout.Item span="full" className="flex justify-end">
              <dl className="grid w-64 grid-cols-[1fr_auto] gap-x-6 gap-y-1 text-body-md">
                <dt className="text-muted-foreground">Subtotal</dt>
                <dd className="tabular-nums" style={{ textAlign: "right" }}>
                  {money(subtotal)}
                </dd>
                <dt className="text-muted-foreground">Tax (10%)</dt>
                <dd className="tabular-nums" style={{ textAlign: "right" }}>
                  {money(tax)}
                </dd>
                <dt className="font-semibold">Total</dt>
                <dd className="font-semibold tabular-nums" style={{ textAlign: "right" }}>
                  {money(subtotal + tax)}
                </dd>
              </dl>
            </FormLayout.Item>
          </FormLayout.Section>

          <FormLayout.Actions
            sticky
            start={
              <Text variant="body-md" className="text-muted-foreground">
                Draft · {lines.length} lines
              </Text>
            }
          >
            <Button type="button" variant="outline">
              Save draft
            </Button>
            <Button type="submit">Submit for approval</Button>
          </FormLayout.Actions>
        </FormLayout>
      </Form>
    </div>
  );
}

// ============================================================================

export function ComplexExamples() {
  return (
    <div className="flex flex-col gap-12">
      <WidthPlayground />
      <DenseItemMaster />
      <ConditionalFields />
      <FormWithSummary />
      <DocumentWithLineItems />
      <InPlaceExamples />
    </div>
  );
}
