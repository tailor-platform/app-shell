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

Pass `selectionActions` to `useDataTable`. The moment one row is selected, `DataTable.Footer` becomes the bulk-action bar: a tinted strip with the selection count, the actions, and Clear, with pagination kept on the right. It turns back into the normal footer when the selection empties. In `<Layout fill>` the footer is already pinned; on a page that scrolls, the bar sticks to the bottom of the viewport until the end of the table is reached.

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
|   3 of 240 selected | [Confirm (2)] [Export] [⋯] | Clear   ‹ 1/10 › |
+--------------------------------------------------------------------+
```

## Page Implementation

<!-- example: interaction-multi-select -->

## Constraints

- Declare bulk actions with `selectionActions` on `useDataTable` — do NOT hand-build the bar, a floating panel, or checkbox state; the footer renders the count, actions, overflow menu, and Clear
- Keep `DataTable.Footer` in the tree — it is where the bar renders
- Give an action `appliesTo` when it fits only some rows: the bar shows the eligible count, disables the action at 0, and passes only those rows to `onClick`
- At most 3 actions render inline, in array order; the 4th onward move to the More actions menu — order by frequency and put a destructive action last
- Destructive bulk actions MUST open an `interaction/confirm` dialog from `onClick`
- Call the `clearSelection` helper from `onClick` once an action that changes the rows has succeeded
- Selection persists across pagination, filter, and sort changes — do NOT clear it on those

## Anti-patterns

- Hand-rolled selection (`useState<Set>`, raw `<input type="checkbox">`, `Table.Root`) when the list is a DataTable
- A floating or fixed-position action bar over the table instead of the footer bar
- Placing bulk-action buttons in the page header or the table toolbar
- Counting eligible rows per action by hand instead of `appliesTo`
- Firing destructive bulk actions without an interaction/confirm step
- Per-row `Menu` actions as a substitute for bulk actions when selection > 0
