---
"@tailor-platform/app-shell": minor
---

Allow the standalone `Select`, `Combobox`, and `Autocomplete` (including their `.Async` variants) to receive an accessible name via `aria-label`, `aria-labelledby`, and `id`. Previously these props were silently dropped, leaving the combobox with only its current value as an accessible name — a WCAG 4.1.2 issue for filters and toolbars used outside a `Form`. The props are now forwarded to the underlying trigger/input.

```tsx
// Announced as "Direction filter, combobox" instead of just its value
<Select
  items={items}
  value={value}
  onValueChange={setValue}
  aria-label="Direction filter"
/>

// Or point at a visible label
<span id="dir-label">From</span>
<Combobox items={items} aria-labelledby="dir-label" />
```
