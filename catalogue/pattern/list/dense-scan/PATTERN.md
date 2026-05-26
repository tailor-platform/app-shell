---
slug: pattern/list/dense-scan
name: Dense Scan List
category: pattern
subcategory: list
description: High-density scannable list for browsing large record sets
requiredImports: [DataTable, useDataTable, Button, Badge, Input]
tags: [table, bulk-action, filter, pagination]
do:
  - Displaying 50+ records in a scannable list
  - Status-based filtering is the primary navigation
  - Bulk actions are needed (delete, export, status change)
  - No inline editing — click-through to detail page
dont:
  - Using <table> directly instead of <DataTable>
  - Client-side filtering on 1000+ records without server-side support
  - Inline editable cells — use pattern/detail or pattern/form/modal instead
  - Omitting pagination for simplicity
---

# pattern/list/dense-scan

## When to Use

- Displaying 50+ records in a scannable list
- Status-based filtering is the primary navigation
- Bulk actions are needed (delete, export, status change)
- No inline editing — click-through to detail page

## Column Definition

<!-- source: columns.tsx -->

## Page Implementation

<!-- source: dense-scan.tsx -->

## Constraints

- Column count: 4-8 recommended
- Must include pagination — never render unbounded lists
- Status Badge colors must use design system tokens (variant prop)
- Bulk actions toolbar appears only when ≥1 row is selected

## Anti-patterns

- Using `<table>` directly instead of `<DataTable>`
- Client-side filtering on 1000+ records without server-side support
- Inline editable cells — use `pattern/detail/*` or `pattern/form/modal` instead
- Omitting pagination for "simplicity"
