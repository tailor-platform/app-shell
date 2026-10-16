---
kind: prose
slug: pattern/interaction/multi-select
name: Multi Select
group: interaction-multi-select
title: Multi Select
category: pattern
subcategory: interaction
description: Bulk operations on selected DataTable rows, from a bar that takes over the table footer
requiredImports: [DataTable, useDataTable, Button, Dialog]
tags: [bulk, selection, bulk-actions, footer, multi-select, batch]
do:
  - ANY list page where rows can be acted on in bulk (archive, assign, export, approve, delete)
  - The list is a DataTable — selection and the bulk-action bar are built in; you only declare the actions
  - Some actions apply to only part of a selection (approve only pending rows, delete only archived ones)
dont:
  - A list where bulk action is genuinely impossible (single-select only)
  - A pure picker/selector inside a Dialog whose footer already gates the action
  - Destructive bulk action triggered without confirmation — pair with interaction/confirm
---

# pattern/interaction/multi-select

## When to Use

- ANY list page where rows can be acted on in bulk (archive, assign, export, approve, delete)
- The list is a `DataTable` — selection and the bulk-action bar are built in; you only declare the actions
- Some actions apply to only part of a selection (approve only pending rows, delete only archived ones)

## Layout

Pass `rowSelection.actions` to `useDataTable`. The moment one row is selected, `DataTable.Footer` becomes the bulk-action bar: a tinted strip with the selection count, the actions, and Clear, with pagination kept on the right. It turns back into the normal footer when the selection empties. In `<Layout fill>` the footer is already pinned; on a page that scrolls, the bar sticks to the bottom of the viewport until the end of the table is reached.

```
+--------------------------------------------------------------------+
| Layout.Header   title                                  [Create]    |
+--------------------------------------------------------------------+
| Layout.Column                                                      |
|  DataTable.Root                                                    |
|   Toolbar   [Filters]                                  [Columns]   |
|   [x] | Col   | Col   | Col   | Col                                |
|   [x] | row   | row   | row   | row                                |
|   [ ] | row   | row   | row   | row                                |
|   [x] | row   | row   | row   | row                                |
|   DataTable.Footer, while rows are selected:                       |
|   3 of 240 selected | [Confirm] [Export] [⋯] | Clear       ‹ 1/10 › |
+--------------------------------------------------------------------+
```

## Page Implementation

<!-- example: interaction-multi-select -->

## Constraints

- Declare bulk actions as the non-generic `SelectionAction[]` in `useDataTable`'s `rowSelection.actions` — do NOT hand-build the bar, a floating panel, or checkboxes; the footer renders the selection count, actions, overflow menu, and Clear. Providing `rowSelection` enables checkboxes even when `actions` is omitted or empty; the bar requires non-empty actions and selected ids
- Keep `DataTable.Footer` in the tree — it is where the bar renders
- `onClick` receives a click-time copy of all selected ids (`string[]`), including unloaded ids. `selectedRows` is only a partial cache, not the operation payload
- The consumer owns eligibility checks, required fetching, confirmation UI, and execution; backend validation remains authoritative. Selection actions have no row-based `canApply`, automatic eligible count, or eligibility-based disabled state
- Return the promise from `onClick` for async work: the bar disables its actions and shows a spinner while it runs. Success and rejection both leave selection unchanged; there is no `keepSelection` option. Rejections are logged; show errors in the consumer UI
- Use controlled `rowSelection: { selectedIds, onChange }` to remove only ids actually changed, with a functional update against the current selection. Preserve ineligible ids and ids selected after the operation started; cancellation or failure does not clear selection
- At most 3 actions render inline, in array order; the 4th onward move to the More actions menu — order by frequency and put a destructive action last
- Destructive bulk actions MUST open an `interaction/confirm` dialog from `onClick`. Optionally keep the `run` helper and pass it the later request (`await run(deleteRows(ids))`) for pending tracking only. `clearSelection` explicitly clears every page when that is intentional
- Share only presentation fields (`id`, `label`, `icon`, `variant`) as a non-generic `DataTableAction`. `RowAction<TRow>` retains `canApply` for its concrete row; bulk eligibility belongs in the ID-based consumer workflow
- Selection persists across pagination, filter, and sort changes — do NOT clear it on those

## Anti-patterns

- Hand-rolled selection (`useState<Set>`, raw `<input type="checkbox">`, `Table.Root`) when the list is a DataTable
- A floating or fixed-position action bar over the table instead of the footer bar
- Placing bulk-action buttons in the page header or the table toolbar
- Treating loaded `selectedRows` as the full selection or deriving bulk eligibility from the table's partial cache
- Clearing the whole selection after partial success, or overwriting it with the click-time snapshot and losing newer selections
- Fire-and-forget async `onClick` that doesn't return its promise or use `run` — users can fire it twice
- Firing destructive bulk actions without an interaction/confirm step
- Per-row `Menu` actions as a substitute for bulk actions when selection > 0
