---
kind: code-backed
group: input
title: Input
description: Styled text input with consistent theming
sources:
  - packages/core/src/components/input/**
---

# Input

The `Input` component is a styled text input that provides consistent theming across your application.

## Import

```tsx
import { Input } from "@tailor-platform/app-shell";
```

## Basic Usage

<!-- example: basic-usage -->

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

<!-- example: text-input -->

### Email Input

<!-- example: email-input -->

### Number Input

<!-- example: number-input -->

### Disabled Input

<!-- example: disabled-input -->

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
- [Textarea](./textarea.md) - Multi-line counterpart, for free-text that outgrows one line
- [Checkbox](./checkbox.md) - Boolean control with the same `Field` / React Hook Form integration
