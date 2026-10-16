import { useState } from "react";
import {
  Button,
  DataTable,
  Dialog,
  useDataTable,
  type Column,
  type SelectionAction,
  type SelectionActionHelpers,
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

type PendingCancel = { ids: string[]; run: SelectionActionHelpers["run"] };

// Stand-ins for backend operations over the complete dataset, not the table's row cache.
const cancelOrders = async (ids: string[]) => {
  const cancelledIds = mockOrders
    .filter((order) => ids.includes(order.id) && order.status !== "Shipped")
    .map((order) => order.id);
  window.alert(`Cancelling ${cancelledIds.length} order(s)`);
  return cancelledIds;
};
const confirmOrders = async (ids: string[]) => {
  const confirmedIds = mockOrders
    .filter((order) => ids.includes(order.id) && order.status === "Open")
    .map((order) => order.id);
  window.alert(`Confirming ${confirmedIds.length} order(s)`);
  return confirmedIds;
};
const exportOrders = async (ids: string[]) => {
  window.alert(`Exporting ${ids.length} order(s)`);
};

export function InteractionMultiSelect() {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [pendingCancel, setPendingCancel] = useState<PendingCancel | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  const removeCompletedIds = (ids: string[]) => {
    const completed = new Set(ids);
    setSelectedIds((current) => current.filter((id) => !completed.has(id)));
  };

  const selectionActions: SelectionAction[] = [
    {
      id: "confirm",
      label: "Confirm",
      // The operation returns actual successes; never clear ineligible or newer selections.
      onClick: async (ids) => removeCompletedIds(await confirmOrders(ids)),
    },
    {
      id: "export",
      label: "Export",
      onClick: (ids) => exportOrders(ids),
    },
    {
      id: "assign",
      label: "Assign owner",
      onClick: async (ids) => window.alert(`Assigning ${ids.length} order(s)`),
    },
    {
      // 4th action: lands in the More actions menu.
      id: "cancel",
      label: "Cancel",
      variant: "destructive",
      onClick: (ids, { run }) => {
        setCancelError(null);
        setPendingCancel({ ids: [...ids], run });
      },
    },
  ];

  // In a real app, fetch eligibility for these snapshot ids before showing this explanation.
  const cancellableCount = mockOrders.filter(
    (order) => pendingCancel?.ids.includes(order.id) && order.status !== "Shipped",
  ).length;

  const table = useDataTable({
    columns,
    data: { rows: mockOrders, total: mockOrders.length },
    rowSelection: { selectedIds, onChange: setSelectedIds },
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
          if (!open && !cancelling) setPendingCancel(null);
        }}
      >
        <Dialog.Content>
          <Dialog.Header>
            <Dialog.Title>Cancel selected orders?</Dialog.Title>
            <Dialog.Description>
              {cancellableCount} of {pendingCancel?.ids.length ?? 0} selected orders can be
              cancelled; shipped orders are excluded. Cancelled orders can&apos;t be reopened.
            </Dialog.Description>
          </Dialog.Header>
          {cancelError && <p role="alert">{cancelError}</p>}
          <Dialog.Footer>
            <Dialog.Close render={<Button variant="outline" disabled={cancelling} />}>
              Keep orders
            </Dialog.Close>
            <Button
              variant="destructive"
              disabled={cancelling || cancellableCount === 0}
              onClick={async () => {
                if (!pendingCancel || cancelling) return;
                setCancelling(true);
                setCancelError(null);
                try {
                  const cancelledIds = await pendingCancel.run(cancelOrders(pendingCancel.ids));
                  removeCompletedIds(cancelledIds);
                  setPendingCancel(null);
                } catch {
                  setCancelError("Cancellation failed. Please try again.");
                } finally {
                  setCancelling(false);
                }
              }}
            >
              {cancelling ? "Cancelling…" : "Cancel orders"}
            </Button>
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog.Root>
    </>
  );
}
