---
"@tailor-platform/app-shell": minor
---

Refactor `DateField` / `DatePicker` to follow the same composition model as `Field`, `Select`, `Combobox`, and `Autocomplete`.

The date controls are now **control-first**: field chrome moved out of the control props and into `Field.Root` composition.

Breaking changes:

- `label`, `description`, and `errorMessage` were removed from `DateField` / `DatePicker`; compose them with `Field.Root`, `Field.Label`, `Field.Description`, and `Field.Error` instead.
- `hideTimeZone` was removed because it was unused.

`isInvalid` still remains a top-level prop for externally-controlled invalid styling, and the semantic date props (`isRequired`, `isDisabled`, `isReadOnly`, `minValue`, `maxValue`, `isDateUnavailable`) remain top-level and aligned with `Calendar`.

Before:

```tsx
<DatePicker
  label="Delivery date"
  description="When should we ship your order?"
  minValue={today(getLocalTimeZone())}
  errorMessage={error}
  isInvalid={!!error}
/>
```

After:

```tsx
<Field.Root invalid={!!error}>
  <Field.Label>Delivery date</Field.Label>
  <DatePicker aria-label="Delivery date" minValue={today(getLocalTimeZone())} />
  <Field.Description>When should we ship your order?</Field.Description>
  <Field.Error match={!!error}>{error}</Field.Error>
</Field.Root>
```

Standalone usage still works with accessible naming:

```tsx
<DateField aria-label="Invoice date" />
```
