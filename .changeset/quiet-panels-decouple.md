---
"@tailor-platform/app-shell": minor
---

Breaking change: remove automatic CommandPalette registration from `ActionPanel`. Panel rows keep their existing behavior, and the panel can now render outside `AppShell`.
Apps that need panel actions in the palette must register them explicitly with `useRegisterCommandPaletteActions` inside `AppShell`.

Before:

```tsx
<ActionPanel title="Order Actions" actions={actions} />
```

After, inside the component that renders the panel:

```tsx
useRegisterCommandPaletteActions(
  "Order Actions",
  actions.flatMap((action) =>
    !action.disabled && !action.loading && action.onClick
      ? [{ key: action.key, label: action.label, icon: action.icon, onSelect: action.onClick }]
      : [],
  ),
);

return <ActionPanel title="Order Actions" actions={actions} />;
```

Import `useRegisterCommandPaletteActions` from `@tailor-platform/app-shell`. The filter preserves the previous eligibility rules; register only a subset if desired.
