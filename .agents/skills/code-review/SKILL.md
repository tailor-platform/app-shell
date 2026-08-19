---
name: code-review
description: "Review local packages/ changes for AppShell package implementation risks and consumer-facing contract changes."
---

# Code Review

Review local code changes under `packages/**`.

Read the shared review rubric first: [instruction.md](instruction.md)

## Local Scope

Focus only on changed files under `packages/**`.

## References to Load

See the shared rubric in [instruction.md](instruction.md).

## Before Reviewing

1. Obtain the local diff.
   - Prefer `git diff main -- 'packages/**'`
   - If `main` is unavailable, fall back to `git diff HEAD~1 -- 'packages/**'`
2. Ignore non-package changes.
3. Load the cross-cutting references above, then add conditional references only when the touched files or behavior warrant them.
4. If exported symbols or consumer entrypoints changed, inspect package entrypoints and trace usages/references.
5. Follow the shared rubric and output format in [instruction.md](instruction.md).

If no matching files changed, state that there are no package-review changes to review.
