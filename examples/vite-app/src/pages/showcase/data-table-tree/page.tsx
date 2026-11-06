import { useState } from "react";
import {
  Button,
  Card,
  DataTable,
  Layout,
  Toolbar,
  useDataTable,
  type AppShellPageProps,
  type Column,
  type SelectionAction,
  type TreeSelectionPropagation,
  type TreeValueStrategy,
} from "@tailor-platform/app-shell";

// 🧪 Dummy Data: Replace with real data later — a chart of accounts with sub-accounts.
// A `type` (not `interface`) so it satisfies `useDataTable`'s row constraint.
type Account = {
  id: string;
  code: string;
  name: string;
  kind: "Asset" | "Liability" | "Equity";
  balance: number;
  children?: Account[];
};

const leaf = (code: string, name: string, kind: Account["kind"], balance: number): Account => ({
  id: code,
  code,
  name,
  kind,
  balance,
});

const group = (
  code: string,
  name: string,
  kind: Account["kind"],
  children: Account[],
): Account => ({
  id: code,
  code,
  name,
  kind,
  balance: children.reduce((sum, child) => sum + child.balance, 0),
  children,
});

const ACCOUNTS: Account[] = [
  group("1000", "Assets", "Asset", [
    group("1100", "Current assets", "Asset", [
      leaf("1110", "Cash at bank", "Asset", 182_400),
      leaf("1120", "Accounts receivable", "Asset", 64_250),
      leaf("1130", "Inventory", "Asset", 97_800),
    ]),
    leaf("1500", "Plant & equipment", "Asset", 410_000),
  ]),
  group("2000", "Liabilities", "Liability", [
    leaf("2100", "Accounts payable", "Liability", 38_900),
    leaf("2200", "GST payable", "Liability", 7_420),
  ]),
  leaf("3000", "Retained earnings", "Equity", 708_130),
];

const columns: Column<Account>[] = [
  { id: "code", label: "Code", accessor: (row) => row.code, width: 90 },
  // Defined second. `subRows.column` makes it the hierarchy column, and
  // `lockColumn` moves it first and pins it there.
  { id: "name", label: "Account", accessor: (row) => row.name },
  { id: "kind", label: "Kind", accessor: (row) => row.kind },
  { id: "balance", label: "Balance", type: "money", accessor: (row) => row.balance },
];

const PROPAGATIONS: TreeSelectionPropagation[] = ["full", "down", "none"];
const STRATEGIES: TreeValueStrategy[] = ["leaves", "topmost", "all"];

function AccountsTable({
  propagation,
  strategy,
  lockColumn,
}: {
  propagation: TreeSelectionPropagation;
  strategy: TreeValueStrategy;
  lockColumn: boolean;
}) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [lastExport, setLastExport] = useState<string[] | null>(null);
  const exportAction: SelectionAction = {
    id: "export",
    label: "Export",
    onClick: (ids) => setLastExport(ids),
  };
  const selectionBehaviour =
    propagation === "full"
      ? { selectionPropagation: propagation, valueStrategy: strategy }
      : { selectionPropagation: propagation };

  const table = useDataTable<Account>({
    columns,
    data: { rows: ACCOUNTS },
    tableId: "showcase-data-table-tree",
    subRows: {
      getSubRows: (row) => row.children,
      column: "name",
      lockColumn,
      defaultExpandedIds: ["1000"],
    },
    rowSelection: {
      ...selectionBehaviour,
      selectedIds,
      onChange: setSelectedIds,
      actions: [exportAction],
    },
  });

  return (
    <div className="flex flex-col gap-2">
      <DataTable.Root value={table}>
        <Toolbar.Root>
          <Toolbar.Row justify="between" aria-label="Account table controls">
            <span />
            <Toolbar.Group>
              <DataTable.ColumnSettings />
            </Toolbar.Group>
          </Toolbar.Row>
        </Toolbar.Root>
        <DataTable.Table />
        <DataTable.Footer />
      </DataTable.Root>
      <span className="text-muted-foreground font-mono text-xs">
        selectedIds = {JSON.stringify(selectedIds)}
        {lastExport ? ` · last export = ${JSON.stringify(lastExport)}` : null}
      </span>
    </div>
  );
}

const DataTableTreePage = () => {
  const [propagation, setPropagation] = useState<TreeSelectionPropagation>("full");
  const [strategy, setStrategy] = useState<TreeValueStrategy>("leaves");
  const [lockColumn, setLockColumn] = useState(true);
  const effectiveStrategy = propagation === "full" ? strategy : "all";

  return (
    <Layout>
      <Layout.Column>
        <Card.Root>
          <Card.Header
            title="Sub-rows"
            description='A chart of accounts with nested sub-accounts. "Account" is the hierarchy column, defined second. Locked, it moves first and pins there. Unlocked, it stays second and the checkboxes stay flat on the left until you drag it first in Columns.'
          />
          <Card.Content className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="text-muted-foreground w-40">selectionPropagation</span>
              {PROPAGATIONS.map((option) => (
                <Button
                  key={option}
                  size="sm"
                  variant={propagation === option ? "default" : "outline"}
                  onClick={() => setPropagation(option)}
                >
                  {option}
                </Button>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="text-muted-foreground w-40">valueStrategy</span>
              {STRATEGIES.map((option) => (
                <Button
                  key={option}
                  size="sm"
                  variant={effectiveStrategy === option ? "default" : "outline"}
                  disabled={propagation !== "full" && option !== "all"}
                  onClick={() => setStrategy(option)}
                >
                  {option}
                </Button>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="text-muted-foreground w-40">lockColumn</span>
              {[true, false].map((option) => (
                <Button
                  key={String(option)}
                  size="sm"
                  variant={lockColumn === option ? "default" : "outline"}
                  onClick={() => setLockColumn(option)}
                >
                  {String(option)}
                </Button>
              ))}
            </div>
            {/* Remount on a mode change, so the selection starts empty in each mode. */}
            <AccountsTable
              key={`${propagation}-${effectiveStrategy}-${lockColumn}`}
              propagation={propagation}
              strategy={effectiveStrategy}
              lockColumn={lockColumn}
            />
          </Card.Content>
        </Card.Root>
      </Layout.Column>
    </Layout>
  );
};

DataTableTreePage.appShellPageProps = {
  meta: { title: "DataTable sub-rows" },
} satisfies AppShellPageProps;

export default DataTableTreePage;
