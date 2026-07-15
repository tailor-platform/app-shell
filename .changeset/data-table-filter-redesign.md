---
"@tailor-platform/app-shell": minor
---

Redesign `DataTable.Filters` for a faster, more direct filtering experience.

- **Add-filter menu**: replaces the popover + nested selects with a `Menu` flyout. Every filterable field is visible on open; hovering a field reveals a type-specific editor. Fields whose operator matters (number, date/time) get a condition step — **field ▸ condition ▸ value** — while others go straight to the value.
- **Segmented filter chips**: each active filter renders as `field │ operator │ value │ ✕`. The operator segment opens a searchable dropdown to switch the condition; the value segment opens the type editor.
- **New `FilterConfig.chooseOperator?: boolean`**: opt a field in/out of the condition step. Defaults to `true` for `number`/`date`/`datetime`/`time` and `false` otherwise. The chip always lets you change the operator regardless.
- Friendlier operator labels (`is`, `is not`, `is between`, `is any of`, …), multi-select enum values summarized as "N items", compact date ranges, and consistent primary-colored checkboxes across all filter surfaces.
- `Menu.Content` gains a `position.trackAnchor` option to keep a menu pinned in place when opening it shifts the trigger.
