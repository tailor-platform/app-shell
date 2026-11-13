---
"@tailor-platform/app-shell": minor
---

Add `DataTable.Table`'s `emptyContent` and `errorContent` props to replace empty and error messages with text or custom markup, for example `<DataTable.Table emptyContent="No requests awaiting approval" errorContent="Unable to load requests" />`. Omitting either prop preserves its existing default message.

Empty and error states now fill the available body area when the table root has a fixed height or fills a bounded flex parent, while headers, footers, and data rows keep their natural heights. Their content stays centered in the visible viewport even when columns overflow horizontally, and oversized custom content can be scrolled independently of the columns.
