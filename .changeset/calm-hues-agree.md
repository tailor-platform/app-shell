---
"@tailor-platform/app-shell": minor
---

Add semantic colour roles (`--{info|success|warning|danger|neutral}-{surface|surface-hover|border|solid|solid-hover|text|contrast|indicator}`), available as Tailwind colours. `--status-*` and `--alert-*` now alias these roles, and Badge reads them, so `text` on `surface` and `contrast` on `solid` are at least 4.5:1 in the default palette, in light and dark mode.

```tsx
<span className="rounded-md bg-success-surface px-2 py-0.5 text-success-text">Paid</span>
```

A gray scale (`--primitive-gray-{50..950}`, Tailwind neutral) is also added; the default palette's text and line tokens read it, with no value change.

Visible changes in the default palette:

- `bg-status-*` and `bg-alert-*` keep their names but change values. `--status-*` are fill colours; do not use them as text (below 4.5:1 in dark mode). Use `text-{intent}-text` instead (for example `text-status-completed` becomes `text-success-text`).
- Badge, Alert and CsvImporter read the semantic roles instead of `--status-*` and `--alert-*`. To recolour them, override `--{intent}-*`; overriding `--status-*` or `--alert-*` no longer changes these components. The old names remain for your own `bg-status-*` / `bg-alert-*` utilities.
- Badge `error` and `subtle-error`, and Alert `error`, follow `--danger-*` instead of `--destructive`. Button and `text-destructive` still follow `--destructive`.
- The warning Badge text is dark instead of white. Alert description text now has the same colour as the Alert title.
