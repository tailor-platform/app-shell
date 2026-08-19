---
name: code-review
description: "Review or implement AppShell package/component changes with consumer-facing contract checks and package implementation guidance."
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
   - Prefer `git diff main...HEAD -- 'packages/**'`
   - If `main` is unavailable, fall back to `git diff HEAD~1 -- 'packages/**'`
2. Ignore non-package changes.
3. Load the shared rubric from [instruction.md](instruction.md), using its default cross-cutting guidance and conditional specialized references as needed.
4. If exported symbols or consumer entrypoints changed, inspect package entrypoints and trace usages/references.
5. Follow the shared rubric and output format in [instruction.md](instruction.md).

If no matching files changed, state that there are no package-review changes to review.
