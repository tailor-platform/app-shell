---
"@tailor-platform/app-shell": minor
---

Redesign `DataTable.Filters` for a faster, more direct filtering experience.

- **Add-filter panel**: replaces the old popover + nested selects with a single popover laid out in up to three columns — **field ▸ condition ▸ value**. The condition column appears for fields with more than one operator (number, date/time, string); single-operator fields (enum, uuid) go straight to the value. Values are drafted and committed with an **Apply** button, and the panel stays open so several filters can be added in a row.
- **Segmented filter chips**: each active filter renders as `field │ operator │ value │ ✕`. The operator segment opens a searchable dropdown to switch the condition; the value segment opens the type-specific editor.
- **Date inputs use app-shell's own components**: single-date operators (exact date / after / before) render the inline `Calendar`; the `is between` range uses two `DatePicker` From/To fields.
- Friendlier operator labels (`is`, `is not`, `is between`, `is any of`, …), multi-select enum values summarized as "N items", compact date ranges, and a consistent primary-colored checkbox across every filter surface.
