---
"@tailor-platform/app-shell": minor
---

Show cell-local error popovers by default when DataTable editing callbacks throw or return a rejected Promise. Keep pending and failed drafts editable, wait for a successful `onValueChange` check before confirmation, and clear drafts only after confirmation succeeds; Esc closes open error details first, then discards the draft and error together without trapping cell navigation.
Throw the exported `CellEditError` with a translated, user-facing message to display its text; other failures use localized generic feedback. Custom renderers still receive the original thrown value.
Each new failure automatically opens its popover without moving focus. Close the details without discarding the failed draft, then reopen them with the error icon or Alt+ArrowDown. The standard popover adds no reset action. Customize its body and any consumer-owned actions with `edit.error.render({ row, error })`, or set `edit.error: false` to retain eager edit completion without callback interception. Data adoption, persistence, and rollback remain consumer-owned.

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

The standard error popover needs no configuration. To replace only its body, add `error` alongside `onValueCommitted` in the column's `edit` config:

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

Use `error: false` instead when the callback handles its own failures and feedback.
