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

Add your own content as children. It is left-aligned, and sits alongside the built-in controls:

```tsx
<DataTable.Root value={table}>
  <DataTable.Toolbar showFilters showColumnSettings>
    <CustomSearchBox />
  </DataTable.Toolbar>
  <DataTable.Table />
</DataTable.Root>
```

## Rows

`DataTable.ToolbarRow` lays its children out horizontally with a gap sized for comfortable tap targets. Use it to place children side by side in a single row with sensible spacing, or to give the toolbar more than one line:

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

| Prop                 | Type        | Default | Description                                                                                                                                                                     |
| -------------------- | ----------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `children`           | `ReactNode` | —       | Toolbar content, left-aligned. Use `DataTable.ToolbarRow` for explicit rows.                                                                                                    |
| `showFilters`        | `boolean`   | `false` | Render the **Add filter** trigger and active chips in their default position. Requires `control`.                                                                               |
| `showColumnSettings` | `boolean`   | `false` | Render the **Columns** control (show/hide + reorder + pin) anchored top-right. Persists per-user via `tableId`. Replaces `columnSettings` — see [Deprecations](#deprecations).  |
| `row`                | `boolean`   | `false` | Wrap all children in a single `DataTable.ToolbarRow`, laying them out horizontally. See [Layout defaults](#layout-defaults).                                                    |
| `col`                | `boolean`   | `false` | Stack children vertically. This is the current default, so passing it changes nothing today — it is the forward-compatible way to keep stacking once `row` becomes the default. |
| `columnSettings`     | `boolean`   | `false` | **Deprecated** — renamed to `showColumnSettings`. See [Deprecations](#deprecations).                                                                                            |
| `className`          | `string`    | —       | Additional CSS class. Applied to an outer wrapper — see [Styling](#styling).                                                                                                    |

### `DataTable.ToolbarRow` Props

| Prop         | Type        | Default | Description                                                                  |
| ------------ | ----------- | ------- | ---------------------------------------------------------------------------- |
| `children`   | `ReactNode` | —       | Row content, laid out horizontally from the left.                            |
| `endSection` | `ReactNode` | —       | Content aligned to the row's right-hand edge.                                |
| `gap`        | `number`    | `2`     | Space between children, on the theme's spacing scale.                        |
| `className`  | `string`    | —       | Additional CSS class. Applied to an outer wrapper — see [Styling](#styling). |

### `DataTable.ColumnSettings` Props

| Prop        | Type     | Default | Description                                                                  |
| ----------- | -------- | ------- | ---------------------------------------------------------------------------- |
| `className` | `string` | —       | Additional CSS class. Applied to an outer wrapper — see [Styling](#styling). |

### `DataTable.Separator` Props

| Prop        | Type     | Default | Description                                                                  |
| ----------- | -------- | ------- | ---------------------------------------------------------------------------- |
| `className` | `string` | —       | Additional CSS class. Applied to an outer wrapper — see [Styling](#styling). |

## Layout defaults

`DataTable.ToolbarRow` is the only element that sets a direction: it is a horizontal flex row with `gap` spacing and vertically centred items.

Children passed directly to `DataTable.Toolbar` — without a `ToolbarRow` — stack vertically and stretch to full width. This is why `DataTable.Filters` renders on its own line in the split-slot recipe:

```tsx
<DataTable.Toolbar>
  <div className="flex items-center justify-between">
    <MyViewTabs />
    <DataTable.Filters slot="add" />
  </div>
  <DataTable.Filters slot="chips" />
</DataTable.Toolbar>
```

### `row` and `col`

For the common case — a handful of controls side by side — `row` wraps every child in a single `ToolbarRow` for you, so you don't have to nest one by hand:

```tsx
// These two are equivalent.
<DataTable.Toolbar showFilters row>
  <CustomSearchBox />
  <CustomExportButton />
</DataTable.Toolbar>

<DataTable.Toolbar showFilters>
  <DataTable.ToolbarRow>
    <CustomSearchBox />
    <CustomExportButton />
  </DataTable.ToolbarRow>
</DataTable.Toolbar>
```

`col` is the opposite instruction: stack the children. It matches today's default, so adding it changes nothing right now.

`row` is ignored when **any** child is already a `DataTable.ToolbarRow` — including when every child is one, which is the ordinary multi-row toolbar. Wrapping rows in a row would lay them side by side rather than stacked, so the wrap is skipped and a development warning is logged.

`row` and `col` are mutually exclusive in the type, so passing both is a compile error:

```ts
type ToolbarDirectionProps = { row?: boolean; col?: never } | { row?: never; col?: boolean };
```

```tsx
<DataTable.Toolbar row />            // ok
<DataTable.Toolbar col />            // ok
<DataTable.Toolbar row={isWide} />   // ok — a boolean expression is still one arm
<DataTable.Toolbar row col />        // Type error
```

The component also warns at runtime if both arrive anyway — via a spread, or from JavaScript — and treats `row` as the winner.

> **Changing in the next major.** Bare children will be wrapped in an implicit `ToolbarRow`, making `row` the default. Two forward-compatible moves you can make today:
>
> - **Want horizontal?** Pass `row` now, and drop it after the major.
> - **Relying on stacking?** Pass `col` now. It is a no-op today and preserves your layout through the flip.

## Styling

`className` is applied to an **outer wrapper element that carries no app-shell classes of its own**. Your classes therefore never compete with the component's internal styles, and never depend on stylesheet import order to win.

The trade-off is that `className` styles the box the component sits in, not the component's internals. Use it for the outside — margin, width, background, borders:

```tsx
<DataTable.ToolbarRow className="mb-2 max-w-3xl">…</DataTable.ToolbarRow>
```

`flex-direction`, `gap`, and `align-items` on the wrapper cannot change how children are arranged — those belong to the inner element that actually contains them. A wrapper can set the component's own box (`margin`, `width`, `position`, `overflow`, `background`, `border`) and anything inherited (`color`, `font-*`). Internal layout is controlled by props instead:

| To change                           | Use                                    |
| ----------------------------------- | -------------------------------------- |
| Direction of the toolbar's children | `row` / `col` on `DataTable.Toolbar`   |
| Space between a row's children      | `gap` on `DataTable.ToolbarRow`        |
| Right-alignment of a group          | `endSection` on `DataTable.ToolbarRow` |

`data-slot` attributes stay on the inner elements rather than the wrapper, so CSS already written
against `[data-slot="data-table-toolbar"]` keeps matching the element it always matched.

## Deprecations

| Deprecated       | Replacement          | Removed    |
| ---------------- | -------------------- | ---------- |
| `columnSettings` | `showColumnSettings` | Next major |

`columnSettings` still works and is equivalent to `showColumnSettings`. Passing it logs a one-time development warning. The rename aligns the two built-in controls (`showFilters` / `showColumnSettings`) so the prop name matches its sub-component counterpart.

## Open questions

_This section is for review and will be removed before the API ships._

1. **`DataTable.Filters` vs. `DataTable.ColumnFilters`.** The proposal named the filters escape hatch `ColumnFilters`, for symmetry with `ColumnSettings`. `DataTable.Filters` already exists and is the escape hatch today, so this doc keeps that name. Renaming buys symmetry at the cost of a deprecation cycle on a component shipped in 1.10.0 — worth it or not?
2. **The `className` wrapper contract.** Applying `className` to a bare wrapper (see [Styling](#styling)) avoids conflicts with `astw:`-prefixed internals entirely, which configuring a `twMerge` prefix does not — a consumer writing unprefixed `gap-4` still collides with `astw:gap-2`, and source order decides. The costs: an extra DOM node per component, and no consumer control of internals, which is what makes `row` / `col` / `gap` first-class props rather than classes. Should this contract apply to every app-shell component or only the toolbar surface? And does `gap` want `rowGap` / `colGap` siblings, or is one knob enough?
3. **`endSection` prop vs. nested sub-component.** The prop matches house style (`DescriptionCard.headerAction`, `Layout.Header.actions`, `Sheet.Header.action`) and is documented here. A `DataTable.ToolbarSection align="start" | "end"` sub-component would take its own `className`, compose conditionally, and allow more than one node without a fragment. Toolbar end sections are usually groups rather than single nodes, which argues for the sub-component.
4. **`DataTable.Separator` vs. the `Separator` primitive.** `packages/core/src/components/separator.tsx` already implements this with an `orientation` prop, but is not exported from `index.ts`. Options: export `Separator` and drop `DataTable.Separator`, or keep the namespaced one as a preset over it. Note the primitive's vertical variant is `h-full w-px`, which collapses in a centred row without an explicit height.
5. **Implicit-row timing.** The default flip is deferred to the next major here. In this repo, 7 of 8 `DataTable.Toolbar` usages pass a single child and are unaffected; the exception is the split-slot recipe above, which wants stacking. A scan of consumer repos would size the real blast radius before committing.
