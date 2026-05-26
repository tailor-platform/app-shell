---
slug: pattern/list/dense-scan
name: Dense Scan List
category: pattern
subcategory: list
description: High-density scannable list backed by GraphQL connections with DataTable, sort, filters, and pagination
requiredImports:
  [
    DataTable,
    useDataTable,
    useCollectionVariables,
    createColumnHelper,
    Layout,
    Card,
    Button,
    Badge,
    Link,
    Menu,
    Tabs,
  ]
tags: [table, bulk-action, filter, pagination, datatable, connection]
do:
  - Browsing many records of one entity type (orders, POs, products) with GraphQL pagination
  - Operators sort, filter, and select rows; row click navigates to detail
  - Optionally a bucket control (Tabs) aligned to one categorical dimension (status, type)
dont:
  - Side-by-side match/reconcile views comparing two grids
  - A tiny/static list where DataTable would be heavyweight — use Table.Root manually
  - Inline editable cells — use pattern/detail or pattern/form/modal instead
---

# pattern/list/dense-scan

## When to Use

- Browsing many records of one entity type (orders, POs, products, invoices) with GraphQL pagination
- Operators sort, filter, and select rows; row click navigates to detail
- Optionally: a bucket control (`Tabs`, segmented buttons) aligned to one categorical dimension the business cares about (status, fulfillment stage, type)

## Column Definition

<!-- source: columns.tsx -->

## Page Implementation

<!-- source: dense-scan.tsx -->

## Variants

- **Toolbar chips only (`DataTable.Filters`)** — best when filters map cleanly to typed column metadata / enum facets
- **Tabs only above `DataTable`** — best when workflows are organized as obvious buckets
- **Tabs + chips** — when buckets are primary and finer filters help
- **Bulk selection** — `onSelectionChange` hook on `useDataTable`; combine with `interaction/multi-select`
- **`Table` primitives** — small static lists without collection hooks

## Constraints

- Column count: 4-8 recommended
- Must include pagination — never render unbounded lists
- Status Badge colors must use design system tokens (variant prop)
- Bulk actions toolbar appears only when ≥1 row is selected
- Whole row is clickable via `onClickRow`; no per-row "View" / "Open" buttons
- Per-row `Menu` (overflow `…`) is reserved for non-navigation actions (Archive, Duplicate, Delete)

## Anti-patterns

- Building a bespoke table + custom pagination instead of `DataTable` + `useCollectionVariables`
- Tabs that mutate only local UI state while pagination/filters assume the full server set
- Using `<table>` directly instead of `<DataTable>` for live collections
- Client-side filtering on 1000+ records without server-side support
- Inline editable cells — use `pattern/detail/*` or `pattern/form/modal` instead
- Per-row "View" / "Open" buttons duplicating the row-click navigation
