---
"@tailor-platform/app-shell": minor
---

LineItems: three new `LineItemsFieldType` variants.

- `{ kind: "boolean"; trueLabel?; falseLabel? }` — checkbox cell with full keyboard nav. Default alignment is `center`.
- `{ kind: "date"; min?; max? }` — native `<input type="date">` cell using ISO `yyyy-mm-dd` values. Empty value commits as `null`.
- `{ kind: "custom"; renderEditor; normalize?; equals? }` — escape hatch. Apps drop in any React editor (async product picker, attribute selector, currency-pair input, …). The editor receives `{ value, onCommit, onCancel, row, mode, field }` and routes commits through the standard hook so dirty-tracking and the change-set keep working.

Numeric fields now default to `align: "right"` (with `tabular-nums`); boolean fields default to `align: "center"`. Apps that explicitly set `align` keep their value.
