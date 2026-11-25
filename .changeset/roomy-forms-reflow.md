---
"@tailor-platform/app-shell": minor
---

Add `maxColumns` to `Grid` for laying out form fields in columns that reflow by the grid's own width, so one form definition fits a Dialog, a Sheet or a page.

```tsx
<Form id="po-form" onFormSubmit={save}>
  <Grid maxColumns={2} gapX={6} gapY={4}>
    <Field.Root name="supplier">
      <Field.Label required>Supplier</Field.Label>
      <Combobox items={suppliers} required />
    </Field.Root>
    <Grid.Item colSpan="full">
      <Field.Root name="notes">
        <Field.Label>Notes</Field.Label>
        <Textarea />
      </Field.Root>
    </Grid.Item>
  </Grid>
</Form>
```

`maxColumns` (`1 | 2 | 3 | 4`) is the most columns the grid shows; it shows fewer below 880, 640 and 400px of its own width. In this mode, numeric `Grid.Item` spans clamp to the columns shown, and fields placed in the grid stretch their controls to the cell width. The grid renders inside a `<div data-slot="grid-container">`.

The four form patterns (`form/modal`, `form/sectioned`, `form/single-page`, `form/wizard`) are replaced by a single `pattern/forms` that covers choosing a container, sizing fields, sections, modal sizes and multi-step flows. Links and skill references to the old slugs need updating.

Supporting additions:

- `Field.Label` takes `required` to show a visual-only required marker.
- `Layout` takes `maxWidth` (`"md" | "lg" | "xl"`) to centre a page and cap its width, header included.
- `Dialog.Content` takes `size` (`"sm" | "md" | "lg" | "xl"`, default `"md"`, matching `Sheet.Content`, always leaving a 1rem margin on each side), and the new `Dialog.Body` scrolls long content while the header and footer stay in view.

Visual changes to existing components (snapshots of open dialogs and sheets will show the new classes):

- `Dialog.Content` is now a flex column instead of a grid, so `Dialog.Body` can scroll while the header and footer stay in view. Direct children other than `Dialog.Body` don't shrink, so a tall dialog without a `Body` still scrolls as a whole. Its height limit and default width are unchanged. If you made `Dialog.Content` a flex column yourself and gave a child `min-h-0 flex-1 overflow-y-auto`, wrap that content in `Dialog.Body` instead; see the migrations guide. `ActivityCard`'s "All activities" dialog now does this.
- `Dialog.Footer` and `Sheet.Footer` right-align their buttons at their natural width at every size. Previously `Sheet.Footer` stacked buttons full width, and `Dialog.Footer` did so below `sm`. Buttons now show in source order from left to right, so put the primary button last.
