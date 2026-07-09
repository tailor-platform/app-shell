import {
  Badge,
  DataTable,
  createColumnHelper,
  useCollectionVariables,
  useDataTable,
} from "@tailor-platform/app-shell";
import { useMemo, useState } from "react";

type OrderStatus = "Draft" | "Confirmed";

type OrderRow = {
  id: string;
  number: string;
  status: OrderStatus;
  total: number;
};

const sampleRows: OrderRow[] = [
  { id: "1", number: "PO-1001", status: "Draft", total: 1200 },
  { id: "2", number: "PO-1002", status: "Confirmed", total: 3400 },
  { id: "3", number: "PO-1003", status: "Confirmed", total: 980 },
];

const statusVariants: Record<OrderStatus, "warning" | "success"> = {
  Draft: "warning",
  Confirmed: "success",
};

const { column } = createColumnHelper<OrderRow>();

const columns = [
  column({
    id: "number",
    label: "Order",
    type: "text",
    accessor: (row) => row.number,
  }),
  column({
    id: "status",
    label: "Status",
    render: (row) => <Badge variant={statusVariants[row.status]}>{row.status}</Badge>,
  }),
  column({
    id: "total",
    label: "Total",
    type: "money",
    accessor: (row) => row.total,
    typeOptions: { currency: "USD" },
  }),
];

export function DataTableShapeExample() {
  const { variables, control } = useCollectionVariables({ params: { pageSize: 20 } });
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const pageSize = variables.pagination.first ?? 20;
  const rows = useMemo(() => sampleRows.slice(0, pageSize), [pageSize]);

  const table = useDataTable<OrderRow>({
    columns,
    data: {
      rows,
      pageInfo: {
        hasNextPage: false,
        hasPreviousPage: false,
        startCursor: null,
        endCursor: null,
      },
      total: rows.length,
    },
    loading: false,
    control,
    onClickRow: (row) => setSelectedOrderId(row.id),
  });

  return (
    <>
      <DataTable.Root value={table}>
        <DataTable.Toolbar>
          <DataTable.Filters />
        </DataTable.Toolbar>
        <DataTable.Table />
        <DataTable.Footer>
          <DataTable.Pagination pageSizeOptions={[10, 20, 50]} />
        </DataTable.Footer>
      </DataTable.Root>
      {selectedOrderId ? <p className="text-caption">Selected: {selectedOrderId}</p> : null}
    </>
  );
}
