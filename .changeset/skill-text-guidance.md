---
"@tailor-platform/app-shell": patch
---

The `app-shell-patterns` skill now tells agents to write headings, body copy, labels, and captions with `Text` and a typography role, instead of a bare `<p>`, `<h*>`, or `<span>` with `text-sm` or `text-xs`.
The document detail page example and the typography guide now follow this rule. The example's `Value` helper now uses `body-md`, the same role as the built-in `DescriptionCard` values.
