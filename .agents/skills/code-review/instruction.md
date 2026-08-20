---
description: Shared AppShell package review rubric for review-time use with the shared AppShell references.
---

## Review Scope

Review only changed implementation under `packages/**`.

Do not review `docs/**`, `examples/**`, `.changeset/**`, `.github/**`, generated files, or other repo/workflow surfaces unless the user explicitly asks for a broader review.

### Breaking Change Baseline

When evaluating whether a change is breaking, compare against the base branch, not earlier commits on the same branch.

## References

Read `/.agents/references/README.md` first, then load the relevant shared references for the diff.

## Public Contract Checks

When the diff touches exported symbols or consumer-facing entrypoints:

- inspect the package entrypoint (`packages/*/src/index.ts`, package `exports`, style entrypoints)
- trace importers/usages/references
- treat a file as internal unless it is re-exported or otherwise shipped to consumers

## Review Depth

- Use export/usage impact analysis as the basis for tracing affected code paths.
- Evaluate suggested fixes holistically; consider what new edge cases or failure modes the fix would introduce.
- Verify documentation-implementation consistency when signatures or defaults change.
- Assess test quality, not just coverage; prefer evidence about runtime behavior.

## What to Flag

Report only issues that are genuinely impactful. Aim for quality over volume. Report up to 10 issues maximum, sorted by severity (High → Medium → Low).

Use this format for each finding:

```md
[N/total — Severity] Brief title
```

Keep each finding standalone and actionable. Do not collapse unrelated issues into one comment.

### Severity Levels

- **High**: breaking API change, critical runtime bug, major behavior regression
- **Medium**: brittle behavior, missing contract coverage, likely integration drift
- **Low**: docs/tests/rationale gaps, avoidable complexity, minor API awkwardness

Do not block only on Low findings.

## What NOT to Flag (Out of Scope)

- **Internal (non-exported) components** — Do not flag them as breaking API changes or public API concerns unless the real issue is changed runtime behavior.
- **Detectable by linter/type-check** — Code style, hooks rule violations, explicit `any`, import ordering.
- **Subjective** — Naming preferences, minor refactoring suggestions without clear justification.

## Review Rules

- Review only changed package code and changed package entrypoints/exports.
- Do not flag issues already fully covered by lint/type-check unless the real risk is broader.
- Prefer narrow, actionable findings over long issue lists.
- If there are no issues, say so explicitly and end with `**Verdict: Approve | Request Changes**`.
