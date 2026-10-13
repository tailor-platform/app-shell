---
"@tailor-platform/app-shell": patch
---

Fix the `form/modal` pattern in the docs and the bundled `app-shell-patterns` skill. Both examples built the dialog body on a native `<form onSubmit>` with `new FormData(event.currentTarget)`, which skips `Form` validation and server-error routing and contradicts the pattern's own rules. They now use `Form` with `onFormSubmit(values)`, plain `<Field.Control />`, and a `type="button"` Cancel. Refs tailor-inc/platform-planning#2000.
