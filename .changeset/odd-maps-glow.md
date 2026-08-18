---
"@tailor-platform/app-shell": major
---

Refactor `DateField` / `DatePicker` into standalone composite controls.

The date controls no longer depend on Base UI's internal `Field` / `Form` wiring. They keep their date-entry behavior, constraints, localization, and proxy-input form value serialization, but visible labels, descriptions, and external errors must now be wired with standard HTML + ARIA props (`id`, `aria-label`, `aria-labelledby`, `aria-describedby`, `isInvalid`).

This is a breaking change for consumers relying on automatic `Field.Root` / `Form.onFormSubmit` integration.

Before:

```tsx
<Field.Root name="deliveryDate" error={error ? { message: error } : undefined}>
  <Field.Label>Delivery date</Field.Label>
  <DatePicker value={value} onChange={setValue} />
  <Field.Error match={!!error}>{error}</Field.Error>
</Field.Root>
```

After:

```tsx
<label id="delivery-date-label" htmlFor="delivery-date">
  Delivery date
</label>
<DatePicker
  id="delivery-date"
  aria-labelledby="delivery-date-label"
  aria-describedby={error ? "delivery-date-error" : undefined}
  isInvalid={!!error}
  value={value}
  onChange={setValue}
/>
{error && <p id="delivery-date-error">{error}</p>}
```

Standalone usage remains supported:

```tsx
<DateField aria-label="Invoice date" />
```
