---
"@tailor-platform/app-shell": patch
---

Preserve explicit `caseSensitive` settings when saving and restoring collection filters through `useURLCollectionVariables` or `withURLCollectionState`.
Case-insensitive filters now keep the same query after a refresh or shared link, while existing URLs remain supported.
