---
"@tailor-platform/app-shell": patch
---

DataTable filter and column UI fixes:

- **Filter placement & style**: `DataTable.Filters` now renders the **Add filter** trigger on the **left** by default (was right-aligned), with active chips flowing to its right, and the trigger is **icon-only by default** (the label is kept as an `aria-label`). Pass `addIconOnly={false}` to show the "Add filter" text label. The add-filter popover now anchors to the left edge of the trigger.
- **Pinned columns**: closed a sub-pixel gap between adjacent frozen columns where scrolling rows could bleed through — column offsets are now measured with fractional widths so pinned columns sit flush.
- **Column settings popup**: added a search box at the top that filters the **Scrollable** column list by name, and that list now scrolls within a height cap while the **Fixed left** / **Fixed right** zones and the Show/Hide-all footer stay pinned and always fully visible — so the popup stays within the viewport even with many columns. The scrollable list uses a thin, overlay scrollbar that only appears while scrolling (or on hover) and reserves no width, so column checkboxes stay aligned. Drag-to-reorder and drag-between-zones keep working while searching.
