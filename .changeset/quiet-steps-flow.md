---
"@tailor-platform/app-shell": minor
---

Add `useStepper` to manage typed wizard progress with `next`, `back`, `skip`, `finish`, and `moveStep`.
Use `moveStep(id, { skipped: true })` to skip the current step through the destination's predecessor; the default completes them.

```tsx
const flow = useStepper({
  steps: [
    { id: "details", label: "Details" },
    { id: "review", label: "Review" },
  ],
});

<Stepper steps={flow.steps} progress={flow.progress} onStepClick={flow.moveStep} />;
```
