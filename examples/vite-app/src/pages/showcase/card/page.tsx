import { useMemo, type ReactNode } from "react";
import {
  Layout,
  Badge,
  Card,
  DataTable,
  Table,
  useDataTable,
  useCollectionVariables,
  createColumnHelper,
  type CollectionVariables,
  type DataTableData,
  type AppShellPageProps,
} from "@tailor-platform/app-shell";
import { SquareDashed } from "lucide-react";

// ─── Data ──────────────────────────────────────────────────────────────────────

type Line = {
  id: string;
  sku: string;
  description: string;
  qty: number;
  unitPrice: number;
  status: "open" | "shipped" | "backordered";
};

const DESCRIPTIONS = [
  "Steel bracket, 40mm",
  "Hex bolt M8 × 30",
  "Nylon washer, 8mm",
  "Aluminium extrusion, 2m",
  "Rubber gasket, 120mm",
  "Cable tie, 300mm (100 pk)",
];
const STATUSES: Line["status"][] = ["open", "shipped", "backordered"];

const LINES: Line[] = Array.from({ length: 23 }, (_, i) => ({
  id: `L-${String(i + 1).padStart(3, "0")}`,
  sku: `SKU-${4100 + i * 7}`,
  description: DESCRIPTIONS[i % DESCRIPTIONS.length],
  qty: ((i * 37) % 90) + 1,
  unitPrice: Math.round((((i * 53) % 400) + 4.5) * 100) / 100,
  status: STATUSES[i % STATUSES.length],
}));

const money = new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" });

const statusVariant = (status: Line["status"]) =>
  status === "shipped"
    ? ("success" as const)
    : status === "backordered"
      ? ("outline-warning" as const)
      : ("outline-info" as const);

const { column } = createColumnHelper<Line>();

const columns = [
  column({ label: "Line", render: (row) => row.id }),
  column({ label: "SKU", render: (row) => <span className="font-mono text-xs">{row.sku}</span> }),
  column({ label: "Description", render: (row) => row.description }),
  column({
    label: "Status",
    render: (row) => <Badge variant={statusVariant(row.status)}>{row.status}</Badge>,
  }),
  column({ label: "Qty", align: "right", render: (row) => row.qty }),
  column({
    label: "Total",
    align: "right",
    render: (row) => money.format(row.qty * row.unitPrice),
  }),
];

// Cursor pagination over the static rows (cursor = stringified row index).
function paginate(rows: Line[], { pagination }: CollectionVariables): DataTableData<Line> {
  const { first, after, last, before } = pagination;
  const total = rows.length;
  const start =
    last != null
      ? Math.max(0, (before != null ? Number(before) : total) - last)
      : after != null
        ? Number(after) + 1
        : 0;
  const page = rows.slice(start, start + (last ?? first ?? 5));
  return {
    rows: page,
    total,
    pageInfo: {
      startCursor: page.length ? String(start) : null,
      endCursor: page.length ? String(start + page.length - 1) : null,
      hasPreviousPage: start > 0,
      hasNextPage: start + page.length < total,
    },
  };
}

// ─── Examples ──────────────────────────────────────────────────────────────────

function PaginatedLines() {
  const { variables, control } = useCollectionVariables({ params: { pageSize: 5 } });
  const data = useMemo(() => paginate(LINES, variables), [variables]);
  const table = useDataTable({ columns, data, control });

  return (
    <Card.Root>
      <Card.Header title="Line items" description="DataTable with a pagination footer" />
      <Card.Content padding="none">
        <DataTable.Root value={table}>
          <DataTable.Table />
          <DataTable.Footer>
            <DataTable.Pagination pageSizeOptions={[5, 10, 20]} />
          </DataTable.Footer>
        </DataTable.Root>
      </Card.Content>
    </Card.Root>
  );
}

function LastRowLines() {
  // Pinned right column: its opaque cell background is what would poke past the
  // card's rounded bottom-right corner if the clip were missing.
  const table = useDataTable({
    columns: columns.map((c, i) =>
      i === columns.length - 1 ? { ...c, pin: "right" as const } : c,
    ),
    data: { rows: LINES.slice(0, 4), total: 4 },
  });

  return (
    <Card.Root>
      <Card.Header
        title="Shipped lines"
        description="DataTable ending on a data row; Total pinned right"
      />
      <Card.Content padding="none">
        <DataTable.Root value={table}>
          <DataTable.Table />
        </DataTable.Root>
      </Card.Content>
    </Card.Root>
  );
}

function HeaderlessLines() {
  const table = useDataTable({ columns, data: { rows: LINES.slice(0, 3), total: 3 } });

  return (
    <Card.Root>
      <Card.Content padding="none">
        <DataTable.Root value={table}>
          <DataTable.Table />
        </DataTable.Root>
      </Card.Content>
    </Card.Root>
  );
}

function PlainTableLines() {
  return (
    <Card.Root>
      <Card.Header title="Totals" description="Plain Table (not DataTable)" />
      <Card.Content padding="none">
        <Table.Root>
          <Table.Header>
            <Table.Row>
              <Table.Head>Line</Table.Head>
              <Table.Head>Description</Table.Head>
              <Table.Head align="right">Total</Table.Head>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {LINES.slice(0, 4).map((line) => (
              <Table.Row key={line.id}>
                <Table.Cell>{line.id}</Table.Cell>
                <Table.Cell>{line.description}</Table.Cell>
                <Table.Cell align="right">{money.format(line.qty * line.unitPrice)}</Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Root>
      </Card.Content>
    </Card.Root>
  );
}

function ScrollingList() {
  return (
    <Card.Root>
      <Card.Header title="Recent lines" description="Scrollable list with edge-to-edge dividers" />
      <Card.Content padding="none" className="max-h-60 overflow-y-auto">
        <ul className="divide-y divide-border border-t border-border">
          {LINES.map((line) => (
            <li
              key={line.id}
              className="flex items-center justify-between px-6 py-3 text-sm hover:bg-muted/50"
            >
              <span>{line.description}</span>
              <span className="text-muted-foreground">{line.qty} pcs</span>
            </li>
          ))}
        </ul>
      </Card.Content>
    </Card.Root>
  );
}

function Example({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mb-8">
      <h3 className="mb-2 text-sm font-semibold">{title}</h3>
      {children}
    </section>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

const CardDemoPage = () => (
  <Layout>
    <Layout.Header title="Card Demo" />
    <Layout.Column>
      <p className="text-sm text-muted-foreground mb-6">
        <code>Card.Content padding="none"</code> renders tables and lists edge-to-edge. Cells keep
        their own 24px inset, so the first column lines up with the card title.
      </p>
      <Example title="DataTable + pagination footer">
        <PaginatedLines />
      </Example>
      <Example title="DataTable ending on a data row">
        <LastRowLines />
      </Example>
      <Example title="No header (top corners)">
        <HeaderlessLines />
      </Example>
      <Example title="Plain Table">
        <PlainTableLines />
      </Example>
      <Example title="Scrollable divided list">
        <ScrollingList />
      </Example>
    </Layout.Column>
  </Layout>
);

CardDemoPage.appShellPageProps = {
  meta: {
    title: "Card Demo",
    icon: <SquareDashed size={16} />,
  },
} satisfies AppShellPageProps;

export default CardDemoPage;
