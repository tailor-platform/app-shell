# Low-Level API Usage Review Criteria

Avoid low-level scheduling, timing, DOM inspection or mutation, and manual browser coordination unless they are the smallest correct fix.

Examples include:

- `requestAnimationFrame` — often introduces frame-ordering dependence that is hard to reason about across rerender and unmount.
- `queueMicrotask` — can hide ordering hacks behind "run this right after" logic instead of fixing ownership.
- `setTimeout(fn, 0)` and other timing deferrals such as `setTimeout` / `setInterval` — often paper over lifecycle bugs with delayed work and create cleanup risk.
- `flushSync` — forces synchronous rendering and can make behavior depend on fragile render timing.
- `getBoundingClientRect` — couples logic to layout measurement timing and can trigger reflow-sensitive behavior.
- `getComputedStyle` — makes behavior depend on rendered CSS state and can introduce brittle style-read timing.
- `document.querySelector` / `ref.current.querySelector` — reaches into DOM structure React does not type or own directly, so wrapper changes can silently break it.
- `innerHTML` / `dangerouslySetInnerHTML` — bypasses normal React rendering, can widen XSS risk, and makes ownership harder to track.
- manual event listeners outside normal ownership — can drift from component lifecycle and are easy to leak or double-register.
- imperative DOM mutation used to patch render timing — usually means React state flow or structure is fighting the implementation.
- repeated measurement / write loops — are often fragile, expensive, and sensitive to small layout changes.

## Review questions

- Could React state flow, CSS, Base UI behavior, or a small structural change avoid this?
- Does the code introduce timing dependence that will be hard to reason about later?
- Is cleanup obvious and reliable?
- Does the approach look safe across rerender, unmount, and race conditions?
- Is the reason for using the low-level API clear from the code or a nearby comment?
