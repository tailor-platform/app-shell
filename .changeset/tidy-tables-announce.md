---
"@tailor-platform/app-shell": minor
---

Expose the 1-based `sortIndex` (undefined when unsorted) and active-key `sortCount` in sortable DataTable `header(ctx)` and `headerProps(ctx)` callbacks, without changing built-in header visuals. After narrowing with `ctx.sortable`, read `ctx.sortIndex` and `ctx.sortCount` to access sort priority without using table context.

Add `aria-sort="ascending"` or `"descending"` to the primary sorted header, including custom headers. Unsorted and secondary headers omit the attribute; use the existing `useDataTable().sortStates` array to read all active sorts.
