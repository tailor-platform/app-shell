---
"@tailor-platform/app-shell": minor
---

Add `useOpenCommandPalette()` for opening the built-in command palette from application code.

```tsx
const openCommandPalette = useOpenCommandPalette();

openCommandPalette();
openCommandPalette({ search: "PO: alice" });
```
