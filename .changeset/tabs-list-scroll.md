---
"@tailor-platform/app-shell": patch
---

`Tabs.List` now scrolls sideways when the tabs are wider than their container, instead of growing the page. The list renders inside a scroll container (`data-slot="tabs-list-container"`) with a hidden scrollbar. The active tab is scrolled into view on mount and when it changes, and a tab that receives focus is scrolled into view, so arrow-key navigation never lands on a hidden tab. The container has 4px of padding and a matching negative margin, so the focus ring is not clipped and the list keeps its footprint. Nothing changes while the tabs fit.

The list now sits inside a block-level element. A `Tabs.List` placed next to inline content starts on its own line, and `className` still applies to the `tablist` element, not to the new container.
