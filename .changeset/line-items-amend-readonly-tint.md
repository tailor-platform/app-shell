---
"@tailor-platform/app-shell": patch
---

LineItems: in `amend` mode, cells that aren't editable in amend now get a subtle `bg-muted/40` background so users can see at a glance which cells they can touch and which are locked. Selection ring + fill preview still override the tint when active. No effect in `edit` or `display` mode.
