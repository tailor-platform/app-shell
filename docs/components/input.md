---
title: Input
description: Styled text input with consistent theming
---

# Input

The `Input` component is a styled text input that provides consistent theming across your application.

## Import

```tsx
import { Input } from "@tailor-platform/app-shell";
```

## Basic Usage

```tsx
<Input placeholder="Enter your name" />
```

## Props

Accepts all standard HTML `<input>` props.

| Prop          | Type      | Default  | Description            |
| ------------- | --------- | -------- | ---------------------- |
| `type`        | `string`  | `"text"` | HTML input type        |
| `placeholder` | `string`  | -        | Placeholder text       |
| `disabled`    | `boolean` | `false`  | Disables the input     |
| `className`   | `string`  | -        | Additional CSS classes |

## Examples

### Text Input

```tsx
<Input type="text" placeholder="Enter your name" />
```

### Email Input

```tsx
<Input type="email" placeholder="you@example.com" />
```

### Number Input

```tsx
<Input type="number" placeholder="0" min={0} max={100} />
```

### Disabled Input

```tsx
<Input value="Read-only value" disabled />
```

### With onChange Handler

```tsx
const [value, setValue] = useState("");

<Input value={value} onChange={(e) => setValue(e.target.value)} placeholder="Type something..." />;
```

## TypeScript

```typescript
import { type InputProps } from "@tailor-platform/app-shell";
```

## Related Components

- [Button](./button.md) - Pair with inputs in forms
