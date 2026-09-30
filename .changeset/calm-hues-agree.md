---
"@tailor-platform/app-shell": minor
---

Add semantic colour roles (`--semantic-{info|success|warning|danger|neutral}-{surface|surface-hover|border|solid|solid-hover|text|on-solid|indicator}`), available as Tailwind colours. `--status-*` and `--alert-*` now alias these roles, and Badge reads them, so `text` on `surface` and `on-solid` on `solid` are at least 4.5:1 in the default palette, in light and dark mode.

```tsx
<span className="rounded-md bg-semantic-success-surface px-2 py-0.5 text-semantic-success-text">
  Paid
</span>
```

Visible changes in the default palette:

- `bg-status-*` and `bg-alert-*` keep their names but change values. `--status-*` are fill colours; do not use them as text (below 4.5:1 in dark mode). Use `text-semantic-{intent}-text`.
- Badge `error` and `subtle-error`, and Alert `error`, follow `--semantic-danger-*` instead of `--destructive`. Button and `text-destructive` still follow `--destructive`.
- The warning Badge text is dark instead of white. Alert description text now has the same colour as the Alert title.
