/* pattern: list/dense-scan */
import {
  DataTable,
  useDataTable,
  Button,
  Input,
} from "@tailor-platform/app-shell";
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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Input placeholder="Search orders..." className="max-w-sm" />
        <Button onClick={onCreateClick}>Create Order</Button>
      </div>
      <DataTable.Root value={table}>
        <DataTable.Table />
      </DataTable.Root>
    </div>
  );
}
