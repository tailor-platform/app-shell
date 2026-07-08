/* pattern: list/dense-scan */
import { DataTable, Layout, useDataTable, Button, Input } from "@tailor-platform/app-shell";
import type { Order } from "./columns";
import { columns } from "./columns";
import type { DataTableData } from "@tailor-platform/app-shell";

type Props = {
  data: DataTableData<Order>;
  onCreateClick: () => void;
};

export default function DenseScanList({ data, onCreateClick }: Props) {
  const table = useDataTable({ data, columns });

  return (
    // `fill` pins the page chrome for table-first pages: the title, toolbar,
    // column header row, and pagination footer stay visible at every viewport
    // height — only the table's rows region scrolls. Omit `fill` on pages
    // that should flow and scroll naturally (forms, dashboards, articles).
    <Layout fill>
      <Layout.Header
        title="Orders"
        actions={[
          <Button key="create" onClick={onCreateClick}>
            Create Order
          </Button>,
        ]}
      />
      <Layout.Column>
        <DataTable.Root value={table}>
          <DataTable.Toolbar>
            <Input placeholder="Search orders..." className="max-w-sm" />
          </DataTable.Toolbar>
          <DataTable.Table />
          <DataTable.Footer>
            <DataTable.Pagination />
          </DataTable.Footer>
        </DataTable.Root>
      </Layout.Column>
    </Layout>
  );
}
