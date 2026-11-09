---
"@tailor-platform/app-shell": patch
---

Fix the focus ring offset on the `Dialog` and `Sheet` close buttons. The offset now uses the card color, so in dark mode it no longer shows a white gap around the button. Also remove an unused `pt-4` class from the welcome text that `AppShell` shows when there is no root module. The spacing does not change.
