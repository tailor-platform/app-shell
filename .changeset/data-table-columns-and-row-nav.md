---
"@tailor-platform/app-shell": minor
---

DataTable: sticky/pinned columns and user column settings

- **Pinned columns** — add `pin: "left" | "right"` to a `Column` to freeze it during horizontal scroll (sticky offsets are measured from the rendered layout; `width` is optional but recommended for stable sizing). The selection column auto-pins left and the row-actions column auto-pins right, with a subtle freeze shadow at the frozen edge once content scrolls under it.
- **Column settings** — pass `columnSettings` to `DataTable.Toolbar` to render a built-in "Columns" control (top-right) that lets users show/hide columns, reorder them (drag), and change pinning by dragging a column between the Fixed left / Scrollable / Fixed right zones.
- **Persisted column layout** — pass a stable `tableId` to `useDataTable` to persist each user's column visibility, order, and pinning to `localStorage` (per-user preference; not stored in the URL). Omit for in-memory-only layout.
- `Table.Root` now accepts an optional `containerRef` for its scroll container.
