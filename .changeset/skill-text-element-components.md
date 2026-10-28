---
"@tailor-platform/app-shell": patch
---

AppShell components and the document detail page example in the `app-shell-patterns` skill use the `Text` element components, such as `Text.h3` and `Text.span`, where they used `render` only to choose a plain HTML element. The rendered elements and classes do not change. `render` stays for Base UI parts, other components, and other elements.
