---
"@tailor-platform/app-shell": patch
---

Rebuild the `form/composer` pattern on `Form` + `Field`. It was the only `form/*` pattern with neither — a bare `Card` of controls with an `onClick` submit — which left it inconsistent with its four siblings and short of three things a composer actually needs.

The body now sits in a `Field.Root` with a `sr-only` `Field.Label` (a real label instead of `aria-label`, so error and description wiring stays available), Send is `type="submit"` so validation gates it, and server rejections — moderation, rate limit, thread closed — route through `Form`'s `errors` prop into `Field.Error` rather than a toast, landing next to the text the user still has.

The body stays **controlled**: it is read during render to gate Send and to swap the placeholder, which a submit-time handler cannot do. The pattern doc now says so explicitly, because this is the one `form/*` pattern where field state is load-bearing rather than redundant — elsewhere `onFormSubmit` reads registered `Field.Root`s and mirroring values into state is the anti-pattern.

Also fixes a data-loss path in the reference implementation: it cleared the body unconditionally, losing the user's text when a submit failed. It now clears only on success.
