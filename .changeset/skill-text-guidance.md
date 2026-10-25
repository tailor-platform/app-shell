---
"@tailor-platform/app-shell": patch
---

The `app-shell-patterns` skill has two new rules. Text uses `Text` and typography roles, not a bare `<p>`, `<h*>`, or `<span>` with `text-sm` or `text-lg font-semibold`. Status and feedback colors use the semantic color roles, not the deprecated `--status-*`, `--alert-*`, or `--destructive` tokens.
The document detail page example, the typography guide, and the quickstart now use `Text`. The example's `Value` helper now uses `body-md`, the same role as the built-in `DescriptionCard` values.
