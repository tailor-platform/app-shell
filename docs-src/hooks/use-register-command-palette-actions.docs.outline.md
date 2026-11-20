---
kind: prose
group: use-register-command-palette-actions
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
function useRegisterCommandPaletteActions(group: string, actions: CommandPaletteAction[]): void;
```

## Parameters

| Parameter | Type                     | Description                                               |
| --------- | ------------------------ | --------------------------------------------------------- |
| `group`   | `string`                 | Display group name shown in the palette for these actions |
| `actions` | `CommandPaletteAction[]` | List of actions to register                               |

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
| `key`      | `string`                      | Unique key for React reconciliation                                           |
| `label`    | `string`                      | Visible label shown in the palette; also used for search matching             |
| `icon`     | `ReactNode`                   | Optional icon rendered next to the label                                      |
| `group`    | `string`                      | Optional group override; defaults to the `group` parameter passed to the hook |
| `onSelect` | `() => void \| Promise<void>` | Callback invoked when the user selects the action                             |

## Usage

The example imports `useState` from `react`, and `Button`, `Text`, `useOpenCommandPalette`, and `useRegisterCommandPaletteActions` from `@tailor-platform/app-shell`.

Click **Open demo action**, then select **Increase preview count** in the surrounding docs browser's palette. Toggle **Add five at a time** and run the same action again: its key and label stay unchanged, but its latest callback uses the new increment. Only the local preview count changes; no request is sent and no application data is modified.

<!-- example: contextual-actions -->

The action appears under **Documentation demo** while the preview is mounted and is removed automatically when it unmounts, such as when you leave this page.

## Behavior

- Actions are registered while the component is mounted and removed on unmount.
- Changes to action keys, labels, or the group update the registered set. The latest `onSelect` callbacks are used without requiring re-registration.
- `icon` changes alone do not trigger re-registration. If you need to reflect a dynamic icon update, also change the action's `key` or `label`.
- The hook requires `CommandPaletteProvider`, which is mounted automatically by `AppShell`.

## Related

- [CommandPalette](../components/command-palette.md) — Keyboard-driven navigation and action palette
- [ActionPanel](../components/action-panel.md#explicit-commandpalette-registration) — Register selected panel actions explicitly with this hook
