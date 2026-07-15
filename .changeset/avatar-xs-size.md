---
"@tailor-platform/app-shell": minor
---

Add an `xs` (16px) size to `Avatar`

`Avatar.Root` now accepts `size="xs"` for a 16px circle, extending the existing `sm` / `default` / `lg` scale:

| `size`    | circle |
| --------- | ------ |
| `xs`      | 16px   |
| `sm`      | 24px   |
| `default` | 28px   |
| `lg`      | 40px   |

`xs` is intended for compact/inline contexts and single-glyph or icon content; two-letter initials will be cramped at this size. Purely additive — the default size is unchanged.
