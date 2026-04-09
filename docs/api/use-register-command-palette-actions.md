---
title: useRegisterCommandPaletteActions
description: Hook for registering contextual page actions into the CommandPalette
---

# useRegisterCommandPaletteActions

React hook that declaratively registers page-level actions into the CommandPalette's **Actions** section. Actions are searchable and triggerable via the `Cmd+K` / `Ctrl+K` shortcut. They are automatically unregistered when the calling component unmounts.

## Import

```tsx
import {
  useRegisterCommandPaletteActions,
  type CommandPaletteAction,
} from "@tailor-platform/app-shell";
```

## Signature

```typescript
function useRegisterCommandPaletteActions(
  group: string,
  actions: CommandPaletteAction[],
): void;
```

## Parameters

| Parameter | Type                     | Description                                              |
| --------- | ------------------------ | -------------------------------------------------------- |
| `group`   | `string`                 | Display group name shown in the palette for these actions |
| `actions` | `CommandPaletteAction[]` | List of actions to register                              |

## `CommandPaletteAction`

```typescript
type CommandPaletteAction = {
  key: string;
  label: string;
  icon?: ReactNode;
  group?: string;
  onSelect: () => void | Promise<void>;
};
```

| Property   | Type                          | Description                                                                   |
| ---------- | ----------------------------- | ----------------------------------------------------------------------------- |
| `key`      | `string`                      | Unique key for React reconciliation                                            |
| `label`    | `string`                      | Visible label shown in the palette; also used for search matching             |
| `icon`     | `ReactNode`                   | Optional icon rendered next to the label                                      |
| `group`    | `string`                      | Optional group override; defaults to the `group` parameter passed to the hook |
| `onSelect` | `() => void \| Promise<void>` | Callback invoked when the user selects the action                             |

## Usage

```tsx
import { useRegisterCommandPaletteActions } from "@tailor-platform/app-shell";

function OrderDetailPage() {
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await confirmOrder(orderId);
    } finally {
      setLoading(false);
    }
  };

  useRegisterCommandPaletteActions("Order Actions", [
    { key: "confirm", label: "Confirm order", onSelect: handleConfirm },
    { key: "cancel", label: "Cancel order", icon: <XIcon />, onSelect: handleCancel },
  ]);

  return <div>{/* page content */}</div>;
}
```

## Behavior

- Actions are registered while the component is mounted and removed on unmount.
- Re-rendering with a new `actions` array replaces the previously registered set.
- `icon` changes alone do not trigger re-registration. If you need to reflect a dynamic icon update, also change the action's `key` or `label`.
- The hook requires `CommandPaletteProvider`, which is mounted automatically by `AppShell`.

## Related

- [CommandPalette](../components/command-palette.md) — Keyboard-driven navigation and action palette
- [ActionPanel](../components/action-panel.md) — Automatically uses this hook to expose its actions in the palette
