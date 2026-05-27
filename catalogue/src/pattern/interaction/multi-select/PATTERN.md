---
slug: pattern/interaction/multi-select
name: Multi Select
category: pattern
subcategory: interaction
description: Floating bottom action bar for bulk operations on selected list rows
requiredImports: [Table, Checkbox, Button, Menu]
tags: [bulk, selection, toolbar, floating-bar, multi-select, batch]
do:
  - ANY list page where rows can be acted on in bulk (archive, assign, export, approve, delete)
  - Selection is initiated by clicking a leading-column checkbox on rows
  - Selection state needs to persist across pagination and filter changes
dont:
  - A list where bulk action is genuinely impossible (single-select only)
  - A pure picker/selector inside a Dialog whose footer already gates the action
  - Destructive bulk action triggered without confirmation — pair with interaction/confirm
---

# pattern/interaction/multi-select

## When to Use

- ANY list page where rows can be acted on in bulk (archive, assign, export, approve, delete)
- Selection is initiated by clicking a leading-column checkbox on rows
- Selection state needs to persist across pagination and filter changes

## Layout

Floating action bar appears the moment selection count goes from 0 → 1, anchored to the bottom of the viewport, centered horizontally, with elevation. It disappears when selection returns to 0.

```
+---------------------------------------------------------+
| Layout.Header   title              [Filter] [Create]    |
+---------------------------------------------------------+
| Layout.Column                                           |
|  Table.Root                                             |
|   [x] | Col   | Col   | Col   | Col                    |
|   [x] | row   | row   | row   | row                    |
|   [ ] | row   | row   | row   | row                    |
|   [x] | row   | row   | row   | row                    |
|                                                         |
|        +--------------------------------------+         |
|        | 3 selected  [Archive] [Export] [⋯] [Clear] |   |
|        +--------------------------------------+         |
+---------------------------------------------------------+
```

## Page Implementation

<!-- source: multi-select.tsx -->

## Constraints

- Count label + Clear button are always present in the bar
- Max 3 inline action buttons — 4th onward collapse behind an overflow `Menu`
- Destructive bulk actions MUST open an `interaction/confirm` dialog
- Filter or sort change must NOT silently clear the selection
- Pagination MUST preserve selection across pages

## Anti-patterns

- Placing bulk-action buttons in the page header — bulk actions belong only in the floating bar
- Hiding the bar behind row hover or right-click — bar must be visible when selection > 0
- Omitting the count or the Clear affordance — both are mandatory
- Letting filter/sort changes silently drop selection
- Firing destructive bulk actions without an interaction/confirm step
- Per-row `Menu` actions as a substitute for bulk actions when selection > 0
