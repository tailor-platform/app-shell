---
"@tailor-platform/app-shell": minor
---

LineItems: new `useLineItemsGroup({ a, b, ... })` hook.

Composes multiple `useLineItems` hooks into a single document-level boundary. Use it when one header record owns more than one ordered list of lines — e.g. a Journal Entry with `debits` + `credits` that must balance, or a Work Order with `componentLines` + `operationLines`. Each collection still gets its own table + selection + dirty tracking; the group helper provides:

- `isDirty` — `true` when **any** member is dirty
- `getChangeSet()` — keyed bundle `{ isEmpty, [memberName]: ChangeSet }` so the page-level submit handler dispatches one transactional mutation
- `reset()` / `revert()` — fan out to every member at once

See the new `journal-entry-demo` for a complete worked example with a balance-check header derived from both collections.
