---
"@tailor-platform/app-shell": patch
---

Add `info` and `subtle-info` badge variants for informational or in-progress status labels (blue palette, matching the existing `outline-info` dot color). Also extend the primitives demo to show all five outline variants (previously only `outline-success` was rendered).

```tsx
<Badge variant="info">New</Badge>
<Badge variant="subtle-info">In Progress</Badge>
```
