/* pattern: interaction/multi-select */
import { useState } from "react";
import { Button, Table, Menu } from "@tailor-platform/app-shell";
import type { Order } from "./mock";

type Props = {
  orders: Order[];
  onArchive: (ids: string[]) => void;
  onExport: (ids: string[]) => void;
};

export default function MultiSelect({ orders, onArchive, onExport }: Props) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const toggleRow = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedIds.size === orders.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(orders.map((o) => o.id)));
    }
  };

  const clearSelection = () => setSelectedIds(new Set());
  const selectedCount = selectedIds.size;

  return (
    <>
      <Table.Root>
        <Table.Header>
          <Table.Row>
            <Table.Head className="astw:w-10">
              <input
                type="checkbox"
                checked={selectedIds.size === orders.length && orders.length > 0}
                onChange={toggleAll}
                aria-label="Select all on page"
              />
            </Table.Head>
            <Table.Head>Order #</Table.Head>
            <Table.Head>Status</Table.Head>
            <Table.Head>Total</Table.Head>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {orders.map((order) => (
            <Table.Row key={order.id}>
              <Table.Cell>
                <input
                  type="checkbox"
                  checked={selectedIds.has(order.id)}
                  onChange={() => toggleRow(order.id)}
                  aria-label={`Select ${order.number}`}
                />
              </Table.Cell>
              <Table.Cell>{order.number}</Table.Cell>
              <Table.Cell>{order.status}</Table.Cell>
              <Table.Cell>${order.total.toLocaleString()}</Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table.Root>

      {selectedCount > 0 && (
        <div
          role="toolbar"
          aria-label="Bulk actions"
          className="fixed bottom-4 left-1/2 z-30 flex -translate-x-1/2 items-center gap-2 rounded-md border bg-surface-2 px-3 py-2 shadow-lg"
        >
          <span className="text-sm font-medium">{selectedCount} selected</span>
          <Button size="sm" onClick={() => onArchive([...selectedIds])}>
            Archive
          </Button>
          <Button size="sm" variant="outline" onClick={() => onExport([...selectedIds])}>
            Export
          </Button>
          <Menu.Root>
            <Menu.Trigger>
              <Button size="sm" variant="outline" aria-label="More actions">
                ⋯
              </Button>
            </Menu.Trigger>
            <Menu.Content>
              <Menu.Item>Assign owner</Menu.Item>
              <Menu.Item>Tag</Menu.Item>
              <Menu.Separator />
              <Menu.Item>Delete</Menu.Item>
            </Menu.Content>
          </Menu.Root>
          <Button size="sm" variant="ghost" onClick={clearSelection}>
            Clear
          </Button>
        </div>
      )}
    </>
  );
}
