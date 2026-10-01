import { useState } from "react";
import {
  Button,
  DataTable,
  Dialog,
  useDataTable,
  type Column,
  type SelectionAction,
} from "@tailor-platform/app-shell";

type Order = {
  id: string;
  number: string;
  status: "Open" | "Confirmed" | "Shipped";
  total: number;
};

const mockOrders: Order[] = [
  { id: "1", number: "ORD-001", status: "Open", total: 1240 },
  { id: "2", number: "ORD-002", status: "Confirmed", total: 3800 },
  { id: "3", number: "ORD-003", status: "Open", total: 920 },
  { id: "4", number: "ORD-004", status: "Shipped", total: 5600 },
  { id: "5", number: "ORD-005", status: "Open", total: 2100 },
];

const columns: Column<Order>[] = [
  { label: "Order #", render: (order) => order.number },
  { label: "Status", render: (order) => order.status },
  { label: "Total", render: (order) => `$${order.total.toLocaleString()}` },
];

type PendingCancel = { orders: Order[]; clearSelection: () => void };

// Stand-ins for real mutations.
const confirmOrders = async (orders: Order[]) => {
  window.alert(`Confirming ${orders.length} order(s)`);
};
const exportOrders = async (orders: Order[]) => {
  window.alert(`Exporting ${orders.length} order(s)`);
};

export function InteractionMultiSelect() {
  const [pendingCancel, setPendingCancel] = useState<PendingCancel | null>(null);

  const selectionActions: SelectionAction<Order>[] = [
    {
      id: "confirm",
      label: "Confirm",
      // Only open orders can be confirmed: the bar shows "Confirm (n)".
      canApply: (order) => order.status === "Open",
      // Return the promise: the bar disables its actions while it runs, then
      // clears the selection.
      onClick: (orders) => confirmOrders(orders),
    },
    {
      id: "export",
      label: "Export",
      // Exporting doesn't change the rows, so keep them selected.
      keepSelection: true,
      onClick: (orders) => exportOrders(orders),
    },
    {
      id: "assign",
      label: "Assign owner",
      onClick: async (orders) => window.alert(`Assigning ${orders.length} order(s)`),
    },
    {
      // 4th action: lands in the More actions menu.
      id: "cancel",
      label: "Cancel",
      variant: "destructive",
      canApply: (order) => order.status !== "Shipped",
      // Destructive: confirm first (interaction/confirm). Opening the dialog is
      // synchronous, so the selection is cleared on confirm instead.
      onClick: (orders, { clearSelection }) => setPendingCancel({ orders, clearSelection }),
    },
  ];

  const table = useDataTable({
    columns,
    data: { rows: mockOrders, total: mockOrders.length },
    selectionActions,
  });

  return (
    <>
      <DataTable.Root value={table}>
        <DataTable.Table />
        <DataTable.Footer>
          <DataTable.Pagination />
        </DataTable.Footer>
      </DataTable.Root>

      <Dialog.Root
        open={pendingCancel !== null}
        onOpenChange={(open) => {
          if (!open) setPendingCancel(null);
        }}
      >
        <Dialog.Content>
          <Dialog.Header>
            <Dialog.Title>Cancel {pendingCancel?.orders.length} order(s)?</Dialog.Title>
            <Dialog.Description>Cancelled orders can&apos;t be reopened.</Dialog.Description>
          </Dialog.Header>
          <Dialog.Footer>
            <Dialog.Close render={<Button variant="outline" />}>Keep orders</Dialog.Close>
            <Button
              variant="destructive"
              onClick={() => {
                window.alert(`Cancelling ${pendingCancel?.orders.length} order(s)`);
                pendingCancel?.clearSelection();
                setPendingCancel(null);
              }}
            >
              Cancel orders
            </Button>
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog.Root>
    </>
  );
}
