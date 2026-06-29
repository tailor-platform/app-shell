---
name: api-design-review
description: Review local packages/ changes for API design consistency, public surface risks, and TypeScript/React footguns in the AppShell core package. Use when: reviewing local packages/ changes before push or validating public API changes.
---

# API Design Review

Review local code changes in `packages/` for API consistency and potential present/future footguns.

Read the shared review rubric first: [instruction.md](instruction.md)

## Local Scope

Focus only on changed files matching `packages/**/*.ts`, `packages/**/*.tsx`, and `packages/**/package.json`.

## Before Reviewing

1. Get the local diff against the base branch:
   - Prefer `git diff main -- 'packages/**'`
   - If that is empty or `main` is unavailable, fall back to `git diff HEAD~1 -- 'packages/**'`
2. Build the public API map from `packages/core/src/index.ts`.
3. Skip internal files entirely — files not exported from `packages/core/src/index.ts`.
4. For each changed public symbol, trace usages across the codebase with the available search tools.
5. Prioritize symbols with many usages or likely breaking changes.
6. Follow the shared review rubric and output format in [instruction.md](instruction.md).

If no matching files changed, state that there are no API-relevant changes to review.
