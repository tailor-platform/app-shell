---
kind: code-backed
group: button
title: Button
description: Styled button with multiple variants and sizes
sources:
  - packages/core/src/components/button/**
---

# Button

The `Button` component is a styled button with multiple visual variants and sizes. It supports rendering as a custom element via the `render` prop (Base UI render pattern).

## Import

```tsx
import { Button } from "@tailor-platform/app-shell";
```

The examples below also import `Link` and `buttonVariants` from `@tailor-platform/app-shell` and `PlusIcon` from `lucide-react`.

## Basic Usage

<!-- example: basic-usage -->

<!-- api -->

All standard HTML `<button>` props are also accepted.

## Variants

<!-- example: variants -->

## Sizes

<!-- example: sizes -->

## Render Prop

The `render` prop lets you use the button's styles on a custom element:

<!-- example: render-prop -->

This is the Base UI render pattern — the button's class names and event handlers are applied to the rendered element.

## Examples

### Form Actions

<!-- example: form-actions -->

### Destructive Confirmation

```tsx
<Button variant="destructive" onClick={handleDelete}>
  Delete Order
</Button>
```

### Icon Button

<!-- example: icon-button -->

## TypeScript

```typescript
import { type ButtonProps } from "@tailor-platform/app-shell";
```

## Styling

Use `buttonVariants` to apply button styles to non-button elements:

<!-- example: styling-utility -->

## Accessibility

- Buttons render with `cursor: pointer` to signal interactivity consistently across all variants and sizes.
- Disabled buttons suppress the pointer cursor via `pointer-events-none`, so they do not signal clickability.

## Related Components

- [Dialog](./dialog.md) - Use buttons as dialog triggers and actions
- [Sheet](./sheet.md) - Use buttons as sheet triggers
- [Layout](./layout.md) - Use buttons in page header actions
