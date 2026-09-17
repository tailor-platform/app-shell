---
"@tailor-platform/app-shell": patch
---

Fix the built-in Command Palette so routes under dynamic segments stay navigable when the current URL already fixes those params, including the current dynamic page. Only resolve dynamic segments on the current route branch, rather than substituting their values into sibling routes. Display resolved parameter values in palette paths, abbreviating values over eight characters with `...`.

For example, when the app is on `/users/42`, the palette can include `/users/42` and `/users/42/profile` instead of dropping the `:id` branch entirely.
