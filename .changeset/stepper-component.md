---
"@tailor-platform/app-shell": minor
---

Add `Stepper` for showing progress through a fixed sequence of steps: the steps of a wizard form, the stages of an approval flow, the quality gates of a project. Pass the `steps` in order (each with an `id`, a `label`, an optional `badge` beside it and an optional `description` under it) and one `progress` value: `not-started`, `in-progress` with a `currentStepId`, or `complete`. The Stepper derives how each step looks — complete before the current step, upcoming after it — so it can't show two current steps. `skippedStepIds` marks passed steps the user skipped. The steps sit in a row that scrolls sideways when they don't fit and, below 400px of container width, shows only its markers with "Step 2 of 4" and the current step's label, and each marker names its step in a tooltip. `onStepClick` makes completed and skipped steps clickable, and step ids are typed so `progress` and `onStepClick` only take your own ids.

```tsx
<Stepper
  aria-label="New purchase order"
  steps={[
    { id: "supplier", label: "Supplier" },
    { id: "delivery", label: "Delivery" },
    { id: "review", label: "Review" },
  ]}
  progress={{ state: "in-progress", currentStepId: "delivery" }}
  onStepClick={goToStep}
/>
```
