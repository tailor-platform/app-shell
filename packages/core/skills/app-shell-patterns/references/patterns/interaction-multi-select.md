---
slug: pattern/interaction/multi-select
name: Multi Select
category: pattern
subcategory: interaction
description: Floating bottom action bar for bulk operations on selected list rows
requiredImports: [Table, Checkbox, Button, Menu]
tags: [bulk, selection, toolbar, floating-bar, multi-select, batch]
do:
  - ANY list page where rows can be acted on in bulk (archive, assign, export, approve, delete)
  - Selection is initiated by clicking a leading-column checkbox on rows
  - Selection state needs to persist across pagination and filter changes
dont:
  - A list where bulk action is genuinely impossible (single-select only)
  - A pure picker/selector inside a Dialog whose footer already gates the action
  - Destructive bulk action triggered without confirmation — pair with interaction/confirm
---

# pattern/interaction/multi-select

## When to Use

- ANY list page where rows can be acted on in bulk (archive, assign, export, approve, delete)
- Selection is initiated by clicking a leading-column checkbox on rows
- Selection state needs to persist across pagination and filter changes

## Layout

Floating action bar appears the moment selection count goes from 0 → 1, anchored to the bottom of the viewport, centered horizontally, with elevation. It disappears when selection returns to 0.

```
+---------------------------------------------------------+
| Layout.Header   title              [Filter] [Create]    |
+---------------------------------------------------------+
| Layout.Column                                           |
|  Table.Root                                             |
|   [x] | Col   | Col   | Col   | Col                    |
|   [x] | row   | row   | row   | row                    |
|   [ ] | row   | row   | row   | row                    |
|   [x] | row   | row   | row   | row                    |
|                                                         |
|        +--------------------------------------+         |
|        | 3 selected  [Archive] [Export] [⋯] [Clear] |   |
|        +--------------------------------------+         |
+---------------------------------------------------------+
```

## Page Implementation

```tsx
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
```

## Constraints

- Count label + Clear button are always present in the bar
- Max 3 inline action buttons — 4th onward collapse behind an overflow `Menu`
- Destructive bulk actions MUST open an `interaction/confirm` dialog
- Filter or sort change must NOT silently clear the selection
- Pagination MUST preserve selection across pages

## Anti-patterns

- Placing bulk-action buttons in the page header — bulk actions belong only in the floating bar
- Hiding the bar behind row hover or right-click — bar must be visible when selection > 0
- Omitting the count or the Clear affordance — both are mandatory
- Letting filter/sort changes silently drop selection
- Firing destructive bulk actions without an interaction/confirm step
- Per-row `Menu` actions as a substitute for bulk actions when selection > 0
