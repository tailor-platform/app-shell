---
"@tailor-platform/app-shell": patch
---

Make the `DataTable` footer more compact at phone widths. When the footer is narrower than 480px, `DataTable.Pagination` hides the page-size switcher, shortens the page text to `1/5`, and shrinks the page buttons from 36px to 28px, so the row count and the page buttons fit on one line. The selection count is shortened to `3/240 selected` in the bulk-action bar and in `DataTable.Pagination`; screen readers still get the full text. With rows selected, the footer now takes two lines at 375px instead of three. The English row count now uses `row` or `rows` by count instead of `row(s)`.
