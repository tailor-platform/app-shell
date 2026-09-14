import { DataTable, useDataTable, useURLCollectionVariables } from "@tailor-platform/app-shell";
import { columns } from "./columns";
import { mockOrders } from "./mock";

const tableMetadata = {
  name: "order",
  pluralForm: "orders",
  fields: [
    { name: "orderNumber", type: "string", required: true },
    { name: "customer", type: "string", required: true },
    {
      name: "status",
      type: "enum",
      required: true,
      enumValues: ["draft", "confirmed", "shipped", "delivered"],
    },
    { name: "amount", type: "number", required: true },
    { name: "createdAt", type: "date", required: true },
  ],
} as const;

export function OrdersTable() {
  const { control } = useURLCollectionVariables({
    tableMetadata,
    params: { pageSize: 25 },
  });
  const table = useDataTable({
    columns,
    control,
    data: { rows: mockOrders, total: mockOrders.length },
  });

  return (
    <DataTable.Root value={table}>
      <DataTable.Toolbar columnSettings>
        <DataTable.Filters />
      </DataTable.Toolbar>
      <DataTable.Table />
      <DataTable.Footer>
        <DataTable.Pagination />
      </DataTable.Footer>
    </DataTable.Root>
  );
}
