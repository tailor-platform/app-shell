---
"@tailor-platform/app-shell": minor
---

`--destructive` and `--destructive-foreground` are now aliases of `--danger-solid` and `--danger-contrast`, and the shipped components read the danger roles instead of `destructive` utilities. The names, `Button variant="destructive"` and `text-destructive` keep working.

`--destructive`, `--destructive-foreground` and their utilities (`bg-destructive`, `text-destructive`, `border-destructive`, `text-destructive-foreground`) are deprecated and will be removed in the next major. They keep working in 1.x; new code uses the danger roles: `bg-danger-solid` for fills, `text-danger-text` for text, `text-danger-contrast` for text on the solid, and `border-danger-solid` for invalid-state borders (`border-danger-border` is for decorative borders only; it is 1.67:1 on the card). `Button variant="destructive"` has no replacement yet, so it is not deprecated in this release; the next major renames it to `danger`.

Visible changes in the default palette:

- Dark-mode `Button variant="destructive"` is a full `#dc2626` fill with white text. It was `#f87171` at 60% opacity. Hover uses `--danger-solid-hover`.
- `text-destructive` now resolves to the solid colour: `#dc2626` in dark mode (was `#f87171`), which is below 4.5:1 as text on the dark card. Error text in components uses `text-danger-text` (light `#ce0c17`, dark `#ff9083`). Use `text-danger-text` for text in your own code.
- Invalid borders and focus rings on `Input`, `Textarea`, `Checkbox`, `Field` and `DateField` read `--danger-solid`. The dark invalid border changes from `#f87171` to `#dc2626` (3.71:1 on the card).
- `CsvImporter` error cells use `bg-danger-surface`, matching the warning cells.
- A theme that overrides `--destructive` no longer changes the shipped components; override `--danger-solid` (and the other danger roles) instead. `cream`, `bloom` and the theme template no longer set `--destructive`; their values were the same as the default.
