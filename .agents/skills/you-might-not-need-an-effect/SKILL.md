---
name: you-might-not-need-an-effect
description: Review React code for unnecessary or misused useEffect/useLayoutEffect and suggest smaller alternatives. Use when adding a new effect, reviewing changed React files, or cleaning up effect-heavy components and hooks.
---

# You Might Not Need an Effect

Use this as a knowledge skill for `useEffect` / `useLayoutEffect`.

Before judging an effect, read these examples:

- [Anti-patterns and legitimate cases](anti-patterns.md)

## Scope

- If the user supplied paths, scan those paths.
- Otherwise, scan changed React source files first.
- If there are no changed React source files, scan the project's React source directories.
- Exclude tests, snapshots, build output, and dependencies.

Use exact search for hooks:

```bash
rg -n "use(LayoutEffect|Effect)\\s*\\(" <scope> --glob '*.{ts,tsx,js,jsx}'
```

## How to think

Read the whole file. Do not judge from grep output alone.

Ask this first:

- If the code should run because the component was **displayed**, an effect may be appropriate.
- If the code should run because the user **interacted**, it usually belongs in an event handler.

For each effect, decide whether it should be:

- **deleted** — unnecessary effect
- **rewritten** — real synchronization exists, but there is a smaller or safer pattern
- **kept** — legitimate effect

Prefer the smallest replacement in this order:

1. existing codebase helper or pattern
2. render-time derivation
3. event handler
4. `useMemo`
5. `useSyncExternalStore`
6. effect with cleanup

False positives are worse than missing one borderline case.

## Common anti-patterns

### 1. Derived state

**Detect:** the effect sets state that can be computed from props, query data, loader data, or other state already available during render.

**Fix:** compute inline. If expensive, use `useMemo`.

### 2. Event logic in effect

**Detect:** the effect shows a toast, navigates, submits, opens/closes UI, or logs an action because some state changed after a click or submit.

**Fix:** move the side effect to the event handler that caused it.

### 3. POST / mutation in effect

**Detect:** the effect sends a POST request, mutation, or write operation because some submit-related state changed.

**Fix:** if the request should happen because the user clicked or submitted, do it in the event handler, not in an effect triggered by state.

### 4. Parent notification in effect

**Detect:** the effect calls `onChange`, `onSelect`, `onLoaded`, `onFetched`, or similar callback props after local state changes.

**Fix:** call the callback in the same event handler that updates local state, or lift the state/data to the parent.

### 5. Passing data to the parent in an effect

**Detect:** a child fetches or computes data, then pushes it upward with `onFetched`, `onData`, or a setter inside an effect.

**Fix:** if parent and child need the same data, fetch in the parent and pass it down.

### 6. Prop-driven resets

**Detect:** the effect resets all or part of local state when an identity prop changes.

**Fix:** prefer `key={identity}` for full resets; otherwise derive the value during render.

### 7. Imperative head management

**Detect:** the effect sets `document.title`, touches `document.head`, or manages favicon `<link>` tags.

**Fix:** prefer the framework or app's declarative head mechanism. If the title is derived from render data, do not mirror it through state + effect.

### 8. App initialization in effect

**Detect:** `useEffect(..., [])` doing one-time startup work.

**Fix:** keep only when React must coordinate with an external client or mounted browser lifecycle. Otherwise prefer work that happens before component effects: module-level setup, app startup/bootstrap code, route loaders, or auth initialization.

In AppShell specifically, remember it embeds React Router. Before using a mount effect for initialization, ask whether the work belongs earlier in the lifecycle:

- **route loader** — page data, route-gated checks, redirects, URL-driven preloading
- **auth initialization** — session restore, callback handling, login state checks
- **app startup / bootstrap** — one-time client setup, configuration loading, global wiring

If the work does not require mounted DOM or browser-only lifecycle timing, it probably should not start in `useEffect`.

### 9. External subscriptions

**Detect:** the effect uses `matchMedia`, `addEventListener`, `subscribe`, or similar to mirror long-lived external state into React state.

**Fix:** prefer `useSyncExternalStore` or an existing shared hook. Keep component-scoped imperative integration with proper cleanup when it is truly integration code.

### 10. Fetch without cleanup

**Detect:** async work in an effect updates state after completion but has no abort/ignore cleanup.

**Fix:** add abort/ignore cleanup, or move the fetch to an event handler if it is event-driven.

### 11. Effect chains

**Detect:** multiple effects update state mainly to trigger other effects, forming a chain of cascading renders.

**Fix:** derive what you can during render, and compute the next state in the event handler instead of chaining effects together.

## Legitimate effects — usually keep

Skip these when they are implemented correctly:

- synchronizing with an external system that exists outside React
- component-scoped timers, cleanup, cancellation, or resource release
- focus management on mount
- ref-scoped DOM observers/listeners with cleanup
- analytics that should fire on page display rather than a user action
- mount/unmount registration with cleanup

## Output

Do not force a rigid report format.

- If the user asked for review, give a short list of real findings with file, reason, and smallest fix.
- If the user asked for implementation, apply the smallest safe fix.
- If an effect is legitimate, say so briefly and move on.

## Notes

- Prefer one shared/root fix over patching multiple callers.
- Prefer existing repo patterns over new abstractions.
- If the codebase already has a declarative way to handle head state, routing side effects, or subscriptions, reuse it.

## Reference

- [React docs — You Might Not Need an Effect](https://react.dev/learn/you-might-not-need-an-effect)
