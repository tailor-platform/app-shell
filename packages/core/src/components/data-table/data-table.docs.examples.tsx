import { DataTable, createColumnHelper, useDataTable } from "@tailor-platform/app-shell";
import type { RowAction } from "@tailor-platform/app-shell";

interface Product extends Record<string, unknown> {
  id: string;
  name: string;
  price: number;
  status: string;
  createdAt: string;
}

const PRODUCTS: Product[] = [
  { id: "1", name: "Aluminium widget", price: 19.99, status: "active", createdAt: "2026-01-04" },
  { id: "2", name: "Brass gadget", price: 149, status: "draft", createdAt: "2026-02-11" },
  { id: "3", name: "Copper gizmo", price: 4.5, status: "active", createdAt: "2026-03-02" },
];

const { column } = createColumnHelper<Product>();

const columns = [
  column({ label: "Name", accessor: (row) => row.name, truncate: true }),
  column({ label: "Price", type: "money", accessor: (row) => row.price }),
  column({ label: "Status", type: "badge", accessor: (row) => row.status }),
  column({ label: "Created", type: "date", accessor: (row) => row.createdAt }),
];

const rowActions: RowAction<Product>[] = [
  { id: "edit", label: "Edit", onClick: (row) => window.alert(`Edit ${row.name}`) },
  {
    id: "delete",
    label: "Delete",
    variant: "destructive",
    onClick: (row) => window.alert(`Delete ${row.name}`),
  },
];

export function BasicUsage() {
  const table = useDataTable<Product>({
    columns,
    data: { rows: PRODUCTS, total: PRODUCTS.length },
    onClickRow: (row) => window.alert(`Open ${row.name}`),
    rowActions,
  });

  return (
    <DataTable.Root value={table}>
      <DataTable.Table />
    </DataTable.Root>
  );
}
