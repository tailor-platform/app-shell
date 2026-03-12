---
name: quality-check
description: "Runs type-check, lint, test, and formatting for the AppShell project. Use when: finishing a feature, before committing, validating code quality, running pnpm type-check, pnpm lint, pnpm test, pnpm fmt."
---

# Quality Check

Run type-check, lint, test, and formatting in sequence. Fix errors where possible and re-run until clean. Formatting runs last so that any code changes from fixing errors are also formatted.

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

### Step 4: Format

Run formatting:

```
pnpm fmt
```

If formatting changes any files, report which files were modified.

## Output

Provide a summary of:

1. Type errors found and fixed (if any)
2. Lint errors found and fixed (if any)
3. Test failures found and fixed (if any)
4. Formatting changes (if any)
