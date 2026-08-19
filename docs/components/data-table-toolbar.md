---
title: DataTable Toolbar
description: Toolbar layout for DataTable — built-in filter and column-settings controls, multi-row layouts, aligned sections, and placement escape hatches
---

# DataTable Toolbar

`DataTable.Toolbar` is the strip above the table that holds filters, search, and actions. It handles two jobs:

- **Built-in controls.** Boolean props put the filter and column-settings controls in their conventional positions, so the common toolbar is one line of JSX.
- **Custom content.** Rows and sections lay out your own components — search boxes, view switchers, export buttons — without fighting the toolbar's internal styles.

The rule that decides which to reach for:

> **Boolean prop = default placement. Sub-component = custom placement.** Never both for the same control.

## Import

```tsx
import { DataTable } from "@tailor-platform/app-shell";
```

## Basic usage

Pass `showFilters` and `showColumnSettings` and the toolbar assembles itself — the **Add filter** trigger and chips on the left, the **Columns** control pinned right:

```tsx
<DataTable.Root value={table}>
  <DataTable.Toolbar showFilters showColumnSettings />
  <DataTable.Table />
</DataTable.Root>
```

Add your own content as children. It sits alongside the built-in controls:

```tsx
<DataTable.Root value={table}>
  <DataTable.Toolbar showFilters showColumnSettings>
    <CustomSearchBox />
  </DataTable.Toolbar>
  <DataTable.Table />
</DataTable.Root>
```

## Rows

`DataTable.ToolbarRow` lays its children out horizontally with a gap sized for comfortable tap targets. Use it when the toolbar needs more than one line:

```tsx
<DataTable.Toolbar showColumnSettings>
  <DataTable.ToolbarRow>
    <CustomSearchBox />
    <CustomViewTabs />
  </DataTable.ToolbarRow>
  <DataTable.ToolbarRow>
    <DataTable.Filters />
  </DataTable.ToolbarRow>
</DataTable.Toolbar>
```

Rows stack vertically in the order given. Each row is independent — a row whose contents wrap (filter chips, for example) grows without pushing the other rows out of alignment.

### Aligning content to the right

A row's `endSection` renders at its right-hand edge, with your children filling from the left:

```tsx
<DataTable.Toolbar showFilters showColumnSettings>
  <DataTable.ToolbarRow endSection={<CustomDownloadCSV />}>
    <CustomSearchBox />
    <CustomAIMagicButton />
  </DataTable.ToolbarRow>
</DataTable.Toolbar>
```

### Separators

`DataTable.Separator` draws a short vertical rule in the border colour, for visually grouping controls within a row:

```tsx
<DataTable.ToolbarRow>
  <CustomSearchBox />
  <DataTable.Separator />
  <CustomAIMagicButton />
</DataTable.ToolbarRow>
```

## Custom placement

When a built-in control needs to go somewhere the boolean props don't put it, drop the boolean and place the sub-component yourself. These are the toolbar's escape hatches — reach for them only when default placement doesn't fit, because you take on positioning in exchange.

| Control         | Default placement    | Escape hatch               |
| --------------- | -------------------- | -------------------------- |
| Filters         | `showFilters`        | `DataTable.Filters`        |
| Column settings | `showColumnSettings` | `DataTable.ColumnSettings` |

```tsx
// Column settings next to the search box instead of pinned right.
<DataTable.Toolbar showFilters>
  <DataTable.ToolbarRow>
    <CustomSearchBox />
    <DataTable.Separator />
    <DataTable.ColumnSettings />
  </DataTable.ToolbarRow>
</DataTable.Toolbar>
```

Setting the boolean **and** placing the sub-component renders the control twice. In development the toolbar warns and renders only the sub-component.

`DataTable.Filters` can be split further with its `slot` prop — see [DataTable → `DataTable.Filters` Props](./data-table.md#datatablefilters-props).

## Props

### `DataTable.Toolbar` Props

| Prop                 | Type        | Default | Description                                                                                                     |
| -------------------- | ----------- | ------- | --------------------------------------------------------------------------------------------------------------- |
| `children`           | `ReactNode` | —       | Toolbar content. Use `DataTable.ToolbarRow` for multi-row layouts.                                              |
| `showFilters`        | `boolean`   | `false` | Render the **Add filter** trigger and active chips in their default position. Requires `control`.               |
| `showColumnSettings` | `boolean`   | `false` | Render the **Columns** control (show/hide + reorder + pin) anchored top-right. Persists per-user via `tableId`. |
| `columnSettings`     | `boolean`   | `false` | **Deprecated** — renamed to `showColumnSettings`. See [Deprecations](#deprecations).                            |
| `className`          | `string`    | —       | Additional CSS class for the toolbar container.                                                                 |

### `DataTable.ToolbarRow` Props

| Prop         | Type        | Default | Description                                           |
| ------------ | ----------- | ------- | ----------------------------------------------------- |
| `children`   | `ReactNode` | —       | Row content, laid out horizontally from the left.     |
| `endSection` | `ReactNode` | —       | Content aligned to the row's right-hand edge.         |
| `gap`        | `number`    | `2`     | Space between children, on the theme's spacing scale. |
| `className`  | `string`    | —       | Additional CSS class for the row.                     |

### `DataTable.ColumnSettings` Props

| Prop        | Type     | Default | Description                           |
| ----------- | -------- | ------- | ------------------------------------- |
| `className` | `string` | —       | Additional CSS class for the control. |

### `DataTable.Separator` Props

| Prop        | Type     | Default | Description                        |
| ----------- | -------- | ------- | ---------------------------------- |
| `className` | `string` | —       | Additional CSS class for the rule. |

## Layout defaults

`DataTable.ToolbarRow` is the only element that sets a direction: it is a horizontal flex row with `gap` spacing and vertically centred items.

Children passed directly to `DataTable.Toolbar` — without a `ToolbarRow` — currently stack vertically and stretch to full width. This is why `DataTable.Filters` renders on its own line in the split-slot recipe:

```tsx
<DataTable.Toolbar>
  <div className="flex items-center justify-between">
    <MyViewTabs />
    <DataTable.Filters slot="add" />
  </div>
  <DataTable.Filters slot="chips" />
</DataTable.Toolbar>
```

> **Changing in the next major.** Bare children will be wrapped in a single implicit `ToolbarRow`, making them horizontal by default. Toolbars that rely on stacking should wrap each line in its own `DataTable.ToolbarRow` — that is forward-compatible and can be done today.

## Deprecations

| Deprecated       | Replacement          | Removed    |
| ---------------- | -------------------- | ---------- |
| `columnSettings` | `showColumnSettings` | Next major |

`columnSettings` still works and is equivalent to `showColumnSettings`. Passing it logs a one-time development warning. The rename aligns the two built-in controls (`showFilters` / `showColumnSettings`) so the prop name matches its sub-component counterpart.

## Open questions

_This section is for review and will be removed before the API ships._

1. **`DataTable.Filters` vs. `DataTable.ColumnFilters`.** The proposal named the filters escape hatch `ColumnFilters`, for symmetry with `ColumnSettings`. `DataTable.Filters` already exists and is the escape hatch today, so this doc keeps that name. Renaming buys symmetry at the cost of a deprecation cycle on a component shipped in 1.10.0 — worth it or not?
2. **Gap props.** Only `gap` on `ToolbarRow` is documented here. `rowGap` / `colGap` were proposed too. The underlying reason `className` can't already do this is that `cn()` is bare `twMerge(clsx(...))` with no `astw:` prefix configured, so prefixed utilities never resolve conflicts. Configuring the prefix fixes overrides for **every** component; adding gap props fixes one. Do both, or just the prefix?
3. **`endSection` prop vs. nested sub-component.** The prop matches house style (`DescriptionCard.headerAction`, `Layout.Header.actions`, `Sheet.Header.action`) and is documented here. A `DataTable.ToolbarSection align="start" | "end"` sub-component would take its own `className`, compose conditionally, and allow more than one node without a fragment. Toolbar end sections are usually groups rather than single nodes, which argues for the sub-component.
4. **`DataTable.Separator` vs. the `Separator` primitive.** `packages/core/src/components/separator.tsx` already implements this with an `orientation` prop, but is not exported from `index.ts`. Options: export `Separator` and drop `DataTable.Separator`, or keep the namespaced one as a preset over it. Note the primitive's vertical variant is `h-full w-px`, which collapses in a centred row without an explicit height.
5. **Implicit-row timing.** The default flip is deferred to the next major here. In this repo, 7 of 8 `DataTable.Toolbar` usages pass a single child and are unaffected; the exception is the split-slot recipe above, which wants stacking. A scan of consumer repos would size the real blast radius before committing.
