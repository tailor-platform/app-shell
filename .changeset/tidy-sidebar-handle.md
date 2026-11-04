---
"@tailor-platform/app-shell": minor
---

Add a standard desktop resize/expand handle to `<SidebarLayout />` and `<GlobalHeaderLayout />`, controlled by the existing boolean `collapsible` option. Set `collapsible={false}` for an expanded, fixed-width desktop sidebar with no controls; desktop collapse actions are disabled, while mobile/tablet toggles and shortcuts retain their existing viewport-based behavior.
Support continuous drag-to-expand and resize up to 480px, resistance near collapse, and earlier collapse snapping; click/keyboard expansion restores 256px while mobile/tablet behavior remains unchanged.
Apply live widths through CSS custom properties without per-move React renders; commit the width only at mode changes and gesture completion.
