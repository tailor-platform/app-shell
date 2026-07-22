---
"@tailor-platform/app-shell": minor
---

Redesign `DataTable.Filters` for a faster, more direct filtering experience.

- **Add-filter panel**: replaces the old popover + nested selects with a single popover laid out in up to three columns — **field ▸ condition ▸ value**. The condition column appears for fields with more than one operator; single-operator fields (enum, uuid) go straight to the value. Values are drafted and committed with an **Apply**/**Update** button, and the panel stays open so several filters can be added in a row. A per-field **Clear** and a sticky **Clear all filters** are built in.
- **Segmented filter chips**: each active filter renders as `field │ operator │ value │ ✕`. The operator segment opens a searchable dropdown to switch the condition; the value segment opens the type-specific editor. Long values are truncated.
- **Date & time use app-shell's own components**: single date → inline `Calendar`; single datetime → inline calendar + a "Choose time" picker; `date`/`datetime` **between** → one inline calendar with **From / To** tabs; `time` → native time input. (Swaps to the dedicated date-range / datetime pickers 1:1 once those land.)
- Friendlier operator labels (`is`, `is not`, `is between`, `is any of`, …), multi-select enum values summarized as "N items" (localized), an inline error for reversed `between` ranges, and a consistent primary-colored checkbox across every filter surface.
- **New `slot` prop** on `DataTable.Filters` (`"all"` | `"chips"` | `"add"`) to render the chips and the **Add filter** trigger separately for custom toolbar layouts (e.g. trigger in a header row, chips on the row below).
