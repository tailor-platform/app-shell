---
"@tailor-platform/app-shell": minor
---

Add `FormLayout` for laying out form fields in a responsive grid that reflows by its container's width, so one form definition fits a Dialog, a Sheet or a page. It comes with `FormLayout.Section` (card or plain fieldset groups), `FormLayout.Item` and a sticky-capable `FormLayout.Actions`.

```tsx
<Form id="po-form" onFormSubmit={save}>
  <FormLayout columns={2}>
    <FormLayout.Section title="Supplier">
      <Field.Root name="supplier">
        <Field.Label required>Supplier</Field.Label>
        <Combobox items={suppliers} required />
      </Field.Root>
      <Field.Root name="notes" span="full">
        <Field.Label>Notes</Field.Label>
        <Textarea />
      </Field.Root>
    </FormLayout.Section>
  </FormLayout>
</Form>
```

The form templates in the example app include a wizard built from `FormLayout` and `Stepper`, and the `form/wizard` pattern now uses `Stepper` for its step indicator.

Supporting additions:

- `Field.Root` and `Fieldset.Root` take `span` (`2 | 3 | "full"`) to widen a field inside `FormLayout`. A field holding a `Textarea` takes the full row unless it sets its own `span`.
- `Field.Label` takes `required` to show a visual-only required marker.
- `Field.Value` shows a read-only value in the control's place, at an input's height, so it lines up with editable fields.
- `Layout` takes `maxWidth` (`"md" | "lg" | "xl"`) to centre a page and cap its width, header included.
- `Dialog.Content` takes `size` (`"sm" | "md" | "lg" | "xl"`, default `"md"`, matching `Sheet.Content`, always leaving a 1rem margin on each side), and the new `Dialog.Body` scrolls long content while the header and footer stay in view.

Visual changes to existing components (snapshots of open dialogs and sheets will show the new classes):

- `Dialog.Content` is now a flex column instead of a grid, so `Dialog.Body` can scroll while the header and footer stay in view. Direct children other than `Dialog.Body` don't shrink, so a tall dialog without a `Body` still scrolls as a whole. Its height limit and default width are unchanged.
- `Dialog.Footer` and `Sheet.Footer` right-align their buttons at their natural width at every size. Previously `Sheet.Footer` stacked buttons full width, and `Dialog.Footer` did so below `sm`.
