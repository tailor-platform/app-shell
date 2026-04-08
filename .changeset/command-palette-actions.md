---
"@tailor-platform/app-shell": minor
---

Add contextual action registration for CommandPalette via `useRegisterCommandPaletteActions` hook. `ActionPanel` actions are now automatically registered to the CommandPalette, making them discoverable and triggerable via keyboard shortcut.

```tsx
import { useRegisterCommandPaletteActions } from "@tailor-platform/app-shell";

function MyPage() {
  useRegisterCommandPaletteActions("My Page", [
    { key: "save", label: "Save", onSelect: handleSave },
  ]);
}
```
