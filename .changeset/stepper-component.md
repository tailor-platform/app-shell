---
"@tailor-platform/app-shell": minor
---

Add `Stepper` for showing progress through a fixed sequence of steps: the steps of a wizard form, the stages of an approval flow, the quality gates of a project. Pass the `steps` in order (each with an `id`, a required `label`, and either an optional `description` under it or a custom `render({ label, status })` for the text area) and one `progress` value: `not-started`, or `started` with `passedSteps`, an ordered prefix of `"complete"` / `"skipped"` results. The prefix length determines the current step; a result for every step means the flow is complete. This prevents a current or future step from also being marked skipped. The steps sit in a row that scrolls sideways when they don't fit and, below 400px of container width, shows only its markers with "Step 2 of 4" and the current step's label, and each marker names its step in a tooltip. `onStepClick` makes completed and skipped steps clickable, and its ids are inferred from `steps`.

`description` and `render` are mutually exclusive. Use `description` for the standard label-and-description layout, or `render` to compose custom content such as badges. Return non-interactive content only: Stepper owns passed-step buttons, markers, connectors, and progress announcements. Below 400px, captions and tooltips use the required `label` instead of custom content.

For local wizard navigation, `useStepper` manages typed progress with `next`, `back`, `skip`, and `moveStep`. `next()` completes the flow on the last step. The return type is a discriminated union: narrow with `flow.hasNext` to call `next` / `skip`, which are `undefined` once complete. `hasNext` stays true on the last step; call `next()` after successful final submission, whose state belongs to the page. `hasPrevious` indicates whether Back can move to or reopen a step. `back` and `moveStep` remain available after completion. Use `moveStep(id, { skipped: true })` to skip the current step through the destination's predecessor; the default completes them. Server-owned flows can pass `progress` directly.

```tsx
import { Stepper, useStepper } from "@tailor-platform/app-shell";

const flow = useStepper({
  steps: [
    { id: "supplier", label: "Supplier", description: "Choose a supplier" },
    { id: "delivery", label: "Delivery" },
    { id: "review", label: "Review", render: ({ label }) => <span>{label} — Ready</span> },
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
