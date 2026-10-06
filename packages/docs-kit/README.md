# @tailor-platform/app-shell-docs-kit

Internal, unpublished tooling for the app-shell documentation pipeline. It turns
authored **source** under `docs-src/` into the generated docs under `docs/` and the
`docs-manifest.json` integrity baseline — deterministically, with no LLM.
Consumer skills are hand-authored under repo-root `skills/`, outside this pipeline.

## What it does

- **Extract** the public type surface from `index.ts` (ts-morph) and hash it, so a
  doc can be tied to the exports it documents and drift is detectable.
- **Reconcile coverage** against `index.ts` both ways: an exported symbol no unit
  covers (advisory while `policy.coverage.enforce` is off), and a unit that owns no export
  or documents a non-exported symbol (always blocks).
- **Assemble** each unit's Markdown from its outline (prose verbatim), extracted
  example fences, and opt-in auto prop tables (`<!-- api -->`).
- **Index** the docs through an opt-in `<!-- docs-index -->` token, generating document
  titles, descriptions, and relative links from all outlines. The reading guidance lives in
  `docs-src/guides/index.docs.outline.md`.

## CLI

```bash
docs-kit sync    # regenerate docs/ (including its content index) and the manifest (idempotent)
docs-kit check   # deterministic drift gate; non-zero exit on any blocking finding
```

Run them from the repo root via the workspace scripts: `pnpm docs:sync` /
`pnpm docs:check`. `--root <dir>` overrides the working directory (defaults to cwd).

## Authoring

Edit only `docs-src/**/*.docs.outline.md` (intent) and their sibling
`*.docs.examples.tsx` (runnable examples), then run `docs:sync`. Everything under
`docs/` is generated and must never be hand-edited. See
[`decisions/documentation-management-overhaul.md`](../../decisions/documentation-management-overhaul.md)
and the `resync-docs` skill.

Core's `prepack` copies the generated docs tree into ignored `packages/core/docs/` for npm;
relative links keep their original directory structure. The repo-managed
`skills/app-shell-patterns/` skill locates these installed, version-matched docs and is not
bundled in npm. See
[`decisions/skill-documentation-separation.md`](../../decisions/skill-documentation-separation.md).

## Layout

| File                                       | Role                                                     |
| ------------------------------------------ | -------------------------------------------------------- |
| `project.ts`                               | type-surface extractor + hasher, prop/default extraction |
| `coverage.ts`                              | two-way `index.ts` reconciliation                        |
| `assemble.ts`                              | outline + examples + API tables → Markdown               |
| `outline.ts` / `config.ts` / `manifest.ts` | discovery, config, manifest I/O                          |
| `sync.ts` / `check.ts` / `cli.ts`          | commands                                                 |
