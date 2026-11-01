---
"@tailor-platform/app-shell": minor
---

Toasts now appear above open dialogs and sheets. The `Toaster` renders through a portal to the end of `body` instead of inside the content column, where the scroll container's stacking context kept it behind the dialog backdrop. A new `--z-toast` token (100) sits above `--z-popup` and `--z-overlay` (50).

The layout root (the sidebar wrapper shared by `SidebarLayout` and `GlobalHeaderLayout`) now has `isolation: isolate`, so a z-index set inside the page is ordered within the page and never reaches the portaled dialogs, sheets, popups and toasts. Nothing inside AppShell changes; a consumer who relied on an in-page element with a high z-index covering a dialog will see the dialog on top instead.

The `Toaster` element moves from the content column to the end of `body`. Styles that targeted it through the column's ancestors no longer match. The toast position, theme and colours are unchanged.
