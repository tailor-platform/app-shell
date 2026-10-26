---
"@tailor-platform/app-shell": minor
---

Add built-in error popovers to DataTable inline editing. When `onValueChange` or `onValueCommitted` throws or returns a rejected Promise, the affected cell shows an error. Throw the exported `CellEditError` with a translated, user-facing message to display that text; other failures display the localized message “Could not confirm this change”.

Alongside this feedback, the editor now retains pending and failed drafts for correction or retry. Confirmation waits for any pending `onValueChange` check to succeed, and the draft clears only after confirmation succeeds. Drafts remain editable without trapping cell navigation; data adoption, persistence, and rollback remain consumer-owned.

Each new failure automatically opens its popover without moving focus. Closing the details retains the draft and error, which can be inspected again with the error icon or Alt+ArrowDown. Esc closes open details first; a subsequent Esc discards the draft and error together. The standard popover adds no reset action.

For example, reject negative quantities with a user-facing message. Invalid drafts remain editable; successful confirmation updates the consumer-owned rows:

```tsx
import { useState } from "react";
import {
  CellEditError,
  DataTable,
  createColumnHelper,
  useDataTable,
} from "@tailor-platform/app-shell";

type Item = { id: string; quantity: number | null };
const { column } = createColumnHelper<Item>();

function EditableItems() {
  const [rows, setRows] = useState<Item[]>([{ id: "item-1", quantity: 5 }]);
  const columns = [
    column({
      id: "quantity",
      label: "Quantity",
      type: "number",
      edit: {
        onValueCommitted: (row, value) => {
          if (value !== null && value < 0) {
            throw new CellEditError("Quantity must be zero or greater");
          }
          setRows((current) =>
            current.map((item) => (item.id === row.id ? { ...item, quantity: value } : item)),
          );
        },
      },
    }),
  ];
  const table = useDataTable({ columns, data: { rows } });

  return (
    <DataTable.Root value={table}>
      <DataTable.Table />
    </DataTable.Root>
  );
}
```

The standard error popover needs no configuration. To customize its body or include consumer-owned actions, add `error.render` to the column's `edit` config. The renderer receives the current row and the original thrown value:

```tsx
error: {
  render: ({ row, error }) => (
    <div>
      <p>Could not update item {row.id}</p>
      <p>{error instanceof CellEditError ? error.message : "Please try again later"}</p>
    </div>
  ),
},
```

If the callback handles its own failures and feedback instead, set `edit.error: false` to disable callback interception and retain eager edit completion.
