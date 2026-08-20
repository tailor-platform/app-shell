# AppShell Shared References

This directory holds shared package and component guidance for AppShell skills.

Use these references from both implementation-time and review-time skills. Treat them as long-lived guidance, not proof that a current diff is correct.

## Reference Map

- [component-design.md](component-design.md) — public API shape, wrapping patterns, styling, published consumer contract, popup/container ownership, testing shape
- [react-use-effect.md](react-use-effect.md) — state ownership, `useEffect`, async lifecycle, subscriptions, memoization
- [accessibility.md](accessibility.md) — interactive semantics, keyboard support, focus, labels, announced state
- [low-level-apis.md](low-level-apis.md) — timers, measurement, observers, imperative DOM, browser coordination
- [composite-field-controls.md](composite-field-controls.md) — field semantics, composite inputs, `Field` / `Form` bridging, proxy or hidden inputs, validation wiring, and alignment with nearby Base UI-backed control contracts

## Inclusion Criteria

Keep guidance here only when it is:

- AppShell-specific and likely to be reused across multiple tasks
- stable enough to outlive one feature or review
- easy to violate from several implementation paths
- more valuable as a shared rule than as duplicated skill text

Do not store task-specific status, one-off findings, temporary plans, or workflow steps that belong in a skill.

## Maintenance Rules

- Keep durable guidance here and let skills decide when to load it.
- Prefer one owning reference for each topic; cross-link instead of copying the same rule into multiple files.
- Update the narrowest relevant reference when a reusable invariant becomes clear.
- Remove or rewrite guidance when implementation ownership or public contract changes.
- Verify claims against current source, tests, and docs instead of treating an older reference as automatically correct.
