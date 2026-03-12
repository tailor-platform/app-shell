---
name: quality-check
description: "Runs formatting, type-check, lint, and test for the AppShell project. Use when: finishing a feature, before committing, validating code quality, running pnpm fmt, pnpm type-check, pnpm lint, pnpm test."
---

# Quality Check

Run formatting, type-check, lint, and test in sequence. Fix errors where possible and re-run until clean.

## Procedure

### Step 1: Format

Run formatting:

```
pnpm fmt
```

If formatting changes any files, report which files were modified.

### Step 2: Type Check

Run TypeScript type checking:

```
pnpm type-check
```

If there are type errors, attempt to fix them in the source code and re-run until clean.

### Step 3: Lint

Run linting:

```
pnpm lint
```

If there are lint errors, attempt to fix them in the source code and re-run until clean.

### Step 4: Test

Run tests:

```
pnpm test
```

If there are test failures, attempt to fix them in the source code and re-run until clean.

## Output

Provide a summary of:

1. Formatting changes (if any)
2. Type errors found and fixed (if any)
3. Lint errors found and fixed (if any)
4. Test failures found and fixed (if any)
