---
"@tailor-platform/app-shell": minor
---

Ship a second agent skill, `skills/app-shell-upgrade/`, for upgrading `@tailor-platform/app-shell`. It carries the migration list and a step-by-step procedure: select the entries between the old and new versions, detect and apply each one, then verify. `app-shell-patterns` no longer includes `references/migrations.md` and now points to `app-shell-upgrade` instead. Its description also now lists the screens and patterns it covers, so agents load it more reliably.

If your app keeps a copy of `app-shell-patterns` (for example under `.claude/skills/`), copy `app-shell-upgrade` next to it from the installed package.
