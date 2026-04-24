---
"@tailor-platform/app-shell": patch
---

Fix "Go to Last Page" pagination alignment. When total items aren't evenly divisible by page size, `goToLastPage` now requests `last: total % pageSize` instead of `last: pageSize`, so the last page boundaries match forward pagination.
