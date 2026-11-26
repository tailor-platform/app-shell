---
kind: code-backed
group: filter-rail
title: FilterRail
description: An always-visible faceted filter rail with user layout settings, driven by the same CollectionControl as DataTable
sources:
  - packages/core/src/components/filter-rail/**
---

# FilterRail

`FilterRail` shows every filterable axis beside the results instead of hiding it behind a filter dropdown. Each section shows its options up front, so users see what they can filter by without opening anything.

It writes the same `CollectionControl` a `DataTable` reads, so there is no second filter engine: a checkbox section **is** the `in` operator, a radio section is `eq`, a range is `between`.

## Import

```tsx
import { FilterRail, type FilterRailSection } from "@tailor-platform/app-shell";
```

The runnable examples also import `Button`, `DataTable`, `Text`, `useCollectionVariables`, `useDataTable`, and `useFilterRailLayout` from `@tailor-platform/app-shell`.

## Basic Usage

Choose categories and a status to filter the local product rows. The checkbox list supports search and **Show more**; each section can be collapsed without clearing its selection. **Clear product filters** restores all rows. This example evaluates only its two configured fields locally; a real application sends the derived query to its backend. There is no second `DataTable.Filters` surface for the same fields.

<!-- example: basic-usage -->

## Sections and parts

What the rail shows is **config**: `sections`, one entry per axis, in screen order. How the rail is assembled is **parts**: leave a part out and that feature is not rendered.

| Part                  | Renders                                                                       |
| --------------------- | ----------------------------------------------------------------------------- |
| `FilterRail.Root`     | The rail. Takes `control`, `sections`, `layout`.                              |
| `FilterRail.Header`   | A title row with a slot for actions.                                          |
| `FilterRail.ClearAll` | Clears the rail's own filters only. Hidden while none are active.             |
| `FilterRail.Settings` | Show / hide, reorder and sort sections. Needs `layout`.                       |
| `FilterRail.Sections` | The sections, in the user's layout. Scrolls while the header stays put.       |
| `FilterRail.Provider` | Holds the config when a `Trigger` sits outside the rail (see Narrow screens). |
| `FilterRail.Trigger`  | The narrow-screen "Filters" button, placed anywhere inside `Provider`.        |

The [layout example](#user-layout) assembles the header, clear action, settings, and sections. Leave out `Settings` when users do not need to customize the rail.

### Section types

Every section has an `id`, a `label` and an optional `hint`. The operator is fixed per section — the user picks values, never operators.

| `control`     | Commits                                    | Notes                                                       |
| ------------- | ------------------------------------------ | ----------------------------------------------------------- |
| `checkbox`    | `in` (or `nin`) with the ticked values     | `sort`, `truncate` (default 8), `pinned`, `searchThreshold` |
| `radio`       | `eq` (or `ne`) with one value              | An "Any" row removes the filter; `anyLabel: null` hides it  |
| `boolean`     | `eq` with `true` / `false`                 | Three states: Any, `trueLabel`, `falseLabel`                |
| `text`        | `contains`, `hasPrefix` or `eq`            | Debounced (`debounceMs`, default 250)                       |
| `numberRange` | `between` `{ min, max }`, or `gte` / `lte` | Commits on blur / Enter; one end alone is half-open         |
| `date`        | `eq`, `gte` or `lte` a `YYYY-MM-DD`        | Uses `DatePicker`                                           |
| `dateRange`   | `between` `{ min, max }`                   | Uses `DateRangePicker`; optional `presets`                  |
| `custom`      | Whatever `render` writes                   | Declares the `fields` it owns so Clear all includes them    |

A checkbox list long enough to be truncated also gets a search box, so a value can be found without scrolling (`searchThreshold` overrides when it appears).

The following playground covers the other six section types: text, boolean, number range, date, date range, and custom. Text commits after its debounce; numeric bounds commit on blur or Enter. Try the **April 2026** preset or **Low stock: 1–20**, and inspect the generated query below. This playground generates filter values only, not backend results.

<!-- example: section-controls -->

A field holds one filter, so two sections must not share a field; the rail warns in the console when they do.

#### Typing fields

Give `FilterRailSection` the row's keys so a `field` that is not on the table is a type error, the same way `createColumnHelper<Row>()` types columns. This works with a typed control or a plain one:

```tsx
const sections: FilterRailSection<keyof Product & string>[] = [
  { id: "category", label: "Category", control: "checkbox", field: "category", options },
  // field: "categroy" → type error
];
```

With a typed control (from `useCollectionVariables({ tableMetadata })`), a section whose field the control does not have is also rejected.

The **Custom stock filter** in the playground uses `getFilter` and `setFilter` to toggle a `between` filter. Its `fields: ["stock"]` declaration makes that filter participate in **Clear all**.

The rail never hides state: a selected option is never truncated away, never disabled and never hidden by a section's search box.

### Collapsing sections

Each section collapses and expands from the chevron by its title. Sections start expanded; set `defaultCollapsed: true` to start one collapsed (for a rarely used axis). While a section is collapsed, its header still shows how many values are selected and keeps its **Clear**, so a collapsed section never hides an applied filter. The open / closed state is kept while the page is open, including across the narrow-screen sheet opening and closing.

```tsx
{ id: "warehouse", label: "Warehouse", control: "checkbox", field: "warehouse", options, defaultCollapsed: true }
```

## Choosing a control

Checkbox and radio sections list every option, so they are only for **small, fixed sets** whose values you know up front — status, category, size, a handful of warehouses. Their `options` are a static array; the rail does not fetch them.

Do **not** use a checkbox or radio list for a field whose values **keep growing** — product names, SKUs, customers, suppliers, order numbers. The list gets longer with every new record, takes over the rail, and becomes a scroll hunt. Give those fields a search instead:

| The field's values are…                          | Use                                                                         |
| ------------------------------------------------ | --------------------------------------------------------------------------- |
| A small fixed set (≈ up to 20), pick any         | `checkbox`                                                                  |
| A small fixed set, pick one                      | `radio` (or `boolean` for yes / no)                                         |
| Open-ended and growing (names, codes, customers) | `text` — a search that commits `contains`, `hasPrefix` or `eq`              |
| Open-ended, but users must pick exact records    | a `custom` section rendering a searchable picker (e.g. an async `Combobox`) |
| Numbers or dates                                 | `numberRange`, `date`, `dateRange`                                          |

In development the rail warns in the console when a checkbox or radio section lists more than 50 options, as a nudge towards a search.

## User layout

`useFilterRailLayout(storageKey)` persists the user's section order, hidden sections and option sort to localStorage. Pass it as `layout` and add `FilterRail.Settings`. Hiding a section that carries a filter also clears that filter. To share a layout across a team, pass your own `{ value, onChange, onReset }` binding instead.

Open settings to hide sections, sort checkbox options, or reorder sections by dragging or using the reorder handle's arrow keys. **Availability** starts collapsed. This example saves only its own preferences under the namespaced key `docs:filter-rail:layout-example`; settings' Reset restores the authored defaults. The separate **Open demo filters** trigger appears below the `lg` breakpoint, without adding application breakpoint code.

<!-- example: layout-and-responsive -->

## Beside a DataTable

The rail sits in its own `Layout.Column`, outside `DataTable.Root`, which is why `control` is a prop. Do not also render `DataTable.Filters` for the same fields — one fact in two places can drift.

## Narrow screens

Below the `lg` breakpoint there is no room for a side column, so the rail turns itself into a left sheet behind a **Filters** button carrying the active count — the same way the Sidebar handles small screens. Apps write no breakpoint code.

By default the button appears where the rail would have been. To put it somewhere else — a table toolbar, a page header — wrap the page in `FilterRail.Provider`, move the config there, and place `FilterRail.Trigger` wherever you want it. The Trigger renders nothing on wide screens, and while one is mounted the rail skips its own button.

Narrow the browser below 1024px in the [layout example](#user-layout). **Open demo filters** opens the same sections in a left sheet and shows the active count. Press Escape or click the backdrop to close it, then reopen the sheet to verify that filters and collapsed sections remain intact. The example uses `FilterRail.Provider` to share configuration with the trigger outside `Root`, without requiring any Shell layout component.
