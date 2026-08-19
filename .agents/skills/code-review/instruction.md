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

## Review Order

1. exported/public contract
2. relevant default concerns
3. missing evidence

## Evidence Expectations

When verification, documentation, or rationale is important to assess risk, call out missing evidence explicitly.

## Severity

Report up to 10 findings, sorted by severity.

- **High**: breaking API change, critical runtime bug, major behavior regression
- **Medium**: brittle behavior, missing contract coverage, likely integration drift
- **Low**: docs/tests/rationale gaps, avoidable complexity, minor API awkwardness

Do not block only on Low findings.

## Output

Use this format:

```md
## Scope

- reviewed:
- skipped:
- references applied:

## Findings

[1/N — High] ...
[2/N — Medium] ...

## Missing Evidence

- ...

**Verdict: Approve | Request Changes**
```

## Review Rules

- Review only changed package code and changed package entrypoints/exports.
- Do not flag issues already fully covered by lint/type-check unless the real risk is broader.
- Prefer narrow, actionable findings over long issue lists.
