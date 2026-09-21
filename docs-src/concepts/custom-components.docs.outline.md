---
kind: prose
group: custom-components
title: Custom Components
description: When AppShell lacks a component — compose first, and if you must build one, conform to the token system
---

# Custom Components

Most ERP screens compose entirely from AppShell primitives. When you hit a gap, work through this decision tree before building anything:

### Decision tree

1. **Can you compose existing AppShell primitives?** A "card with a metric and a trend arrow" is `MetricCard`, or `Card` plus a lucide icon — not a new component. Compose first, and check the [component docs](../components/) for what already exists before concluding there is a gap.
2. **If not, build it locally** under `src/components/<name>/`, conforming to the rules below.

> If a local custom proves reusable across several apps, it is a candidate to contribute upstream into AppShell — a separate, contributor workflow (see `CONTRIBUTING.md` / the `add-component` skill), not something to do from a consuming app.

### Conformance rules (non-negotiable for any custom component)

- **Tokens only.** No hex literals, no magic px values, no hand-rolled shadows. Every visual property maps to a token from the [Styling & Theming](./styling-theming.md) catalog — and only to a token that actually exists there.
- **Base UI data-attribute pattern for state.** Expose `data-*` attributes that reflect internal state; never style off React props alone. A custom toggle exposes `data-checked`; a custom step indicator exposes `data-active`, `data-completed`, etc.
- **Compose AppShell primitives inside.** If the custom needs a button, use `Button` — not raw `<button>`. Same for `Input`, `Badge`, `Card`. The custom's job is composition, not reinvention.
- **Document with a `README.md`** in the component folder listing: purpose, props, tokens used, and a brief justification for why this can't be composed from existing AppShell primitives.
- **Match accessibility behavior** of the closest AppShell equivalent — focus management, ARIA roles/attributes, keyboard interactions. Reach for Base UI primitives if the behavior is non-trivial.

Example skeleton for a local custom component:

```tsx
// src/components/StepIndicator/index.tsx
import { Check } from "lucide-react";

type Props = { steps: string[]; current: number };

export function StepIndicator({ steps, current }: Props) {
  return (
    <ol className="flex gap-2">
      {steps.map((label, i) => (
        <li
          key={label}
          data-active={i === current ? "" : undefined}
          data-completed={i < current ? "" : undefined}
          className="
            flex items-center gap-2 rounded-md px-3 py-2
            bg-muted text-sm text-muted-foreground
            data-[active]:bg-primary data-[active]:text-primary-foreground
            data-[completed]:text-status-completed
          "
        >
          {i < current && <Check className="size-4" />}
          {label}
        </li>
      ))}
    </ol>
  );
}
```

Notice: every value is a real token, `data-*` attributes carry state, no hex literals, and the icon comes from `lucide-react` rather than a nonexistent `Icon` component.
