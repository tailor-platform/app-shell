import {
  Badge,
  Button,
  Card,
  createLineItemHelper,
  Layout,
  LineItems,
  useLineItems,
  useLineItemsGroup,
  type AppShellPageProps,
  type LineItemsGroupChangeSet,
  type UseLineItemsReturn,
} from "@tailor-platform/app-shell";
import { useState } from "react";

// 🧪 Dummy Data: Replace with real data later
type JournalLine = {
  lineRef: string;
  account: string;
  memo: string;
  amount: number;
};

const ACCOUNT_OPTIONS = [
  { value: "1000", label: "1000 · Cash" },
  { value: "1200", label: "1200 · Accounts Receivable" },
  { value: "2000", label: "2000 · Accounts Payable" },
  { value: "4000", label: "4000 · Sales Revenue" },
  { value: "5000", label: "5000 · Cost of Goods Sold" },
  { value: "6100", label: "6100 · Freight Expense" },
];

// 🧪 Dummy Data: Replace with real data later
const INITIAL_DEBITS: JournalLine[] = [
  { lineRef: "d1", account: "1000", memo: "Customer payment INV-1042", amount: 1250 },
  { lineRef: "d2", account: "6100", memo: "Inbound freight PO-2231", amount: 180 },
];

// 🧪 Dummy Data: Replace with real data later
const INITIAL_CREDITS: JournalLine[] = [
  { lineRef: "c1", account: "1200", memo: "Clear receivable INV-1042", amount: 1250 },
  { lineRef: "c2", account: "2000", memo: "Carrier bill PO-2231", amount: 180 },
];

const money = (n: number) =>
  n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const sum = (lines: JournalLine[]) => lines.reduce((s, l) => s + (l.amount ?? 0), 0);

const f = createLineItemHelper<JournalLine>();

const fields = [
  f.field({
    key: "account",
    label: "Account",
    render: (l) => ACCOUNT_OPTIONS.find((o) => o.value === l.account)?.label ?? l.account,
    editable: ["edit"],
    type: { kind: "select", options: ACCOUNT_OPTIONS, placeholder: "Pick an account" },
    width: 260,
  }),
  f.field({
    key: "memo",
    label: "Memo",
    render: (l) => l.memo,
    editable: ["edit"],
    type: { kind: "text" },
    flex: true,
  }),
  f.field({
    key: "amount",
    label: "Amount",
    render: (l) => money(l.amount ?? 0),
    editable: ["edit"],
    type: { kind: "number", decimals: 2 },
    align: "right",
    width: 140,
  }),
];

const emptyLine = { account: "", memo: "", amount: 0 };

// ✅ Reusable Component: Can be moved to components/ui/
const JournalSide = ({
  title,
  value,
}: {
  title: string;
  value: UseLineItemsReturn<JournalLine>;
}) => (
  <LineItems.Root value={value}>
    <Card.Root>
      <Card.Header
        title={title}
        description={`${value.allLines.length} lines · ${money(sum(value.allLines))}`}
      >
        <div className="flex items-center justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => value.addLine(emptyLine)}>
            Add line
          </Button>
        </div>
      </Card.Header>
      <Card.Content>
        <LineItems.Table
          rowActionsWidth={40}
          renderRowActions={(row: JournalLine) => (
            <Button
              variant="ghost"
              size="icon"
              aria-label={`Remove ${row.memo || "line"}`}
              onClick={() => value.removeLine(row.lineRef)}
            >
              ×
            </Button>
          )}
        />
        <LineItems.TotalsRow>
          {(lines: JournalLine[]) => ({ memo: "Total", amount: money(sum(lines)) })}
        </LineItems.TotalsRow>
      </Card.Content>
    </Card.Root>
  </LineItems.Root>
);

const LineItemsJournalDemoPage = () => {
  const [lastSaved, setLastSaved] = useState<LineItemsGroupChangeSet<{
    debits: UseLineItemsReturn<JournalLine>;
    credits: UseLineItemsReturn<JournalLine>;
  }> | null>(null);

  const debits = useLineItems<JournalLine>({ fields, defaultLines: INITIAL_DEBITS });
  const credits = useLineItems<JournalLine>({ fields, defaultLines: INITIAL_CREDITS });
  const group = useLineItemsGroup({ debits, credits });

  const difference = sum(debits.allLines) - sum(credits.allLines);
  const balanced = Math.abs(difference) < 0.005;

  const onSave = () => {
    const changeSet = group.getChangeSet();
    if (changeSet.isEmpty || !balanced) return;
    setLastSaved(changeSet);
    group.reset();
  };

  return (
    <Layout>
      <Layout.Column>
        {/* 🔽 Document header: one Save / Discard for both collections */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">JE-2026-0187</span>
            {balanced ? (
              <Badge variant="outline-success">Balanced</Badge>
            ) : (
              <Badge variant="outline-error">{`Out of balance by ${money(difference)}`}</Badge>
            )}
            {group.isDirty && <Badge variant="outline-neutral">Unsaved changes</Badge>}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={!group.isDirty} onClick={group.revert}>
              Discard
            </Button>
            <Button size="sm" disabled={!group.isDirty || !balanced} onClick={onSave}>
              Save entry
            </Button>
          </div>
        </div>

        {/* 🔽 Debits */}
        <JournalSide title="Debits" value={debits} />

        {/* 🔽 Credits */}
        <JournalSide title="Credits" value={credits} />

        {/* 🔽 Last submitted change-set */}
        {lastSaved && (
          <Card.Root>
            <Card.Header title="Last saved change-set" />
            <Card.Content>
              <pre className="overflow-auto text-xs">{JSON.stringify(lastSaved, null, 2)}</pre>
            </Card.Content>
          </Card.Root>
        )}
      </Layout.Column>
    </Layout>
  );
};

LineItemsJournalDemoPage.appShellPageProps = {
  meta: {
    title: "Line Items: Journal Entry",
  },
} satisfies AppShellPageProps;

export default LineItemsJournalDemoPage;
