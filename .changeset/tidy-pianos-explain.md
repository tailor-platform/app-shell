---
"@tailor-platform/app-shell": patch
---

Fix the bundled `app-shell-patterns` skill, whose form guidance contradicted the package. `components.md` described `Form` as "wired to react-hook-form" and `Field` as binding "to react-hook-form via `name`" — neither is true. `Form`/`Field`/`Fieldset` wrap Base UI and own accessibility wiring and visual state only; `react-hook-form` stopped being a runtime dependency in 1.4.0. Meanwhile every `form/*` reference implementation ignored `Form` entirely and hand-rolled `<form onSubmit>` + `new FormData(...)`, which skips validation and server-error routing — while the skill's own rules say to use AppShell components over raw HTML.

The four `form/*` patterns now use `Form` with `onFormSubmit`, and document the model they implement: `onFormSubmit` collects values from registered `Field.Root`s rather than reading `FormData`, so **every** control — `Select`, `Combobox` and `Autocomplete` included — participates simply by being wrapped in a `Field.Root name="…"`. No `name` on the control, no `useState`, no merging in the submit handler.

Documents two things that were previously undiscoverable: an object-valued dropdown submits as a JSON string unless `itemToStringValue` is supplied (items shaped `{ value, label }` use `value` automatically), and a page-header Save reaches a body form by matching `Form`'s `id` with a detached `<Button type="submit" form="…">`.

Also corrects `docs/components/form.md`, which built its `Select` example from `Select.Trigger` / `Select.Popup` / `Select.Item`. That code could never have compiled: `Select` is the pre-assembled standalone component and its low-level sub-components live under `Select.Parts.*` by design, while `Select.Popup` has never existed at all — AppShell's is `Select.Content`.
