---
"@tailor-platform/app-shell": minor
---

Add contextual action registration for CommandPalette via `useCommandPaletteDispatch` hook. `ActionPanel` actions are now automatically registered to the CommandPalette, making them discoverable and triggerable via keyboard shortcut.

```tsx
import { useCommandPaletteDispatch } from "@tailor-platform/app-shell";

const { register } = useCommandPaletteDispatch();
register("my-source", [
  { key: "save", label: "Save", group: "Editor", onSelect: handleSave },
]);
```
