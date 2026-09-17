---
name: quality-check
description: "Runs type-check, lint, test, check-dts, and formatting for the AppShell project. Use when: finishing a feature, before committing, validating code quality, running pnpm type-check, pnpm lint, pnpm test, pnpm fmt."
---

# Quality Check

Run type-check, lint, test, `check-dts`, and formatting in sequence. Fix errors where possible and re-run until clean. Formatting runs last so that any code changes from fixing errors are also formatted.

These are the same tasks CI runs in `.github/actions/ci`. Keep this list in step with that file — a task that runs there but not here passes locally and fails on the PR.

## Procedure

### Step 1: Type Check

Run TypeScript type checking:

```
pnpm type-check
```

If there are type errors, attempt to fix them in the source code and re-run until clean.

### Step 2: Lint

Run linting:

```
pnpm lint
```

If there are lint errors, attempt to fix them in the source code and re-run until clean.

### Step 3: Test

Run tests:

```
pnpm test
```

If there are test failures, attempt to fix them in the source code and re-run until clean.

### Step 4: Check published declarations

Type-check the `.d.ts` files that actually ship:

```
pnpm exec turbo run check-dts
```

Step 1 cannot catch what this catches: `type-check` sets `skipLibCheck: true` and never looks at
the emitted declarations, while `check-dts` packs a tarball and type-checks it with
`skipLibCheck: false`. A declaration that only breaks for consumers fails here and nowhere else.

### Step 5: Format

Run formatting:

```
pnpm fmt
```

If formatting changes any files, report which files were modified. To verify the tree the way CI
does — `pnpm fmt:check` fails the build on any unformatted file, repo-wide:

```
pnpm fmt:check
```

## Output

Provide a summary of:

1. Type errors found and fixed (if any)
2. Lint errors found and fixed (if any)
3. Test failures found and fixed (if any)
4. Declaration (`check-dts`) errors found and fixed (if any)
5. Formatting changes (if any)
