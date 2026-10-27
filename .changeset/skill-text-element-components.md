---
"@tailor-platform/app-shell": patch
---

The document detail page example in the `app-shell-patterns` skill uses `Text.span` and `Text.p` instead of `render={<span />}` and `render={<p />}`. This follows the skill rule to use `render` only to compose with another component. The rendered elements and classes do not change.
