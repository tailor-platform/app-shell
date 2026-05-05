---
"@tailor-platform/app-shell": minor
---

LineItems: new `LineItems.SearchToggle` part — an icon button that expands inline into a search input on click, with a 200ms width transition. Collapses on blur (when the filter is empty) or Escape. Reads/writes the same `filter` state as `LineItems.Search`, so the two are interchangeable.
