---
"@tailor-platform/app-shell": patch
---

Fix 14 utility classes in `Alert`, `MetricCard`, `AppearanceSwitcher` and `CsvImporter` that were written as `<variant>:astw:<utility>` instead of `astw:<variant>:<utility>`.

Tailwind v4 requires a configured prefix to be the first segment of a class name, so none of these classes were recognised and no CSS was emitted for them — silently, with no error or warning. The styles their authors intended now apply:

- `Alert` — description text uses the muted variant foreground rather than the full-strength one; `[&_p]` descriptions get relaxed line-height; the dismiss button gets its hover feedback and, more importantly, a visible focus ring (previously there was no focus indicator at all).
- `MetricCard` — dark-mode trend colors apply instead of the light-mode `text-green-600` / `text-red-600` persisting in dark mode.
- `AppearanceSwitcher` — the menu radio-item indicator is hidden as intended.
- `CsvImporter` — the trailing border is removed from the last mapping row.

Adds a test that scans the package source for the misordered form, since the failure mode is invisible in snapshots (they record class names, not resolved CSS).
