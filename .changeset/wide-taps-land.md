---
"@tailor-platform/app-shell": patch
---

Give small controls a 24×24px hit area (WCAG 2.5.8 target size) without changing their look: `Checkbox` (16px box), the date field segments, `Dialog`'s close button, `Combobox` chip remove buttons, `DescriptionCard`'s copy button, `DataTable`'s sub-row caret and `BadgeList`'s "+N" trigger.
Capsule `Tabs` with `size="xs"` now use a 24px tab inside 2px of track padding; the 28px track is unchanged, the active capsule is 4px taller.
