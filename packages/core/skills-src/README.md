# AppShell skill sources

This directory is the tracked source for the `app-shell-patterns` skill bundled with `@tailor-platform/app-shell`.

- Edit this directory, never `packages/core/skills/`.
- `packages/core/skills/` is generated only by the package `prepack` lifecycle and is deleted by `postpack`.
- `SKILL.template.md` is the skill index template. `fundamental/`, `page/`, and `pattern/` provide its references and embedded, type-checked examples.
- `docs/migrations.md` remains the source for the generated migration reference because it is also the user-facing migration guide.
