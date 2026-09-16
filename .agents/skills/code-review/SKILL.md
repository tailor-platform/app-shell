---
name: code-review
description: "Review AppShell package/component changes with consumer-facing contract checks and shared reference guidance."
---

# Code Review

Review local package changes using the shared AppShell package-review guidance.

The main review rubric lives in [instruction.md](instruction.md). Read that file first and follow it.

## Local Review Flow

1. Obtain the review diff and context.
   - If the current branch already has a PR, prefer reviewing that PR diff and context.
   - Otherwise, use a local diff.
2. For a local diff, prefer:
   - `git diff main...HEAD -- 'packages/**'`
   - if `main` is unavailable, `git diff HEAD~1 -- 'packages/**'`
3. Filter to changed implementation under `packages/**`, plus changed package entrypoints/exports when relevant.
4. If no matching package files remain, state that there are no package-review changes to review.
5. Read `/.agents/references/README.md`, then load only the relevant shared references.
6. Only read PR discussion or prior comments when a design decision is ambiguous and the discussion could change the review outcome.
7. Report findings using the format and severity rules from [instruction.md](instruction.md).
