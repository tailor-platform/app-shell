---
kind: code-backed
group: form-layout
title: FormLayout
description: Responsive multi-column grid, sections and action bar for laying out form fields in a dialog, sheet or page
sources:
  - packages/core/src/components/form-layout/**
---

# FormLayout

`FormLayout` lays out form fields in a responsive grid. Put it inside `<Form>` and place `Field.Root`s in it; it handles columns, field widths, sections and the action bar so you don't hand-write `grid md:grid-cols-2` or `md:col-span-2` on every form.

Columns follow the width of the **container**, not the viewport. The same fields show two columns in a large dialog, one in a narrow sheet and three in a page section, with no changes to the markup.

This is why `FormLayout` is not built on [`Grid`](./grid.md): `Grid` picks its columns from the viewport width, so a form inside a 480px dialog on a wide screen would still get the wide-screen columns. `FormLayout` measures its own container instead.

## Import

```tsx
import { FormLayout } from "@tailor-platform/app-shell";
```

## Basic Usage

<!-- example: basic-usage -->

Fields go straight into the grid. Widen a field with `span` on `Field.Root` — `"full"` takes the whole row.

## Sub-components

| Sub-component        | Description                                                                         |
| -------------------- | ----------------------------------------------------------------------------------- |
| `FormLayout`         | The grid. `columns` is the most columns to show                                     |
| `FormLayout.Section` | A titled group of fields (`<fieldset>`) with its own grid, drawn as a card or plain |
| `FormLayout.Item`    | Places non-field content (an Alert, a table) in the grid with a `span`              |
| `FormLayout.Actions` | Right-aligned action bar, optionally sticky                                         |

## Props

### FormLayout Props

| Prop        | Type               | Default | Description                                                             |
| ----------- | ------------------ | ------- | ----------------------------------------------------------------------- |
| `columns`   | `1 \| 2 \| 3 \| 4` | `2`     | The most columns to show. Sections inherit it unless they set their own |
| `className` | `string`           | -       | Additional CSS classes                                                  |
| `style`     | `CSSProperties`    | -       | Inline styles                                                           |
| `children`  | `React.ReactNode`  | -       | Fields, sections, items and actions                                     |

### FormLayout.Section Props

| Prop          | Type                | Default  | Description                                                                      |
| ------------- | ------------------- | -------- | -------------------------------------------------------------------------------- |
| `title`       | `React.ReactNode`   | -        | Section heading (an `h3` inside the legend); also the fieldset's accessible name |
| `description` | `React.ReactNode`   | -        | Supporting text under the title; also the fieldset's accessible description      |
| `action`      | `React.ReactNode`   | -        | Header action slot, right of the title                                           |
| `columns`     | `1 \| 2 \| 3 \| 4`  | inherits | Overrides the columns inherited from `FormLayout`                                |
| `variant`     | `"card" \| "plain"` | `"card"` | `"card"` on pages; `"plain"` (heading + divider) inside a Dialog or Sheet        |
| `disabled`    | `boolean`           | -        | Disables every field in the section                                              |
| `id`          | `string`            | -        | Element id, e.g. for anchor navigation                                           |
| `className`   | `string`            | -        | Additional CSS classes                                                           |

### FormLayout.Item Props

| Prop        | Type               | Default | Description                      |
| ----------- | ------------------ | ------- | -------------------------------- |
| `span`      | `2 \| 3 \| "full"` | -       | How many columns the item covers |
| `className` | `string`           | -       | Additional CSS classes           |

### FormLayout.Actions Props

| Prop       | Type              | Default | Description                                                                                   |
| ---------- | ----------------- | ------- | --------------------------------------------------------------------------------------------- |
| `sticky`   | `boolean`         | `false` | Floats the bar as a card 16px above the bottom of the scrolling area on long forms            |
| `start`    | `React.ReactNode` | -       | Content on the left (e.g. "Draft · not saved yet"); moves to its own line when space runs out |
| `children` | `React.ReactNode` | -       | Buttons, right-aligned. Put Cancel first and the primary action last                          |

## Columns

`columns` is a maximum. The grid steps down as its container narrows:

| Container width | Columns shown           |
| --------------- | ----------------------- |
| < 400px         | 1                       |
| ≥ 400px         | 2                       |
| ≥ 640px         | 3 (when `columns` ≥ 3)  |
| ≥ 880px         | 4 (when `columns` is 4) |

Buttons in `FormLayout.Actions`, `Dialog.Footer` and `Sheet.Footer` keep their natural width and sit on the right; when they don't fit side by side they wrap, still right-aligned, rather than stretching full width.

Pick the maximum by where the form lives: `2` for dialogs, sheets and most pages, `3` for wide page sections, `4` for the header fields of a document form (PO, invoice). Keep related fields next to each other in source order; the grid fills left to right.

## Field widths

Every field takes one column unless it sets `span` on `Field.Root` or `Fieldset.Root` (`2`, `3` or `"full"`), or on `FormLayout.Item` for other content. A span never exceeds the columns currently shown — `span={3}` in a two-column grid covers both columns.

`span` only works on a **direct child** of the `FormLayout` or `FormLayout.Section` grid. The grid applies the span to its own children, because only the grid knows how many columns it is showing. A `Field.Root` wrapped in another element — a `div`, or a component of yours that renders a wrapper around it — is no longer a direct child, so its span is dropped and it takes one column. Put the `span` on the outermost element instead: use `FormLayout.Item span={2}` around the wrapper, or have your component pass `span` to the `Field.Root` it renders without wrapping it.

A field holding a `Textarea` takes the full row automatically; give it a `span` to keep it narrower. For the rest, start from these widths:

| Field                                                            | Width                                               | Why                                                |
| ---------------------------------------------------------------- | --------------------------------------------------- | -------------------------------------------------- |
| Text, select, combobox, date, number, money, code, email, phone  | One column (default)                                | Short to medium values                             |
| Names and titles (legal name, a long supplier name), date ranges | `span={2}`                                          | Values often get cut off in one column             |
| `Textarea` (notes, descriptions)                                 | Full row (automatic)                                | Free text needs the room                           |
| Address block                                                    | `Fieldset.Root span={2}` with a nested `FormLayout` | Lines stay grouped; two addresses sit side by side |
| Checkbox or switch with a sentence label                         | `span="full"`                                       | Reads as a sentence, not a value                   |
| Alerts, tables, line items, totals                               | `FormLayout.Item span="full"`                       | Not a single value                                 |

Order matters too: keep related short fields next to each other (currency and amount, city and postal code) so they share a row.

## Sections

<!-- example: sections -->

Use sections once a form has more than about eight fields or two natural groups. On a page each section is a card; inside a Dialog or Sheet use `variant="plain"`, which draws a heading instead of a card inside the panel, and a divider between one plain section and the next. Give sections an `id` to link to them from a section nav.

## Required fields

Mark required fields with `Field.Label required` and put `required` on the control. The label shows a `*`; the control's `required` is what validation checks and screen readers announce.

## Choosing a container

`FormLayout` handles the fields; the container depends on the form:

| If the form…                                        | Use                                                                                                  |
| --------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Has header fields plus line items                   | `Layout maxWidth="xl"`, `FormLayout columns={4}` for the header, sections in the view's order        |
| Has ordered steps that depend on earlier answers    | A [wizard](../patterns/form-wizard.md): one `Form` per step, progress in a [`Stepper`](./stepper.md) |
| Edits one card of a record that's already on screen | [`EditableCard`](./editable-card.md) — edit in place, saved per card                                 |
| Needs its own URL, or is long enough to scroll      | `Layout maxWidth="lg"` with card sections; add a section nav column if it helps (see below)          |
| Edits part of a record shown beside it              | `Sheet` (`size="lg"`) with `FormLayout columns={2}`                                                  |
| Anything else                                       | `Dialog` sized to the form (`sm`–`xl`); plain sections once it has groups                            |

A section nav is optional. It usually earns its column from about three sections; when you add one, widen the page to `Layout maxWidth="xl"` so the form keeps its width.

In a Dialog, put the `Form` inside `Dialog.Body` and submit from `Dialog.Footer` with `form="<id>"`, so the footer stays visible however long the form gets. On a page, Save lives in `Layout.Header`; add a sticky `FormLayout.Actions` as well when the form scrolls.

## Related

- [Form, Field, and Fieldset](./form.md) — The form controls `FormLayout` arranges.
- [Layout](./layout.md) — Page scaffolding; `maxWidth` centres form pages.
- [Dialog](./dialog.md) — `size` and `Dialog.Body` for modal forms.
- [Sheet](./sheet.md) — Side panel for editing beside a list.
- [Grid](./grid.md) — General-purpose content grid for non-form content.
