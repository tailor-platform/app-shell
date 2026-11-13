---
"@tailor-platform/app-shell": minor
---

Add `Stepper` for showing progress through a fixed sequence of steps: the steps of a wizard form, the stages of an approval flow, the quality gates of a project. Each step has a `status` (`complete`, `current`, `upcoming` or `skipped`), an optional `badge` beside its label and an optional `description` under it, and the line between steps fills up to the furthest step reached. It lays out horizontally or vertically; a horizontal Stepper scrolls sideways when its steps don't fit and, below 400px of container width, shows only its markers with "Step 2 of 4" and the current step's label, and each marker names its step in a tooltip. `onStepClick` makes completed steps clickable, and step ids are typed so `onStepClick` receives your own id union.

```tsx
<Stepper
  aria-label="New purchase order"
  steps={[
    { id: "supplier", label: "Supplier", status: "complete" },
    { id: "delivery", label: "Delivery", status: "current" },
    { id: "review", label: "Review", status: "upcoming" },
  ]}
  onStepClick={goToStep}
/>
```
