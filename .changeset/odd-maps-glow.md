---
"@tailor-platform/app-shell": major
---

Refactor `DateField` / `DatePicker` to follow the same composition model as `Field`, `Select`, `Combobox`, and `Autocomplete`.

The date controls are now **control-first**: field chrome moved out of the control props and into `Field.Root` composition. This is a breaking change for the field chrome API (`label`, `description`, `errorMessage`, `isInvalid`), while the semantic date props (`isRequired`, `isDisabled`, `isReadOnly`, `minValue`, `maxValue`, `isDateUnavailable`) remain top-level and aligned with `Calendar`.

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
