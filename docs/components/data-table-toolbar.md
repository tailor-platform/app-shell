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

| Prop                 | Type             | Default | Description                                                                                                                                                                    |
| -------------------- | ---------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `children`           | `ReactNode`      | —       | Toolbar content, left-aligned. Use `DataTable.ToolbarRow` for explicit rows.                                                                                                   |
| `showFilters`        | `boolean`        | `false` | Render the **Add filter** trigger and active chips in their default position. Requires `control`.                                                                              |
| `showColumnSettings` | `boolean`        | `false` | Render the **Columns** control (show/hide + reorder + pin) anchored top-right. Persists per-user via `tableId`. Replaces `columnSettings` — see [Deprecations](#deprecations). |
| `direction`          | `"row" \| "col"` | `"col"` | How children are laid out. `"row"` wraps them in a single `DataTable.ToolbarRow`; `"col"` stacks them. See [Layout defaults](#layout-defaults).                                |
| `columnSettings`     | `boolean`        | `false` | **Deprecated** — renamed to `showColumnSettings`. See [Deprecations](#deprecations).                                                                                           |
| `className`          | `string`         | —       | Additional CSS class, merged onto the toolbar container. See [Styling](#styling).                                                                                              |

### `DataTable.ToolbarRow` Props

| Prop         | Type        | Default | Description                                                         |
| ------------ | ----------- | ------- | ------------------------------------------------------------------- |
| `children`   | `ReactNode` | —       | Row content, laid out horizontally from the left.                   |
| `endSection` | `ReactNode` | —       | Content aligned to the row's right-hand edge.                       |
| `gap`        | `number`    | `2`     | Space between children, on the theme's spacing scale.               |
| `className`  | `string`    | —       | Additional CSS class, merged onto the row. See [Styling](#styling). |

### `DataTable.ColumnSettings` Props

| Prop        | Type     | Default | Description                                                                             |
| ----------- | -------- | ------- | --------------------------------------------------------------------------------------- |
| `className` | `string` | —       | Additional CSS class, applied to a wrapper around the control. See [Styling](#styling). |

### `DataTable.Separator` Props

| Prop        | Type     | Default | Description                                                                                                                |
| ----------- | -------- | ------- | -------------------------------------------------------------------------------------------------------------------------- |
| `className` | `string` | —       | Additional CSS class, applied to a wrapper around the rule — this is also how you set its height. See [Styling](#styling). |

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

### `direction`

For the common case — a handful of controls side by side — `direction="row"` wraps every child in a single `ToolbarRow` for you, so you don't have to nest one by hand:

```tsx
// These two are equivalent.
<DataTable.Toolbar showFilters direction="row">
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

`direction="col"` is the opposite instruction: stack the children. It matches today's default, so setting it explicitly changes nothing right now.

`direction="row"` is ignored when **any** child is already a `DataTable.ToolbarRow` — including when every child is one, which is the ordinary multi-row toolbar. Wrapping rows in a row would lay them side by side rather than stacked, so the wrap is skipped and a development warning is logged.

> **Changing in the next major.** `direction` will default to `"row"`, wrapping bare children in an implicit `ToolbarRow`. Two forward-compatible moves you can make today:
>
> - **Want horizontal?** Set `direction="row"` now, and drop it after the major.
> - **Relying on stacking?** Set `direction="col"` now. It is a no-op today and preserves your layout through the flip.

## Styling

`className` behaves differently depending on whether you are **placing** a component or **composing into** one, because those two jobs need different things.

### Placed components — `Filters`, `ColumnSettings`, `Separator`

These are dropped into a layout you wrote, so what you need is to position and size them. Their `className` is applied to a **wrapper element that carries no app-shell classes**, so your classes never compete with the component's internals and never depend on stylesheet order to win:

```tsx
<DataTable.ToolbarRow>
  <DataTable.Filters className="max-w-md flex-1" />
  <DataTable.Separator className="h-6" />
  <DataTable.ColumnSettings className="ml-auto" />
</DataTable.ToolbarRow>
```

The wrapper is what makes `DataTable.Separator className="h-6"` work at all: the rule itself is `h-full`, so it takes the height of whatever box it is given.

### Containers — `Toolbar`, `ToolbarRow`

These hold **your** children, and you already own the element they sit in, so a wrapper would add a DOM node without adding capability. Their `className` is merged onto the container itself.

That means it can set anything the container does not already set — `margin`, `max-width`, `background`, `position`:

```tsx
<DataTable.ToolbarRow className="mb-2 max-w-3xl">…</DataTable.ToolbarRow>
```

`DataTable.Toolbar` sets `padding`, `border-bottom` and `gap` on that element, so classes touching those three are unreliable: your class and app-shell's are both single-class selectors on the same property, so the winner depends on CSS source order rather than on which one you wrote. If you need to change them, say so on the ticket rather than reaching for `!important` — the fix is a prop, not a class.

### Internal layout is always a prop

No `className` — merged or wrappered — can change how a component arranges its own children. `flex-direction`, `gap` and `align-items` belong to the element that directly contains those children, and that element is never the one you styled:

| To change                           | Use                                    |
| ----------------------------------- | -------------------------------------- |
| Direction of the toolbar's children | `direction` on `DataTable.Toolbar`     |
| Space between a row's children      | `gap` on `DataTable.ToolbarRow`        |
| Right-alignment of a group          | `endSection` on `DataTable.ToolbarRow` |

`data-slot` attributes stay on the inner elements rather than on any wrapper, so CSS already written against `[data-slot="data-table-toolbar"]` keeps matching the element it always matched.

## Deprecations

| Deprecated       | Replacement          | Removed    |
| ---------------- | -------------------- | ---------- |
| `columnSettings` | `showColumnSettings` | Next major |

`columnSettings` still works and is equivalent to `showColumnSettings`. Passing it logs a one-time development warning. The rename aligns the two built-in controls (`showFilters` / `showColumnSettings`) so the prop name matches its sub-component counterpart.

## Open questions

_This section is for review and will be removed before the API ships._

1. **`DataTable.Filters` vs. `DataTable.ColumnFilters`.** The proposal named the filters escape hatch `ColumnFilters`, for symmetry with `ColumnSettings`. `DataTable.Filters` already exists and is the escape hatch today, so this doc keeps that name. Renaming buys symmetry at the cost of a deprecation cycle on a component shipped in 1.10.0 — worth it or not?
2. **Where the wrapper applies.** This doc wrappers the placed sub-components and merges on the two containers (see [Styling](#styling)). Worth confirming, along with two consequences. Configuring a `twMerge` prefix does **not** fix cross-boundary conflicts: `cn()` dedupes within one class string, so a consumer's unprefixed `gap-4` and app-shell's `astw:gap-2` are two unrelated classes that both survive and are resolved by source order, whichever way the prefix is configured. And `DataTable.Toolbar`'s own `padding` / `border-bottom` stay unreliable to override under either model — if there is real demand, they want props. Does `gap` also want `rowGap` / `colGap` siblings?
3. **`endSection` prop vs. nested sub-component.** The prop matches house style (`DescriptionCard.headerAction`, `Layout.Header.actions`, `Sheet.Header.action`) and is documented here. A `DataTable.ToolbarSection align="start" | "end"` sub-component would take its own `className`, compose conditionally, and allow more than one node without a fragment. Toolbar end sections are usually groups rather than single nodes, which argues for the sub-component.
4. **`DataTable.Separator` vs. the `Separator` primitive.** `packages/core/src/components/separator.tsx` already implements this with an `orientation` prop, but is not exported from `index.ts`. Options: export `Separator` and drop `DataTable.Separator`, or keep the namespaced one as a preset over it. Note the primitive's vertical variant is `h-full w-px`, which collapses in a centred row without an explicit height.
5. **Implicit-row timing.** The default flip is deferred to the next major here. In this repo, 7 of 8 `DataTable.Toolbar` usages pass a single child and are unaffected; the exception is the split-slot recipe above, which wants stacking. A scan of consumer repos would size the real blast radius before committing.
