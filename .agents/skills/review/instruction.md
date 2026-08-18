---
description: Shared AppShell package review rubric for GitHub Agentic Workflows and pi skills.
---

## Review Scope

Review only changed implementation under `packages/**`.

Do not review `docs/**`, `examples/**`, `.changeset/**`, `.github/**`, generated files, or other repo/workflow surfaces unless the user explicitly asks for a broader review.

### Breaking Change Baseline

When evaluating whether a change is breaking, compare against the base branch, not earlier commits on the same branch.

## References

Load these cross-cutting references by default:

- `/.agents/skills/review/reference/cross-cutting/component-design.md` — public API shape, wrapping patterns, styling, testing shape
- `/.agents/skills/review/reference/cross-cutting/react.md` — state ownership, `useEffect`, async lifecycle, subscriptions, memoization
- `/.agents/skills/review/reference/cross-cutting/accessibility.md` — interactive semantics, keyboard support, focus, labels, announced state
- `/.agents/skills/review/reference/cross-cutting/low-level-apis.md` — timers, measurement, observers, imperative DOM, browser coordination
- `/.agents/skills/review/reference/cross-cutting/complex-form-controls.md` — field semantics, composite inputs, `Field` / `Form` bridging, proxy or hidden inputs, validation wiring, assisted-selection synchronization

Load these area references only when they match the touched files or behavior:

- `/.agents/skills/review/reference/areas/routing-and-auth.md` — `packages/core/src/routing/**`, auth providers/contexts/callback handling, navigation generation, command-palette routing, breadcrumb/page-meta behavior tied to routing
- `/.agents/skills/review/reference/areas/theme-style-and-exports.md` — `packages/*/src/index.ts`, package `exports` or other consumer entrypoints, CSS/theme assets, style entrypoints, published style contract
- `/.agents/skills/review/reference/areas/overlays-and-portals.md` — dialog/popover/sheet/menu/tooltip behavior, portal/container ownership, layering, focus boundary, shell popup integration

## Public Contract Checks

When the diff touches exported symbols or consumer-facing entrypoints:

- inspect the package entrypoint (`packages/*/src/index.ts`, package `exports`, style entrypoints)
- trace importers/usages/references
- treat a file as internal unless it is re-exported or otherwise shipped to consumers

## Review Order

1. exported/public contract
2. area-specific concerns
3. cross-cutting concerns
4. missing evidence

## Evidence Expectations

Treat these as defaults unless the change is truly trivial:

- public TypeScript API change → consumer-shaped type coverage
- routing/auth change → browser-level or e2e smoke evidence
- stateful UI / overlay / theme / complex form control change → example, visual, or interaction verification
- low-level browser/timing API or non-obvious `useEffect` → rationale comment or focused test

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
