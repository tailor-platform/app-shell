---
"@tailor-platform/app-shell": minor
---

Add a `--backdrop` colour token and the `bg-backdrop` utility for the dim layer behind modals. `Dialog`, `Sheet` and the CsvImporter drawer use it instead of `bg-black/50`. The value is the same (black at 50%), so nothing changes on screen. Override `--backdrop` on `:root` to change every backdrop at once.

In the default palette, the surface, border and brand colours now read the internal gray scale, a white step, and white alpha steps. All colours are unchanged. If your code reads these tokens with `getComputedStyle(...).getPropertyValue()`, the string is now the step's notation, for example `#171717` instead of `rgba(23, 23, 23, 1)`. The `cream` and `bloom` palettes are not changed.
