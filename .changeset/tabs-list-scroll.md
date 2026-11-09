---
"@tailor-platform/app-shell": patch
---

`Tabs.List` now scrolls sideways when the tabs are wider than their container, instead of growing the page. The `tablist` element is the scroll container (scrollbar hidden), and Base UI scrolls the active tab into view on mount and the tab focused with the arrow keys into view, so keyboard navigation never lands on a hidden tab. The container has 4px of padding, a matching negative margin and the same `scroll-padding`, so the focus ring is not clipped and the list keeps its footprint. Nothing changes while the tabs fit.

The tabs now sit in a visual track (`data-slot="tabs-list-track"`) inside the `tablist`, and `className` applies to that track. The `tablist` is a block-level element, so a `Tabs.List` placed next to inline content starts on its own line. `Tabs.List` no longer accepts `render`.
