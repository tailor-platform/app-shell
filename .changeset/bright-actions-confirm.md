---
"@tailor-platform/app-shell": minor
---

Add optional per-action confirmation dialogs to `ActionPanel`. Configure `confirmation` and keep the operation in `onClick`; `variant: "destructive"` also styles the confirm button.
Confirmed callbacks are awaited, with duplicate-execution and dismissal guards while pending. Fulfillment closes the dialog; throwing or rejecting keeps it open with an inline error for retry. Return the Promise and throw a safe, user-facing Error on failure.

```tsx
<ActionPanel
  title="Order Actions"
  actions={[
    {
      key: "delete",
      label: "Delete order",
      icon: <Trash2 />,
      variant: "destructive",
      confirmation: {
        title: "Delete order ORD-1024?",
        description: "This removes the order and cannot be undone.",
        cancelLabel: "Keep order",
      },
      onClick: async () => {
        await deleteOrder(orderId);
      },
    },
  ]}
/>
```

`title` and `description` are required. `confirmLabel` defaults to the action label; `cancelLabel` and `busyLabel` have localized defaults. Actions without confirmation retain their existing click behavior. Confirmation applies only to the panel row, not to callbacks registered independently with the CommandPalette.
