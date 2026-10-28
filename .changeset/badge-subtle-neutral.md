---
"@tailor-platform/app-shell": minor
---

Add the `subtle-neutral` Badge variant, for low-emphasis tags with no status. It reads the neutral roles (`bg-neutral-surface`, `text-neutral-text`, `hover:bg-neutral-surface-hover`), as the other subtle variants read their intent roles.

```tsx
<Badge variant="subtle-neutral">Archived</Badge>
```

In the default palette it has the same background as `neutral`, because `--muted` and `--secondary` have the same value (gray 100 in light mode, gray 800 in dark mode). In `bloom`, and in `cream` light mode, `--muted` is closer to the page background than `--secondary`, so `subtle-neutral` is quieter than `neutral`.
