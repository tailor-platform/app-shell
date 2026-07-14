---
"@tailor-platform/app-shell": minor
---

DataTable: sticky/pinned columns and user column settings

- **Pinned columns** — add `pin: "left" | "right"` to a `Column` (requires `width`) to freeze it during horizontal scroll. The selection column auto-pins left and the row-actions column auto-pins right, and a subtle freeze shadow appears at the frozen edge once content is scrolled under it.
- **`DataTable.ColumnSettings`** — a "Columns" toolbar popover to show/hide columns, reorder them (drag), and change pinning by dragging a column between the Fixed left / Scrollable / Fixed right zones.
- **Persisted column layout** — pass a stable `tableId` to `useDataTable` to persist each user's column visibility, order, and pinning to `localStorage` (per-user preference; not stored in the URL). Omit for in-memory-only layout.
- `Table.Root` now accepts an optional `containerRef` for its scroll container.
