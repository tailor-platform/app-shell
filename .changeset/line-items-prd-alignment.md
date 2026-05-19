---
"@tailor-platform/app-shell": major
---

LineItems: align `getChangeSet()` shape with the platform PRD ("Generalized Line-Item Component").

**Breaking** field-name changes inside `LineItemsLineChange`:

- `add` → `{ tempId, data }` (was `{ lineRef, insertAfterLineRef, patch }`). `tempId` is a client-only id; the server should mint the persistent id on insert.
- `update` / `remove` → keyed on `lineId` (was `lineRef`).
- `move` action renamed to `reorder`; payload is `{ lineId, position: number }` — zero-based final index in document order. Replaces the previous after-cursor model.

`LineItemsChangeSet` now carries a top-level `isEmpty: boolean` flag for ergonomic no-op detection (`if (cs.isEmpty) return`).

Migration: rename your switch arms and field reads (e.g. `change.lineRef` → `change.lineId`; `add.patch` → `add.data`; `move`/`afterLineRef` → `reorder`/`position`). Behavior is unchanged — only field names move.
