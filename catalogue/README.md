# app-shell-catalogue

UI pattern catalogue for `@tailor-platform/app-shell`. Contains reference implementations and generates skill documentation for AI coding agents.

## Structure

- `src/fundamental/` — Foundational references (components, design system, GraphQL)
- `src/page/` — Screen-level page entries (the shape of a whole screen)
- `src/pattern/` — UI pattern implementations (list, detail, form, interaction)
- `scripts/` — Generation tooling

## Generate Skills

```bash
pnpm build
```

Outputs skill files to `packages/core/skills/app-shell-patterns/` for distribution via npm.
