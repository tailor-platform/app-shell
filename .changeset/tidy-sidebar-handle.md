---
"@tailor-platform/app-shell": minor
---

Add a standard desktop resize/expand handle to `<SidebarLayout />` and `<GlobalHeaderLayout />`, controlled by the existing boolean `collapsible` option. Set `collapsible={false}` for an expanded, fixed-width sidebar with no controls; shortcuts and sidebar hook actions are also disabled.
Support continuous drag-to-expand and resize up to 480px, resistance near collapse, and earlier collapse snapping; click/keyboard expansion restores 256px while mobile/tablet behavior remains unchanged.
Apply live widths through CSS custom properties without per-move React renders; commit the width only at mode changes and gesture completion.
