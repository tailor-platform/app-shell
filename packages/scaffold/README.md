# @tailor-platform/app-shell-scaffold

Small CLI that scaffolds compile-ready AppShell page bundles into an existing app.

## Usage

```bash
pnpm --filter @tailor-platform/app-shell-scaffold build
node packages/scaffold/dist/cli.mjs resource/list --name purchase-order --out src/pages/procurement/purchase-order
```

## Current scope

- `resource/list`
- generates `page.tsx` plus the page-local table component
- no backend wiring; generated files keep `TODO(app-shell-scaffold)` markers where app-specific data belongs
- CLI prints file-specific next steps after generation

Skipped: prompts, multi-step workflows, detail/create/edit templates. Add them when this shape proves useful.
