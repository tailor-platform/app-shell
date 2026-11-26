---
"@tailor-platform/app-shell": major
---

Replace `StepperStep.badge` with `render({ label, status })` for custom label-and-description layouts. `render` and `description` are mutually exclusive; the common `label` remains required for narrow-container captions, tooltips, and navigation names.

Return non-interactive content only: Stepper owns passed-step buttons, markers, connectors, and progress announcements. Below 400px, the standard `label` is used instead of custom content.

Before:

```tsx
{
  id: "approval",
  label: "Approval",
  badge: <Badge variant="outline-warning">Waiting</Badge>,
  description: "Due 12 Nov",
}
```

After:

```tsx
{
  id: "approval",
  label: "Approval",
  render: ({ label }) => (
    <span className="flex flex-col gap-1">
      <span className="flex items-center gap-2">
        <Text.span>{label}</Text.span>
        <Badge variant="outline-warning">Waiting</Badge>
      </span>
      <Text.span variant="body-sm">Due 12 Nov</Text.span>
    </span>
  ),
}
```
