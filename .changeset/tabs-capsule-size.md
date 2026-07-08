---
"@tailor-platform/app-shell": minor
---

Add a `size` prop to `Tabs` and make `capsule` icon-only tabs square

`Tabs.Root` now accepts `size?: "xs" | "sm" | "default" | "lg"` (default `"default"`), mirroring `Button`'s height tiers. It sets a **minimum** height on the `capsule` variant — taller content still grows — so a capsule track sits flush next to a `Button`:

| `size`    | capsule track | matches Button |
| --------- | ------------- | -------------- |
| `xs`      | 28px          | `size="xs"`    |
| `sm`      | 32px          | `size="sm"`    |
| `default` | 36px          | default        |
| `lg`      | 40px          | `size="lg"`    |

Two `capsule` fixes from the same change:

- The list no longer hard-locks to `h-10` (40px); its height derives from the tab size floor.
- A tab whose only child is an icon now renders **square** (`min-width` follows `min-height`), instead of the previous wider-than-tall, shrunken look — ideal for icon-only view toggles.

The default `capsule` height moves from 40px to 36px to align with `Button`'s default height. `size` only affects the `capsule` variant; `line` and `default` are unchanged.
