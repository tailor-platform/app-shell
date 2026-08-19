---
name: implementation-strategy
description: "Plan AppShell package/component changes before coding by fixing scope, selecting existing patterns, and loading the right shared references."
---

# Implementation Strategy

Use this skill before implementing or reshaping AppShell package/component changes under `packages/**`.

Read `/.agents/references/README.md` first: [../../references/README.md](../../references/README.md)

## Objective

Choose the smallest coherent change before coding.

## Scope Contract

Record these four items before editing:

1. **Required behavior** — the smallest user-visible scenario that must work
2. **Compatibility requirements** — existing behavior or public contract that must remain usable
3. **Intentionally unsupported cases** — nearby cases to reject or leave out for now
4. **Validation plan** — the lightest check that proves the change works

## Shared References

Use `/.agents/references/README.md` to decide which shared references to load for the change.

## Workflow

1. Identify the package files and consumer-facing surface the change touches.
2. Find the nearest existing implementation pattern before adding a new one.
3. Keep public surface narrow; do not export helpers or speculative extension points.
4. Reuse the current source of truth for behavior, state, and styling whenever possible.
5. If the change touches exported symbols or consumer entrypoints, inspect `packages/*/src/index.ts` and trace usages.
6. Prefer early rejection or a documented non-goal over broadening support without evidence.
7. Choose the minimum validation that matches the risk: focused type coverage, targeted test, or interaction/example check.

## Output

Return a short implementation plan covering:

- required behavior
- compatibility requirements
- intentionally unsupported cases
- references to load
- existing pattern/source of truth to reuse
- minimum validation to run
