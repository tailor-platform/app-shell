---
kind: prose
slug: pattern/forms
name: Forms
group: forms
title: Forms
category: pattern
subcategory: form
description: Create and Edit forms in a dialog, sheet or page — pick the container, then lay out fields with Card, Fieldset and Grid maxColumns
requiredImports: [Form, Field, Fieldset, Grid, Card, Dialog, Sheet, Layout, Button]
tags: [form, create, edit, modal, dialog, sheet, page, sections, fieldset, grid, steps, wizard]
do:
  - Any Create or Edit form for a record, in a dialog, a sheet or a routed page
  - Quick changes from another screen (rename, change status, add an address)
  - Long forms that need named sections, and multi-step flows with per-step validation
dont:
  - A free-text note, reply or comment submitted in place — use form/composer
  - CSV or spreadsheet import — use the CsvImporter component
  - Filtering a list — use FilterRail or the DataTable filters
---

# pattern/forms

Every form is built the same way. Pick the **container** from the form's size and where the user
is, then compose the **same body** inside it: `Form` → sections (`Fieldset`, in a `Card` on a
page) → `Grid maxColumns` → `Field`. Because `Grid` reflows by its own width, the body needs no
changes when it moves between a dialog, a sheet and a page.

## Pick the container

| The form is…                                                     | Container                                | Columns shown |
| ---------------------------------------------------------------- | ---------------------------------------- | ------------- |
| A quick change: up to ~6 fields (the default)                    | `Dialog.Content size="sm"`/`"md"`        | 1 / 2         |
| A larger Create or Edit that keeps the page in view, 6–15 fields | `Dialog.Content size="lg"`, or a `Sheet` | 2             |
| A routed Create or Edit page the design calls for, or 15+ fields | `Layout maxWidth="lg"` + card sections   | 2             |
| A staged flow where each step is validated before the next       | Steps on a page                          | 2             |

- **Default to a dialog.** A `/create` or `/edit` route in a screen spec doesn't by itself mean a
  full page; the route can open the dialog over the list (see [Routed modal](#routed-modal)).
- **Documents are pages.** Creating or editing a document with line items and several field
  groups is a routed page; a dialog has nowhere to put them. Dialogs are for small entities and
  sub-elements: an address, a product variant, a location's properties.
- **Use a sheet** when the user edits one record while the list or record behind it stays in view.

## Lay out the fields

Put the fields in a [`Grid`](../components/grid.md) with `maxColumns`. It is the most columns the
grid shows; it shows fewer as its own width shrinks (one below 400px, two from 400px, three from
640px, four from 880px), so a form is never sized for mobile by hand.

```tsx
<Grid maxColumns={2} gapX={6} gapY={4}>
  <Field.Root name="supplier">…</Field.Root>
  <Field.Root name="code">…</Field.Root>
  <Grid.Item colSpan="full">
    <Field.Root name="notes">…</Field.Root>
  </Grid.Item>
</Grid>
```

- `maxColumns={2}` for dialogs, sheets and most pages. Use `3` or `4` only for short header fields
  of a document on a wide page.
- Always `gapX={6} gapY={4}`, so every form has the same rhythm.
- Never a single stretched column, and never a hand-written `grid md:grid-cols-2`.

### Size each field by its value

| Value                                                                                                                       | Width                      |
| --------------------------------------------------------------------------------------------------------------------------- | -------------------------- |
| One short value: a code, number, amount, date, status, single pick                                                          | one column (default)       |
| A long or two-part value: full name, title, street line, date range                                                         | `Grid.Item colSpan={2}`    |
| Free text, or anything that isn't one value: notes, a sentence checkbox, a checkbox group, a file upload, an alert, a table | `Grid.Item colSpan="full"` |

- Size by the **value**, not the label.
- Don't widen a field just to fill a row; an empty cell is fine.
- A `Textarea` always takes `colSpan="full"`.
- Put `Grid.Item` around the `Field.Root`, as a direct child of the `Grid`. A span wider than the
  columns shown clamps, so `colSpan={2}` in a one-column dialog takes that one column.

### Group fields into sections

Group fields into named sections once a form has about 8 or more fields, or when the fields fall
into natural groups (Supplier, Delivery, Billing). Each section is a `Fieldset` with a `Legend`,
and its own `Grid`:

- Give `Fieldset.Root` `className="flex flex-col gap-4"`, so the legend, description and grid
  stack with the same spacing in every section.
- **On a page**, put each section in a `Card`: `Card.Root` → `Card.Content` → `Fieldset.Root` →
  legend and description → `Grid`.
- **In a dialog or sheet**, leave the cards out. Separate sections with a rule
  (`border-t border-border pt-6`) and a 1.5rem gap.
- At most ~6 sections. With three or more on a page, an anchor nav at the top helps; derive its
  labels and the section titles from one array so they can't drift.
- One `Form` wraps every section. Don't nest a `Form` per section.

### Labels and required fields

- Mark required fields with `Field.Label required` **and** `required` on the control. The label
  marker is visual only; the control's `required` is what is validated and announced.
- Mark them the same way in every section.
- Put each error under its field with `Field.Error match="…"`, never in a banner above the form.

## Modal forms

<!-- example: modal-form-small -->

<!-- example: modal-form-large -->

`Dialog.Content size` sets the width, and the grid inside is the panel minus 48px of padding:

| Size | Panel | Grid inside | Columns with `maxColumns={2}`     | Use for                           |
| ---- | ----- | ----------- | --------------------------------- | --------------------------------- |
| `sm` | 24rem | 336px       | 1                                 | 1–3 fields: rename, change status |
| `md` | 32rem | 464px       | 2                                 | up to ~6 fields (the default)     |
| `lg` | 45rem | 672px       | 2                                 | 6–15 fields in plain sections     |
| `xl` | 60rem | 912px       | 2 (up to 4 with `maxColumns={4}`) | rarely; prefer a page             |

- Put the `Form` inside `Dialog.Body`, so a long form scrolls while the header and footer stay put.
  Submit from `Dialog.Footer` with `<Button type="submit" form="<id>">`.
- Cancel is `type="button"`. Inside a `<Form>` an untyped `<button>` submits.
- The primary button goes last in the footer.
- Two levels of modal at most. The second is a confirmation or a picker, rendered inside the form
  dialog's content (see [Second level](#second-level-confirm-or-pick)).
- Don't put steps inside a dialog. A flow that needs steps is a page.

### Sheet

The same body in a `Sheet.Content size="lg"`, when the record behind it should stay visible. The
sheet's body scrolls; its footer holds Cancel and Save.

<!-- example: sheet-form -->

### Routed modal

The form has its own URL but opens over the list: both `/products` and `/products/create` render
the same component, and `onOpenChange` navigates back so the URL stays in sync. Registering the
create path as a separate top-level route unmounts the list.

<!-- example: modal-form-routed -->

### Second level: confirm or pick

A confirmation or a picker may open on top of the form: a "Discard changes?" confirm when the user
cancels a dirty form, or a picker that fills one field. Render it inside the form dialog's content,
so `Escape` and an outside press close only the top dialog, and focus returns to the form when it
closes. See [Dialog → Stacking](../components/dialog.md#stacking).

<!-- example: modal-form-confirm -->

## Page forms

<!-- example: page-form -->

- `Layout maxWidth="lg"` (64rem) centres the page; use `"xl"` with a section nav column or line
  items.
- Save and Cancel go in `Layout.Header`, wired with `<Button type="submit" form="<id>">` matching
  the `Form`'s `id`.
- Fields that only show a value the form doesn't change (a PO number, who created it) are not
  fields. Show them in the header or a description list, not in disabled inputs.

## Steps

For a flow the user completes in stages, each validated before the next: an onboarding or request
flow with 3–7 steps. Keep it simple.

<!-- example: steps-form -->

- **Each step is its own `Form`**, keyed by the step index so it remounts cleanly.
- **"Next" is `type="submit"`.** `onFormSubmit` only fires once that step's fields are valid, so
  progress is gated without a manual check.
- **Values build up in a `draft`** above the `Form`, and every field reads its value back through
  `defaultValue`. That is what makes Back keep the user's input.
- **Show where the user is.** Name the steps (badges, or plain text) and say "Step 2 of 4". On
  narrow screens, "Step 2 of 4" alone is enough.
- **End on a review step** that lists what will be created.
- 3–7 steps. More than 7, split the flow or cut scope.

## Form state

[Form, Field, and Fieldset](../components/form.md) has the full detail. `form/composer` follows all
of this too, with one exception: its body is controlled, because a composer reads the value during
render to gate its submit.

- **`Form` + `Field` is the default stack.** They wrap Base UI and ship with AppShell; no extra
  dependency.
- **Submit with `onFormSubmit(values)`.** It fires only after validation passes. Don't hand-roll
  `<form onSubmit>` + `new FormData(...)`; that bypasses field validation and server-error routing.
- **`onFormSubmit` reads registered `Field.Root`s, not the DOM.** Every control, including
  `Select`, `Combobox` and `Autocomplete`, only needs a `Field.Root name="…"` around it: no `name`
  of its own and no `useState`. Mirroring field values into React state is the most common
  mistake. The exception is a value the component reads _during render_ (a submit gate, a
  dependent placeholder, a live count).
- **`Field.Control` is already a styled input.** Every other control (`Select`, `Combobox`,
  `Autocomplete`, `Checkbox`, `Textarea`, `DateField`, `DatePicker`) goes directly under
  `Field.Root`, not in `Field.Control`'s `render`.
- **Object items need `itemToStringValue`.** Items shaped `{ value, label }` submit `value`; any
  other object submits as JSON unless you supply it.
- **Server errors go through `Form`'s `errors` prop**, keyed by field `name`, not a toast or a
  banner. They clear when the user edits the field.
- **React Hook Form is optional**, consumer-installed, and only warranted for cross-field
  validation, field arrays, or a Zod resolver. Drive the control from a `Controller` and spread
  `fieldState` onto `Field.Root`.

## Anti-patterns

- A full page for a small Create or Edit the design didn't call out as a page — use a dialog
- A document with line items in a dialog — use a page
- Fields in one stretched column, or in a hand-written `grid md:grid-cols-2` — use `Grid maxColumns`
- Widening a field to fill a row, or sizing it by its label
- A `Textarea` that doesn't take the full row
- Cards around sections inside a dialog or sheet
- A separate `<Form>` per section
- Required markers that differ between sections, or none at all
- Errors in a banner or toast instead of under the field
- Holding a `Select` or `Combobox` value in `useState` just to submit it
- Wrapping a `Select` or `Combobox` in `Field.Control` (`render={<Select />}`) — a double frame
- A third level of modal, or a form inside the form modal
- Steps inside a dialog
- One `<Form>` around every step with the inactive steps hidden — hidden required fields block submit
- A plain `onClick` "Next" that advances without validating
- Hand-building a CSV import flow — use `CsvImporter`
