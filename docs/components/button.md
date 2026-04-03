---
title: Button
description: Styled button with multiple variants and sizes
---

# Button

The `Button` component is a styled button with multiple visual variants and sizes. It supports rendering as a custom element via the `render` prop (Base UI render pattern).

## Import

```tsx
import { Button } from "@tailor-platform/app-shell";
```

## Basic Usage

```tsx preview wrap="row"
import { Button } from "@tailor-platform/app-shell";

<Button>Click me</Button>
<Button variant="outline">Outline</Button>
<Button variant="destructive">Delete</Button>
```

## Props

| Prop        | Type                                                                          | Default     | Description                                       |
| ----------- | ----------------------------------------------------------------------------- | ----------- | ------------------------------------------------- |
| `variant`   | `"default" \| "destructive" \| "outline" \| "secondary" \| "ghost" \| "link"` | `"default"` | Visual style variant                              |
| `size`      | `"default" \| "xs" \| "sm" \| "lg" \| "icon"`                                 | `"default"` | Button size                                       |
| `render`    | `React.ReactElement`                                                          | -           | Custom element to render as (Base UI render prop) |
| `className` | `string`                                                                      | -           | Additional CSS classes                            |
| `children`  | `React.ReactNode`                                                             | -           | Button content                                    |

All standard HTML `<button>` props are also accepted.

## Variants

```tsx preview wrap="row"
import { Button } from "@tailor-platform/app-shell";

<Button variant="default">Primary Action</Button>
<Button variant="destructive">Delete</Button>
<Button variant="outline">Secondary Action</Button>
<Button variant="secondary">Tertiary</Button>
<Button variant="ghost">Ghost</Button>
<Button variant="link">Link Style</Button>
```

## Sizes

```tsx preview wrap="row"
import { Button } from "@tailor-platform/app-shell";
import { PlusIcon } from "lucide-react";

<Button size="xs">Extra Small</Button>
<Button size="sm">Small</Button>
<Button size="default">Default</Button>
<Button size="lg">Large</Button>
<Button size="icon"><PlusIcon /></Button>
```

## Render Prop

The `render` prop lets you use the button's styles on a custom element:

```tsx
import { Button } from "@tailor-platform/app-shell";
import { Link } from "@tailor-platform/app-shell";

<Button render={<Link to="/orders" />} variant="outline">
  View Orders
</Button>;
```

This is the Base UI render pattern — the button's class names and event handlers are applied to the rendered element.

## Examples

### Form Actions

```tsx preview
import { Button } from "@tailor-platform/app-shell";

<div className="astw:flex astw:gap-2 astw:justify-end">
  <Button variant="outline">Cancel</Button>
  <Button>Save Changes</Button>
</div>
```

### Destructive Confirmation

```tsx
<Button variant="destructive" onClick={handleDelete}>
  Delete Order
</Button>
```

### Icon Button

```tsx preview
import { Button } from "@tailor-platform/app-shell";
import { PlusIcon } from "lucide-react";

<Button size="icon" variant="outline">
  <PlusIcon />
</Button>;
```

## TypeScript

```typescript
import { type ButtonProps } from "@tailor-platform/app-shell";
```

## Styling

Use `buttonVariants` to apply button styles to non-button elements:

```tsx preview
import { buttonVariants } from "@tailor-platform/app-shell";

<a href="/orders" className={buttonVariants({ variant: "outline", size: "sm" })}>
  View Orders
</a>;
```

## Related Components

- [Dialog](./dialog.md) - Use buttons as dialog triggers and actions
- [Sheet](./sheet.md) - Use buttons as sheet triggers
- [Layout](./layout.md) - Use buttons in page header actions
