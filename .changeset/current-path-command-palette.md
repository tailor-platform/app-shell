---
"@tailor-platform/app-shell": patch
---

Fix the built-in Command Palette so routes under dynamic segments stay navigable when the current URL already fixes those params.

For example, when the app is on `/users/42`, the palette can now include entries like `/users/42/profile` instead of dropping the `:id` branch entirely.
