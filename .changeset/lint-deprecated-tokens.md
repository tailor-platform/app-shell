---
"@tailor-platform/eslint-plugin-app-shell": minor
---

Add the `no-deprecated-tokens` rule and enable it in `recommended` as a warning. It reports the deprecated `--status-*`, `--alert-*`, `--destructive` and `--app-shell-type-*` tokens and their Tailwind utilities in string and template literals, and names the replacement, for example `text-destructive` → `text-danger-text` and `bg-status-completed/10` → `bg-success-surface`. These tokens still work but will be removed in the next major version of AppShell. The rule does not read CSS files.
