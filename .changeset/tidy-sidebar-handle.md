---
"@tailor-platform/app-shell": minor
---

Add opt-in desktop sidebar resizing via `<SidebarLayout resizable />` or `<GlobalHeaderLayout resizable />`, with a visible pointer- and keyboard-accessible handle.
Support continuous drag-to-expand and resize up to 480px, resistance near collapse, and earlier collapse snapping; click/keyboard expansion restores 256px while mobile/tablet behavior remains unchanged.
Apply live widths through CSS custom properties without per-move React renders; commit the width only at mode changes and gesture completion.
