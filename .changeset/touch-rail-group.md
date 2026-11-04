---
"@tailor-platform/app-shell": patch
---

On touch devices, tapping a group in the sidebar icon rail now opens the full sidebar, so its pages can be reached. Before, nothing happened: the rail's hover flyout cannot open without hover, and the group's own submenu is hidden at icon width. At tablet and phone widths the tap opens the slide-in drawer; on desktop widths it expands the collapsed sidebar. Devices with a mouse keep the hover flyout.
