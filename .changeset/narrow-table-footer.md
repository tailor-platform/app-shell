---
"@tailor-platform/app-shell": patch
---

Keep the `DataTable` footer usable at phone widths. `DataTable.Pagination` now wraps its controls onto more lines instead of letting the frame clip them, so **Next** and **Last** stay tappable. When the footer is narrower than 480px, the **Rows per page** label is hidden and the page text is shortened to `1 / 5` (both stay available to screen readers, and the label now names the page-size select). The bulk-action bar also moves every action into the **More actions** menu at that width, so it keeps to one line and the table rows stay visible. The menu button gets an outline at that width, so it stands out more than **Clear**.
