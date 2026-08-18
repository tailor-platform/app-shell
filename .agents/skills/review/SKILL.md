---
name: review
description: "Review local packages/ changes for AppShell package implementation risks and consumer-facing contract changes."
---

# Review

Review local code changes under `packages/**`.

Read the shared review rubric first: [instruction.md](instruction.md)

## Local Scope

Focus only on changed files under `packages/**`.

## Before Reviewing

1. Obtain the local diff.
   - Prefer `git diff main -- 'packages/**'`
   - If that is empty or `main` is unavailable, fall back to `git diff HEAD~1 -- 'packages/**'`
2. Ignore non-package changes.
3. Load the cross-cutting references by default.
4. Load only the area references that match the touched files or behavior.
5. If exported symbols or consumer entrypoints changed, inspect package entrypoints and trace usages/references.
6. Follow the shared rubric and output format in [instruction.md](instruction.md).

If no matching files changed, state that there are no package-review changes to review.
