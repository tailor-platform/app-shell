# Low-Level API Usage Review Criteria

Avoid low-level scheduling, timing, and manual DOM coordination unless they are the smallest correct fix.

Examples include:

- `requestAnimationFrame`
- `queueMicrotask`
- `setTimeout` / `setInterval`
- manual event listeners outside normal ownership
- imperative DOM mutation used to patch render timing
- repeated measurement / write loops

## Review questions

- Could React state flow, CSS, Base UI behavior, or a small structural change avoid this?
- Does the code introduce timing dependence that will be hard to reason about later?
- Is cleanup obvious and reliable?
- Does the approach look safe across rerender, unmount, and race conditions?
- Is the reason for using the low-level API clear from the code or a nearby comment?
