---
title: Alert
description: Contextual status messages with automatic variant icons
---

# Alert

The `Alert` component is a compound component for displaying contextual status messages. It automatically renders a matching icon for each variant and supports optional action buttons and dismiss behavior.

## Import

```tsx
import { Alert } from "@tailor-platform/app-shell";
```

## Basic Usage

```tsx
<Alert.Root variant="success">
  <Alert.Title>Saved</Alert.Title>
  <Alert.Description>Your changes have been saved.</Alert.Description>
</Alert.Root>
```

## Sub-components

| Sub-component       | Description                                       |
| ------------------- | ------------------------------------------------- |
| `Alert.Root`        | Container with variant styling and automatic icon |
| `Alert.Title`       | Bold title line of the alert                      |
| `Alert.Description` | Additional descriptive text below the title       |

## Props

### Alert.Root Props

| Prop          | Type                                                       | Default     | Description                                          |
| ------------- | ---------------------------------------------------------- | ----------- | ---------------------------------------------------- |
| `variant`     | `"neutral" \| "success" \| "warning" \| "error" \| "info"` | `"neutral"` | Visual style and automatic icon                      |
| `action`      | `React.ReactNode`                                          | -           | Action element rendered below the description        |
| `dismissible` | `boolean`                                                  | `false`     | Shows a dismiss button; hides the alert when clicked |
| `onDismiss`   | `() => void`                                               | -           | Callback invoked when the dismiss button is clicked  |
| `className`   | `string`                                                   | -           | Additional CSS classes                               |
| `children`    | `React.ReactNode`                                          | -           | `Alert.Title` and/or `Alert.Description`             |

All standard HTML `<div>` props are also accepted.

## Variants

Each variant automatically renders a contextual icon:

```tsx
<Alert.Root variant="neutral">
  <Alert.Title>Note</Alert.Title>
  <Alert.Description>General information.</Alert.Description>
</Alert.Root>

<Alert.Root variant="success">
  <Alert.Title>Success</Alert.Title>
  <Alert.Description>Operation completed successfully.</Alert.Description>
</Alert.Root>

<Alert.Root variant="warning">
  <Alert.Title>Warning</Alert.Title>
  <Alert.Description>Proceed with caution.</Alert.Description>
</Alert.Root>

<Alert.Root variant="error">
  <Alert.Title>Error</Alert.Title>
  <Alert.Description>Something went wrong.</Alert.Description>
</Alert.Root>

<Alert.Root variant="info">
  <Alert.Title>Info</Alert.Title>
  <Alert.Description>Here is some useful information.</Alert.Description>
</Alert.Root>
```

| Variant   | Automatic Icon      | Color palette   |
| --------- | ------------------- | --------------- |
| `neutral` | Message circle icon | Muted surface   |
| `success` | Check circle icon   | Green           |
| `warning` | Alert triangle icon | Yellow          |
| `error`   | X circle icon       | Red/destructive |
| `info`    | Info icon           | Blue            |

## With Action Button

Use the `action` prop to render an action element below the description:

```tsx
<Alert.Root
  variant="warning"
  action={
    <Button size="sm" variant="outline">
      Review
    </Button>
  }
>
  <Alert.Title>Review Required</Alert.Title>
  <Alert.Description>This record has pending changes that need review.</Alert.Description>
</Alert.Root>
```

## Dismissible Alert

Set `dismissible` to show a close button. Use `onDismiss` to react when the alert is dismissed:

```tsx
<Alert.Root variant="info" dismissible onDismiss={() => markAlertRead(alertId)}>
  <Alert.Title>New Feature Available</Alert.Title>
  <Alert.Description>Check out the new dashboard layout in Settings.</Alert.Description>
</Alert.Root>
```

> **Note:** When `dismissible` is `true`, clicking the close button hides the alert via internal state. The `onDismiss` callback fires after the alert is hidden.

## Examples

### Form Validation Error

```tsx
function OrderForm() {
  const [error, setError] = useState<string | null>(null);

  return (
    <form>
      {error && (
        <Alert.Root variant="error" dismissible onDismiss={() => setError(null)}>
          <Alert.Title>Submission Failed</Alert.Title>
          <Alert.Description>{error}</Alert.Description>
        </Alert.Root>
      )}
      {/* form fields */}
    </form>
  );
}
```

### Success Confirmation

```tsx
<Alert.Root variant="success">
  <Alert.Title>Invoice Created</Alert.Title>
  <Alert.Description>Invoice #INV-0042 has been sent to the customer.</Alert.Description>
</Alert.Root>
```

### Warning with Action

```tsx
<Alert.Root
  variant="warning"
  action={
    <Button size="sm" variant="outline" onClick={() => navigate("/settings/billing")}>
      Update Billing
    </Button>
  }
>
  <Alert.Title>Payment Method Expiring</Alert.Title>
  <Alert.Description>Your credit card on file expires at the end of this month.</Alert.Description>
</Alert.Root>
```

## Accessibility

- The root element has `role="alert"` so screen readers announce the message.
- The dismiss button has `aria-label="Dismiss"`.
- Variant icons are marked `aria-hidden` and are decorative only — the text content carries the meaning.

## Styling

Alerts use Tailwind CSS classes prefixed with `astw:`. Customize appearance using:

1. **Using `className`** on `Alert.Root` for additional styles
2. **Using `alertVariants`** utility to apply variant classes to custom elements

```tsx
import { alertVariants } from "@tailor-platform/app-shell";
import { cn } from "@/lib/utils";

<div className={cn(alertVariants({ variant: "info" }), "astw:my-4")}>Custom alert container</div>;
```

## Related Components

- [Badge](./badge.md) - Inline status labels
- [Button](./button.md) - Use as action element inside alerts
