import * as React from "react";
import {
  Badge,
  Checkbox,
  Combobox,
  DatePicker,
  EditableCard,
  Grid,
  Input,
  Select,
  Table,
  Text,
  Textarea,
  parseDate,
  useResolvedLocale,
  type CalendarDate,
} from "@tailor-platform/app-shell";
import { BUYERS, PAYMENT_TERMS, WAREHOUSES } from "./fields";

// In-place editing examples (E6–E8) built on EditableCard: view and edit share
// one card and one field list, so fields keep their exact position when Edit
// is pressed.

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

// Measures every cell's top-left corner before and after a mode switch and
// reports the largest move — the proof that nothing shifts.
function useShiftMeter(container: React.RefObject<HTMLElement | null>, mode: unknown) {
  const previous = React.useRef<Map<string, { x: number; y: number }> | null>(null);
  const [shift, setShift] = React.useState<number | null>(null);

  React.useLayoutEffect(() => {
    const root = container.current;
    if (!root) return;
    const origin = root.getBoundingClientRect();
    const next = new Map<string, { x: number; y: number }>();
    root.querySelectorAll<HTMLElement>("[data-editable-card-field]").forEach((cell, index) => {
      const rect = cell.getBoundingClientRect();
      // Both modes render the same cells in the same order
      next.set(String(index), {
        x: rect.left - origin.left,
        y: rect.top - origin.top,
      });
    });
    if (previous.current) {
      let max = 0;
      for (const [key, point] of next) {
        const before = previous.current.get(key);
        if (before) max = Math.max(max, Math.abs(before.x - point.x), Math.abs(before.y - point.y));
      }
      setShift(Math.round(max));
    }
    previous.current = next;
  }, [container, mode]);

  return shift;
}

// ============================================================================
// E6 — Purchase order header, edited in place
// ============================================================================

// 🧪 Dummy Data: Replace with real data later
const PO_HEADER = {
  number: "PO-2026-0142",
  status: "Confirmed",
  supplier: "Kansai Textile Co.",
  orderDate: "2026-11-04",
  paymentTerms: "Net 30",
  shipTo: "Osaka DC",
  buyer: "Hanna Suzuki",
  total: 12526.2,
  budgetCode: "MER-FW26-004",
  createdBy: "Priya Nair",
  updatedAt: "3 Nov 2026, 16:40",
  notes: "Deliver to dock 3. Call the receiving desk 30 minutes before arrival.",
};

// The named fields' values, as `onSave` receives them (a date as "YYYY-MM-DD")
type PurchaseOrderValues = {
  orderDate: string;
  paymentTerms: string;
  shipTo: string;
  buyer: string | null;
  notes: string;
};

const TERM_DAYS: Record<string, number> = {
  "Net 15": 15,
  "Net 30": 30,
  "Net 60": 60,
  "Due on receipt": 0,
};

function PurchaseOrderHeaderCard() {
  const { locale } = useResolvedLocale();
  const [record, setRecord] = React.useState(PO_HEADER);
  const [editing, setEditing] = React.useState(false);
  const [showGuides, setShowGuides] = React.useState(false);
  // Values the calculated fields depend on are controlled, so they update live
  const [orderDate, setOrderDate] = React.useState<CalendarDate | null>(
    parseDate(PO_HEADER.orderDate),
  );
  const [terms, setTerms] = React.useState(PO_HEADER.paymentTerms);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const shift = useShiftMeter(containerRef, editing);

  const formatDate = (date: CalendarDate | null) =>
    date
      ? new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(date.toDate("UTC"))
      : "—";
  const money = new Intl.NumberFormat(locale, { style: "currency", currency: "USD" });

  const shownDate = editing ? orderDate : parseDate(record.orderDate);
  const shownTerms = editing ? terms : record.paymentTerms;
  const dueDate = shownDate ? shownDate.add({ days: TERM_DAYS[shownTerms ?? ""] ?? 0 }) : null;

  const startEditing = () => {
    setOrderDate(parseDate(record.orderDate));
    setTerms(record.paymentTerms);
    setEditing(true);
  };

  return (
    <div className="flex flex-col gap-3">
      {/* 🔽 Demo controls */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
        <Checkbox
          label="Show cell outlines"
          checked={showGuides}
          onCheckedChange={(checked) => setShowGuides(checked === true)}
        />
        {shift != null && (
          <Badge variant={shift === 0 ? "subtle-success" : "subtle-warning"}>
            Last switch moved fields by {shift}px
          </Badge>
        )}
      </div>

      <div
        ref={containerRef}
        className={
          showGuides
            ? "[&_[data-editable-card-field]]:outline-1 [&_[data-editable-card-field]]:outline-offset-2 [&_[data-editable-card-field]]:outline-ring [&_[data-editable-card-field]]:outline-dashed"
            : undefined
        }
      >
        <EditableCard<PurchaseOrderValues>
          title="Order details"
          columns={3}
          editing={editing}
          onEditingChange={(next) => (next ? startEditing() : setEditing(false))}
          onSave={(values) => {
            setRecord((current) => ({
              ...current,
              shipTo: values.shipTo,
              buyer: values.buyer ?? current.buyer,
              notes: values.notes,
              orderDate: values.orderDate || current.orderDate,
              paymentTerms: values.paymentTerms,
            }));
          }}
        >
          {/* Row 1 — set by the system or frozen by the order's state */}
          <EditableCard.Field
            label="PO number"
            value={record.number}
            readOnly={{
              kind: "system",
              reason: "Assigned automatically when the order is created.",
            }}
          />
          <EditableCard.Field
            label="Status"
            value={<Badge variant="outline-info">{record.status}</Badge>}
            readOnly={{
              kind: "system",
              reason: "Changes as the order moves through approval, receiving and billing.",
            }}
          />
          <EditableCard.Field
            label="Supplier"
            value={record.supplier}
            readOnly={{
              kind: "locked",
              reason: "Can't change after the order is confirmed. Cancel and re-create it instead.",
            }}
          />

          {/* Row 2 — editable values and one calculated from them */}
          <EditableCard.Field
            name="orderDate"
            label="Order date"
            required
            value={formatDate(parseDate(record.orderDate))}
          >
            <DatePicker value={orderDate} onChange={setOrderDate} isRequired />
          </EditableCard.Field>
          <EditableCard.Field name="paymentTerms" label="Payment terms" value={record.paymentTerms}>
            <Select
              items={PAYMENT_TERMS}
              value={terms}
              onValueChange={(value) => setTerms(value ?? PO_HEADER.paymentTerms)}
            />
          </EditableCard.Field>
          <EditableCard.Field
            label="Due date"
            value={formatDate(dueDate)}
            readOnly={{ kind: "calculated", reason: "Order date plus payment terms." }}
          />

          {/* Row 3 */}
          <EditableCard.Field name="shipTo" label="Ship to" value={record.shipTo}>
            <Select items={WAREHOUSES} defaultValue={record.shipTo} />
          </EditableCard.Field>
          <EditableCard.Field name="buyer" label="Buyer" value={record.buyer}>
            <Combobox items={BUYERS} defaultValue={record.buyer} />
          </EditableCard.Field>
          <EditableCard.Field
            label="Order total"
            value={money.format(record.total)}
            readOnly={{
              kind: "calculated",
              reason: "Sum of the order lines. Edit the lines to change it.",
            }}
          />

          {/* Row 4 */}
          <EditableCard.Field
            label="Budget code"
            value={record.budgetCode}
            readOnly={{ kind: "permission", reason: "Only Finance can change the budget code." }}
          />
          <EditableCard.Field
            label="Created by"
            value={record.createdBy}
            readOnly={{ kind: "system", reason: "Recorded when the order was created." }}
          />
          <EditableCard.Field
            label="Last updated"
            value={record.updatedAt}
            readOnly={{ kind: "system", reason: "Updated automatically on every save." }}
          />

          {/* Row 5 — multi-line text sits last, so only its own row grows */}
          <EditableCard.Field name="notes" label="Notes" span="full" value={record.notes}>
            <Textarea defaultValue={record.notes} rows={3} />
          </EditableCard.Field>
        </EditableCard>
      </div>
    </div>
  );
}

function InPlaceHeaderExample() {
  return (
    <div className="flex flex-col gap-4">
      <ExampleHeader id="E6" title="Edit in place, fields stay put">
        <code>EditableCard</code>: view and edit are one card with one field list. Each cell keeps
        its grid slot, label row and a 36px value slot in both modes, so pressing Edit only swaps
        the value for a control. Fields that can't be edited keep their view rendering and show an
        icon; hover it for the reason. Change the order date or payment terms and the due date
        recalculates.
      </ExampleHeader>
      <PurchaseOrderHeaderCard />
    </div>
  );
}

// ============================================================================
// E7 — What non-editable fields show in edit mode
// ============================================================================

// 🧪 Dummy Data: Replace with real data later
const READ_ONLY_KINDS = [
  {
    kind: "System",
    examples: "Status pill, document number, created by, last updated",
    edit: "Unchanged value (the pill stays a pill) with a lock icon",
    tooltip: "What sets it: “Changes as the order moves through approval…”",
  },
  {
    kind: "Calculated",
    examples: "Due date, order total, line amount, balance",
    edit: "Value updates live as its inputs change, with a calculator icon",
    tooltip: "The formula: “Order date plus payment terms”",
  },
  {
    kind: "Locked by state",
    examples: "Supplier after confirmation, cost method after stock moves",
    edit: "Unchanged value with a lock icon",
    tooltip: "What froze it and what to do instead",
  },
  {
    kind: "No permission",
    examples: "Budget code, credit limit, GL account",
    edit: "Unchanged value with a shield icon",
    tooltip: "Who can change it: “Only Finance can…”",
  },
];

function ReadOnlyKindsExample() {
  return (
    <div className="flex flex-col gap-4">
      <ExampleHeader id="E7" title="Fields you can't edit">
        Read-only fields are never hidden, greyed out or turned into disabled inputs — any of those
        would move or restyle them. They keep their view rendering; one icon after the label says
        which kind they are, and its tooltip says why.
      </ExampleHeader>
      <Table.Root>
        <Table.Header>
          <Table.Row>
            <Table.Head>Kind</Table.Head>
            <Table.Head>Examples</Table.Head>
            <Table.Head>In edit mode</Table.Head>
            <Table.Head>Tooltip explains</Table.Head>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {READ_ONLY_KINDS.map((row) => (
            <Table.Row key={row.kind}>
              <Table.Cell className="font-medium">{row.kind}</Table.Cell>
              <Table.Cell>{row.examples}</Table.Cell>
              <Table.Cell>{row.edit}</Table.Cell>
              <Table.Cell>{row.tooltip}</Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table.Root>
    </div>
  );
}

// ============================================================================
// E8 — Several cards on one page, each saved on its own
// ============================================================================

// 🧪 Dummy Data: Replace with real data later
const ITEM_PURCHASING = {
  leadTime: "21",
  moq: "500",
  buyer: "Kenji Mori",
  warehouse: "Tokyo DC",
};
// 🧪 Dummy Data: Replace with real data later
const ITEM_ACCOUNTING = {
  costMethod: "Moving average",
  inventoryAccount: "1400 · Inventory – Finished goods",
  taxCode: "Standard 10%",
};
// 🧪 Dummy Data: Replace with real data later
const TAX_CODES = ["Standard 10%", "Reduced 8%", "Exempt"];

type PurchasingValues = typeof ITEM_PURCHASING;
type AccountingValues = Pick<typeof ITEM_ACCOUNTING, "taxCode">;
type FieldErrors = Record<string, string>;

// 🧪 Dummy Data: stands in for the server rejecting a save
async function savePurchasing(values: PurchasingValues): Promise<FieldErrors | null> {
  await new Promise((resolve) => setTimeout(resolve, 600));
  return Number(values.leadTime) > 365
    ? { leadTime: "Lead time can't be more than a year. Check the supplier's quote." }
    : null;
}

type CardId = "purchasing" | "accounting";

function ItemCardsExample() {
  const [editingCard, setEditingCard] = React.useState<CardId | null>(null);
  const [purchasing, setPurchasing] = React.useState(ITEM_PURCHASING);
  const [accounting, setAccounting] = React.useState(ITEM_ACCOUNTING);
  const [purchasingErrors, setPurchasingErrors] = React.useState<FieldErrors>({});

  return (
    <div className="flex flex-col gap-4">
      <ExampleHeader id="E8" title="Several cards, each saved on its own">
        The page TentBox described: view and edit merged, a save per card. Only one card edits at a
        time — while one is open the others' Edit buttons are disabled, so there is never more than
        one set of unsaved changes to guard. Escape cancels. Enter a lead time over 365 days to see
        a server error land on its field while the card stays in edit mode.
      </ExampleHeader>
      <Grid columns={{ initial: 1, lg: 2 }} gap={4}>
        <EditableCard<PurchasingValues>
          title="Purchasing"
          columns={2}
          editing={editingCard === "purchasing"}
          editDisabled={editingCard != null}
          onEditingChange={(next) => setEditingCard(next ? "purchasing" : null)}
          onCancel={() => setPurchasingErrors({})}
          errors={purchasingErrors}
          onSave={async (values) => {
            const errors = await savePurchasing(values);
            setPurchasingErrors(errors ?? {});
            // Rejecting keeps the card in edit mode with the user's changes
            if (errors) throw new Error("Purchasing save rejected");
            setPurchasing(values);
          }}
        >
          <EditableCard.Field
            name="leadTime"
            label="Lead time (days)"
            value={purchasing.leadTime}
            required
          >
            <Input type="number" min={0} defaultValue={purchasing.leadTime} required />
          </EditableCard.Field>
          <EditableCard.Field name="moq" label="Minimum order qty" value={purchasing.moq}>
            <Input type="number" min={1} defaultValue={purchasing.moq} />
          </EditableCard.Field>
          <EditableCard.Field name="buyer" label="Buyer" value={purchasing.buyer}>
            <Combobox items={BUYERS} defaultValue={purchasing.buyer} />
          </EditableCard.Field>
          <EditableCard.Field
            name="warehouse"
            label="Default warehouse"
            value={purchasing.warehouse}
          >
            <Select items={WAREHOUSES} defaultValue={purchasing.warehouse} />
          </EditableCard.Field>
        </EditableCard>

        <EditableCard<AccountingValues>
          title="Accounting"
          columns={2}
          editing={editingCard === "accounting"}
          editDisabled={editingCard != null}
          onEditingChange={(next) => setEditingCard(next ? "accounting" : null)}
          onSave={(values) => {
            setAccounting((current) => ({ ...current, ...values }));
          }}
        >
          <EditableCard.Field
            label="Cost method"
            value={accounting.costMethod}
            readOnly={{
              kind: "locked",
              reason: "Can't change after stock has moved for this item.",
            }}
          />
          <EditableCard.Field name="taxCode" label="Tax code" value={accounting.taxCode}>
            <Select items={TAX_CODES} defaultValue={accounting.taxCode} />
          </EditableCard.Field>
          <EditableCard.Field
            label="Inventory account"
            span="full"
            value={accounting.inventoryAccount}
            readOnly={{ kind: "permission", reason: "Only Finance can change GL accounts." }}
          />
        </EditableCard>
      </Grid>
    </div>
  );
}

export function InPlaceExamples() {
  return (
    <div className="flex flex-col gap-12">
      <InPlaceHeaderExample />
      <ReadOnlyKindsExample />
      <ItemCardsExample />
    </div>
  );
}
