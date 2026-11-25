---
"@tailor-platform/app-shell": minor
---

Add `Stepper` for showing progress through a fixed sequence of steps: the steps of a wizard form, the stages of an approval flow, the quality gates of a project. Pass the `steps` in order (each with an `id`, a `label`, an optional `badge` beside it and an optional `description` under it) and one `progress` value: `not-started`, `in-progress` with a `currentStepId`, or `complete`. The Stepper derives how each step looks — complete before the current step, upcoming after it — so it can't show two current steps. `skippedStepIds` marks passed steps the user skipped. The steps sit in a row that scrolls sideways when they don't fit and, below 400px of container width, shows only its markers with "Step 2 of 4" and the current step's label, and each marker names its step in a tooltip. `onStepClick` makes completed and skipped steps clickable, and step ids are typed so `progress` and `onStepClick` only take your own ids.

For local wizard navigation, `useStepper` manages typed progress with `next`, `back`, `skip`, and `moveStep`. `next()` completes the flow on the last step. The return type is a discriminated union: narrow with `!flow.isComplete` to call `next` / `skip`, which are `undefined` once complete. `back` and `moveStep` remain available to reopen a step. Use `moveStep(id, { skipped: true })` to skip the current step through the destination's predecessor; the default completes them. Server-owned flows can pass `progress` directly.

```tsx
import { Stepper, useStepper } from "@tailor-platform/app-shell";

const flow = useStepper({
  steps: [
    { id: "supplier", label: "Supplier" },
    { id: "delivery", label: "Delivery" },
    { id: "review", label: "Review" },
  ],
  initialStepId: "delivery",
});

<Stepper
  aria-label="New purchase order"
  steps={flow.steps}
  progress={flow.progress}
  onStepClick={flow.moveStep}
/>;
```
