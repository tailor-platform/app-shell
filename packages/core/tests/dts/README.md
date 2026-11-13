# Published declaration fixtures

Each immediate child directory is an independent consumer TypeScript project. Add a directory
with `.ts` / `.tsx` files to register another check; no runner changes or per-case configuration
are needed. Use public package imports and `@ts-expect-error` for usages that must be rejected.
Do not use `.test.*` filenames: these are compile-time fixtures, not Vitest tests.

`pnpm exec turbo run check-dts` builds the packages, packs and installs them once, then compiles
the entry-point smoke test and each fixture separately with `skipLibCheck: false`. Fixtures run
outside the workspace, against the installed tarball. The runner loads the installed TypeScript
compiler API once and creates a separate program and compiler host for each case, keeping module
augmentations from leaking between cases. It generates each case's `tsconfig.json` with the
shared compiler settings; don't add one to a fixture. Declaration checking is enabled without
emitting files (`declaration: true`, `noEmit: true`), so export inferred values when testing that
consumer declarations can name their types without references to private chunks.

Set `KEEP_DTS_FIXTURE=1` to preserve the scratch project when debugging.
