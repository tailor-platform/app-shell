---
name: review
description: "Review AppShell package implementation changes under packages/**."
---

# Review

Use this skill only for review of changed implementation under `packages/**`.

Do not use it for `docs/**`, `examples/**`, `.changeset/**`, `.github/**`, generated files, or other repo/workflow surfaces unless the user explicitly asks for a broader review.

## Procedure

1. Obtain the diff.
   - Prefer the PR diff.
   - Otherwise use `git diff main...HEAD`.

2. Narrow the scope.
   - Review only changed files under `packages/**`.
   - Ignore non-package changes.

3. Load references.
   - Load the cross-cutting references by default.
   - Then load only the area references that match the touched files or behavior.

4. Review in this order.
   - exported/public contract
   - area-specific concerns
   - cross-cutting concerns
   - missing evidence

5. Report.
   - Up to 10 findings, sorted by severity.
   - Final verdict: `Approve` or `Request Changes`.

## Quick Reference

Load these cross-cutting references by default:

- `reference/cross-cutting/component-design.md` — public API shape, wrapping patterns, styling, testing shape
- `reference/cross-cutting/react.md` — state ownership, `useEffect`, async lifecycle, subscriptions, memoization
- `reference/cross-cutting/accessibility.md` — interactive semantics, keyboard support, focus, labels, announced state
- `reference/cross-cutting/low-level-apis.md` — timers, measurement, observers, imperative DOM, browser coordination

Load these area references only when they match the touched files or behavior:

- `reference/areas/routing-and-auth.md` — `packages/core/src/routing/**`, auth providers/contexts/callback handling, navigation generation, command-palette routing, breadcrumb/page-meta behavior tied to routing
- `reference/areas/data-table-and-stateful-ui.md` — DataTable components/hooks/models, persisted or synchronized UI state, sorting/filtering/pagination/pinning/selection/column visibility
- `reference/areas/theme-style-and-exports.md` — `packages/*/src/index.ts`, package `exports` or other consumer entrypoints, CSS/theme assets, style entrypoints, published style contract
- `reference/areas/overlays-and-portals.md` — dialog/popover/sheet/menu/tooltip behavior, portal/container ownership, layering, focus boundary, shell popup integration
- `reference/areas/complex-form-controls.md` — `Field` / `Form` bridging, composite inputs such as select/combobox-like controls, proxy inputs, hidden inputs, validation wiring

## Public contract checks

When the diff touches exported symbols or consumer-facing entrypoints:

- inspect the package entrypoint (`packages/*/src/index.ts`, package `exports`, style entrypoints)
- trace importers/usages/references
- treat a file as internal unless it is re-exported or otherwise shipped to consumers

## Severity

- **High**: breaking API change, critical runtime bug, major behavior regression
- **Medium**: brittle behavior, missing contract coverage, likely integration drift
- **Low**: docs/tests/rationale gaps, avoidable complexity, minor API awkwardness

Do not block only on Low findings.

## Output format

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

## Review rules

- Review only changed package code and changed package entrypoints/exports.
- Evaluate breaking changes against the base branch.
- Do not flag issues already fully covered by lint/type-check unless the real risk is broader.
- Prefer narrow, actionable findings over long issue lists.
