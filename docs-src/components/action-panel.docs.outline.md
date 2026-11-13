---
kind: code-backed
group: action-panel
title: ActionPanel
description: Display a title and a vertical list of actions with per-row loading and disabled states
sources:
  - packages/core/src/components/action-panel/**
---

# ActionPanel

`ActionPanel` is a presentational card component for rendering a vertical list of actions (icon + label). It is designed for ERP detail pages and side panels where available actions are often backend-driven.

## Import

```tsx
import { ActionPanel } from "@tailor-platform/app-shell";
```

## Basic Usage

<!-- example: basic-usage -->

<!-- api -->

### ActionItem

| Property       | Type                                                              | Default      | Description                                                           |
| -------------- | ----------------------------------------------------------------- | ------------ | --------------------------------------------------------------------- |
| `key`          | `string`                                                          | **Required** | Unique key for stable rendering                                       |
| `label`        | `string`                                                          | **Required** | Action label shown to users                                           |
| `icon`         | `ReactNode`                                                       | **Required** | Icon rendered in a fixed 16px slot                                    |
| `onClick`      | `() => void \| Promise<void>`                                     | -            | Runs immediately, or after confirmation when configured               |
| `confirmation` | `{ title; description; confirmLabel?; cancelLabel?; busyLabel? }` | -            | Optional confirmation before executing `onClick`                      |
| `disabled`     | `boolean`                                                         | `false`      | Disables interaction and applies disabled styling                     |
| `loading`      | `boolean`                                                         | `false`      | Shows spinner, disables interaction, sets busy UI                     |
| `variant`      | `"default" \| "destructive"`                                      | `"default"`  | Visual variant; use `"destructive"` for dangerous actions like delete |

## Behavior

- Rows are rendered as `<button type="button">` elements.
- `disabled` or `loading` makes the row non-interactive.
- When `loading` is `true`, the icon slot renders a spinner without shifting layout.
- Empty actions show `emptyContent`, which defaults to a styled message localized using the AppShell locale: `No actions available` in English or `利用可能なアクションはありません` in Japanese.

## Custom Empty Content

Pass a string or any `ReactNode` to `emptyContent` to replace the default content when `actions` is empty. Strings use the same muted `Text` body styling as the default message. Other React nodes render directly inside `Card.Content` without a paragraph wrapper and control their own typography. `Card.Content` owns the spacing, and the title, empty content, and action icons share the same 32px horizontal inset. Action rows retain horizontal padding around their hover backgrounds and focus rings. Custom empty content is ignored when actions are present.

<!-- example: custom-empty-content -->

Pass `null` to hide the empty content and its additional vertical spacing while keeping the card and its title. To hide the entire panel when no actions are available, render it conditionally with `actions.length > 0`.

## With Loading State

Use parent state to control which row is loading:

```tsx
const [loadingKey, setLoadingKey] = useState<string | null>(null);

const handleConfirm = async () => {
  setLoadingKey("confirm");
  try {
    await confirmOrder(orderId);
  } finally {
    setLoadingKey(null);
  }
};

<ActionPanel
  title="Actions"
  actions={[
    {
      key: "confirm",
      label: "Confirm order",
      icon: <CheckIcon />,
      onClick: handleConfirm,
      loading: loadingKey === "confirm",
    },
  ]}
/>;
```

## Confirmation

Add `confirmation` to an action to show a dialog before executing its `onClick`. Actions without it keep their immediate click behavior. `variant: "destructive"` styles both the row and its confirm button; irreversible constructive actions can keep the default variant.

<!-- example: confirmation -->

| Option         | Type        | Default                            | Description                                        |
| -------------- | ----------- | ---------------------------------- | -------------------------------------------------- |
| `title`        | `string`    | **Required**                       | Question identifying the action and target         |
| `description`  | `ReactNode` | **Required**                       | Consequences of the action; use text or inline JSX |
| `confirmLabel` | `string`    | `action.label`                     | Confirm button label                               |
| `cancelLabel`  | `string`    | Localized `Cancel` / `キャンセル`  | Dismiss button label                               |
| `busyLabel`    | `string`    | Localized `Working...` / `処理中…` | Confirm button label during execution              |

Use a specific title and consequence, not a generic "Are you sure?". For an action called "Cancel order", use `cancelLabel: "Keep order"` so the two buttons do not mean opposite things under the same label.

### Execution and failure

- Clicking the row only opens confirmation. Dismissing it never calls `onClick`.
- The cancel button receives initial focus; closing returns focus to the row when it still exists and is enabled.
- Synchronous completion or a fulfilled Promise closes the dialog.
- While execution is pending, the row shows a spinner, all dialog buttons are disabled, and Escape and outside clicks cannot dismiss the dialog. Immediate repeated confirmation does not dispatch twice.
- A synchronous throw or rejected Promise keeps the dialog open, announces an inline error, and permits retry. Retrying or dismissing clears the error.
- `Error.message` is shown directly: throw an Error containing a safe, user-facing message. Other thrown values (or an empty Error message) use the localized fallback `The action could not be completed.` / `操作を完了できませんでした。`. Success toasts, error normalization, and backend authorization remain application responsibilities.

**Return the Promise.** `onClick: () => void performAction()` hides completion from the panel, so it closes immediately and cannot track pending state or handle rejection. For clients such as urql that resolve with `result.error`, check the result and throw a user-facing Error on failure instead of returning normally.

The existing `loading` prop remains supported, but its transition to `false` is not a success signal: the panel waits for the callback's Promise. Confirmation is ignored when no `onClick` handler is provided.

### Action identity and scope

Before execution, removing or disabling an action, marking it loading, or removing its confirmation/callback discards the open confirmation. Re-enabling it does not reopen the old dialog. Removing the row or changing its key also discards its local confirmation state; completion of an old request cannot change a different row's dialog.

If the panel is reused for a different record, use `<ActionPanel key={record.id} ... />` or record-specific action keys. A stable key such as `"delete"` alone cannot identify that the target record changed. Include a status/version in the key if that change should invalidate a decision even while the action remains available. The backend must still validate the current record state and make retries safe: a rejected request does not prove the server made no change.

This API handles descriptive confirmation only. For reason input, validation, custom layouts, or externally controlled open state, compose [`Dialog`](./dialog.md) with your own handlers instead.

## Explicit CommandPalette Registration

`ActionPanel` does not register actions to the CommandPalette and can be rendered outside `AppShell`. Rendering a row only exposes its `onClick` through that row.

To make selected actions discoverable via `Cmd+K` / `Ctrl+K`, register them explicitly with [`useRegisterCommandPaletteActions`](../api/use-register-command-palette-actions.md). Filter out disabled or loading actions and actions without an `onClick` handler, then map `onClick` to `onSelect`. You can register only a subset of the panel's actions.

<!-- example: explicit-command-palette-registration -->

The registration hook requires `AppShell` and unregisters actions when the calling component unmounts. The panel itself does not require a CommandPalette provider.

Confirmation applies only to the panel row. Registering its raw `onClick` as `onSelect` executes it directly and does **not** open the panel's confirmation. The example excludes actions with `confirmation`; leave them out of the palette or provide a separate confirmation flow for that entry point.

Apps upgrading from automatic registration should follow the [migration guide](../migrations.md#1210-actionpanel-no-longer-registers-commandpalette-actions).

## Backend-Driven Pattern

In ERP apps, the backend often decides which actions are available for a document. A common setup:

1. Backend returns document data and available action keys.
2. Frontend maps each key to a registry entry (`label`, `icon`, `execute`).
3. Page builds `ActionItem[]` and wires `onClick`.
4. Page controls `loading` per key and passes it to `ActionPanel`.

This keeps `ActionPanel` simple and reusable across entity types.

## Accessibility

- Action list uses `role="list"` and each row wrapper uses `role="listitem"`.
- Buttons are keyboard accessible and include focus-visible states.
- Loading rows set `aria-busy="true"`.
- Disabled rows set `aria-disabled="true"` and native `disabled`.
- Confirmed rows expose dialog state, trap focus while open, and focus the safe dismissal button first.
- Confirmation errors use `role="alert"` and are associated with the retry button through `aria-describedby`.

## Styling

The component is styled with the library's internal `astw:`-prefixed utilities:

- Full width card
- Compact spacing for dense action lists
- Fixed icon slot for stable alignment
- Inline spinner for loading state

Use `className` on `ActionPanel` for card-level properties it does not set itself. Write **plain** utilities — see [Styling AppShell components](../concepts/styling-theming.md#styling-appshell-components).

## Examples in This Repo

- `examples/app-module` includes an **Action Panel Demo** resource.
- The **2 Columns** layout page also includes an ActionPanel with loading behavior.

## Related Components

- [Layout](./layout.md) - Compose page-level column layouts
- [DescriptionCard](./description-card.md) - Display structured record fields
- [Badge](./badge.md) - Show statuses and semantic labels

## Related Concepts

- [Modules and Resources](../concepts/modules-and-resources.md) - Organize pages and routes
- [Routing and Navigation](../concepts/routing-navigation.md) - Navigation patterns
