import * as React from "react";
import {
  Button,
  Card,
  Combobox,
  Layout,
  LineItems,
  createLineItemHelper,
  defineResource,
  useLineItems,
  useLineItemsGroup,
  type LineItemsField,
  type LineItemsRowData,
} from "@tailor-platform/app-shell";

/* ======================================================================== */
/* Domain                                                                    */
/* ======================================================================== */

type JournalLine = LineItemsRowData & {
  account: string;
  memo: string;
  amount: number;
};

const ACCOUNTS: ReadonlyArray<{ value: string; label: string; description?: string }> = [
  { value: "1000", label: "1000", description: "Cash" },
  { value: "1100", label: "1100", description: "Accounts receivable" },
  { value: "2000", label: "2000", description: "Accounts payable" },
  { value: "4000", label: "4000", description: "Sales revenue" },
  { value: "5000", label: "5000", description: "Cost of goods sold" },
  { value: "6000", label: "6000", description: "Operating expenses" },
];

const round2 = (n: number) => Math.round(n * 100) / 100;
const fmt = (n: number) => `$${n.toFixed(2)}`;

/* ======================================================================== */
/* Field schema (shared between debits + credits)                            */
/* ======================================================================== */

const f = createLineItemHelper<JournalLine>();

const fields: LineItemsField<JournalLine>[] = [
  f.field({
    key: "account",
    label: "Account",
    render: (l) => l.account,
    editable: ["edit"],
    type: { kind: "select", options: ACCOUNTS, placeholder: "Pick account" },
    sort: { comparator: (a, b) => a.account.localeCompare(b.account) },
    width: 160,
  }),
  f.field({
    key: "memo",
    label: "Memo",
    render: (l) => l.memo,
    editable: ["edit", "amend"],
    type: { kind: "text" },
    commit: "metadata",
  }),
  f.field({
    key: "amount",
    label: "Amount",
    render: (l) => fmt(l.amount),
    editable: ["edit"],
    type: { kind: "number", decimals: 2 },
    sort: { comparator: (a, b) => a.amount - b.amount },
  }),
];

const seedDebits = (): JournalLine[] => [
  { lineRef: "d1", account: "1000", memo: "Customer payment", amount: 1200 },
  { lineRef: "d2", account: "5000", memo: "COGS allocation", amount: 800 },
];

const seedCredits = (): JournalLine[] => [
  { lineRef: "c1", account: "1100", memo: "Invoice INV-1042", amount: 1200 },
  { lineRef: "c2", account: "1000", memo: "Inventory drawdown", amount: 800 },
];

/* ======================================================================== */
/* Page                                                                      */
/* ======================================================================== */

export const journalEntryDemoResource = defineResource({
  path: "journal-entry-demo",
  component: JournalEntryDemoPage,
  meta: { title: "Journal Entry (group helper)" },
});

export function JournalEntryDemoPage() {
  const debits = useLineItems<JournalLine>({
    fields,
    data: seedDebits(),
    selection: true,
  });
  const credits = useLineItems<JournalLine>({
    fields,
    data: seedCredits(),
    selection: true,
  });

  // ✅ Reusable Pattern: bundle two collections under one header so the page
  // gets a single isDirty + Discard / Save boundary, while each collection
  // keeps its own table + selection + change-set.
  const group = useLineItemsGroup({ debits, credits });

  // Balance check at the page level. The component doesn't know about
  // debit/credit semantics — that's the consumer's job.
  const debitTotal = round2(debits.allLines.reduce((s, l) => s + Number(l.amount), 0));
  const creditTotal = round2(credits.allLines.reduce((s, l) => s + Number(l.amount), 0));
  const outOfBalance = round2(debitTotal - creditTotal);
  const balanced = Math.abs(outOfBalance) < 1e-9;

  const handleSave = React.useCallback(() => {
    const cs = group.getChangeSet();
    if (cs.isEmpty) return;
    // In a real app, translate cs.debits.lineChanges + cs.credits.lineChanges
    // into one Journal Entry mutation that posts both sides atomically.
    // eslint-disable-next-line no-console
    console.log("[journal entry demo] saving grouped change set", cs);
    group.reset();
  }, [group]);

  return (
    <Layout>
      <Layout.Header
        title="Journal Entry JE-2026-0142"
        actions={[
          <Button
            key="discard"
            variant="secondary"
            size="sm"
            onClick={() => group.revert()}
            disabled={!group.isDirty}
          >
            Discard
          </Button>,
          <Button
            key="save"
            size="sm"
            onClick={() => void handleSave()}
            disabled={!group.isDirty || !balanced}
          >
            Post entry
          </Button>,
        ]}
      />
      <Layout.Column>
        {/* 🔽 Balance summary — page-level, derived from both collections */}
        <Card.Root>
          <Card.Content className="astw:flex astw:flex-wrap astw:items-center astw:gap-6 astw:py-3">
            <BalanceItem label="Debits" value={fmt(debitTotal)} />
            <BalanceItem label="Credits" value={fmt(creditTotal)} />
            <BalanceItem
              label={balanced ? "In balance" : "Out of balance"}
              value={balanced ? "—" : fmt(outOfBalance)}
              tone={balanced ? "ok" : "warn"}
            />
            {group.isDirty ? (
              <span className="astw:text-muted-foreground astw:text-xs">
                Unsaved changes across both collections
              </span>
            ) : null}
          </Card.Content>
        </Card.Root>

        <CollectionSection title="Debits" hook={debits} />
        <CollectionSection title="Credits" hook={credits} />
      </Layout.Column>
    </Layout>
  );
}

/* ======================================================================== */
/* Reusable helpers                                                          */
/* ======================================================================== */

function BalanceItem({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "ok" | "warn";
}) {
  return (
    <div className="astw:flex astw:flex-col">
      <span className="astw:text-muted-foreground astw:text-xs astw:font-medium">{label}</span>
      <span
        className={
          tone === "warn"
            ? "astw:text-destructive astw:text-base astw:font-semibold astw:tabular-nums"
            : "astw:text-foreground astw:text-base astw:font-semibold astw:tabular-nums"
        }
      >
        {value}
      </span>
    </div>
  );
}

/* ✅ Reusable Component: a thin wrapper around <LineItems.Root> + table. The
   group helper above is what lets two of these share one Save / Discard. */
function CollectionSection({
  title,
  hook,
}: {
  title: string;
  hook: ReturnType<typeof useLineItems<JournalLine>>;
}) {
  const [resetKey, setResetKey] = React.useState(0);
  return (
    <LineItems.Root value={hook}>
      {/* overflow-hidden clips the edge-to-edge table to the rounded card. */}
      <Card.Root className="astw:overflow-hidden">
        <Card.Header className="astw:flex astw:flex-row astw:items-center astw:justify-between astw:gap-3 astw:border-b">
          <div className="astw:flex astw:min-w-0 astw:flex-col astw:gap-1">
            <h3 className="astw:leading-none astw:font-semibold">{title}</h3>
            <p className="astw:text-muted-foreground astw:text-sm">
              {hook.allLines.length} lines{hook.isDirty ? " · Modified" : ""}
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
            maxBodyHeight={320}
            renderFullscreenToggle={false}
            tableContainerClassName="astw:rounded-none astw:border-0"
            emptyMessage="No journal lines yet."
          />

          <div style={{ margin: 8 }} className="astw:flex astw:items-center astw:gap-1">
            <Combobox<{ value: string; label: string; description?: string }>
              key={resetKey}
              items={ACCOUNTS as Array<{ value: string; label: string; description?: string }>}
              placeholder="+   Add line item — type to search…"
              emptyText="No matching accounts."
              mapItem={(p) => ({
                key: p.value,
                label: `${p.value} ${p.description ?? ""}`,
                render: (
                  <div className="astw:flex astw:flex-col astw:gap-0.5">
                    <span className="astw:text-sm astw:font-medium">{p.value}</span>
                    {p.description ? (
                      <span className="astw:text-muted-foreground astw:text-xs">{p.description}</span>
                    ) : null}
                  </div>
                ),
              })}
              onValueChange={(picked) => {
                if (!picked) return;
                hook.addLine({ account: picked.value, memo: "", amount: 0 });
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
        </Card.Content>
      </Card.Root>
    </LineItems.Root>
  );
}
