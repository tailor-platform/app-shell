---
title: Avatar
description: User avatar with image and fallback (Base UI)
---

# Avatar

The `Avatar` component wraps [Base UI Avatar](https://base-ui.com/react/components/avatar): a root container with an optional image and fallback content (typically initials) when the image is missing or fails to load.

## Import

```tsx
import { Avatar } from "@tailor-platform/app-shell";
```

## Basic usage

```tsx preview
import { Avatar } from "@tailor-platform/app-shell";

<Avatar.Root>
  <Avatar.Image src="/user.png" alt="Jane Doe" />
  <Avatar.Fallback>JD</Avatar.Fallback>
</Avatar.Root>
```

## Parts

| Part              | Description                                                |
| ----------------- | ---------------------------------------------------------- |
| `Avatar.Root`     | Outer container; applies size and surface styles.          |
| `Avatar.Image`    | `<img>` for the photo; hidden when not loaded or on error. |
| `Avatar.Fallback` | Shown when there is no image or the image failed to load.  |

## Root props

| Prop        | Type                        | Default     | Description                |
| ----------- | --------------------------- | ----------- | -------------------------- |
| `size`      | `"sm" \| "default" \| "lg"` | `"default"` | Circle size (28px default) |
| `className` | `string`                    | —           | Extra classes              |
| `children`  | `React.ReactNode`           | —           | Image + fallback           |

`Avatar.Root` forwards other stable props from Base UI (for example `aria-hidden`, `style`) and standard HTML attributes for the `<span>` root.

## Sizes

```tsx preview wrap="row"
import { Avatar } from "@tailor-platform/app-shell";

<Avatar.Root size="sm">
  <Avatar.Fallback>AB</Avatar.Fallback>
</Avatar.Root>
<Avatar.Root size="default">
  <Avatar.Fallback>CD</Avatar.Fallback>
</Avatar.Root>
<Avatar.Root size="lg">
  <Avatar.Fallback>EF</Avatar.Fallback>
</Avatar.Root>
```

## Types

`AvatarProps` is the props type for `Avatar.Root` (includes `size` and Base UI root props). Import when wrapping or composing:

```tsx
import { Avatar, type AvatarProps } from "@tailor-platform/app-shell";
```

## `avatarVariants`

The same size styles used by `Avatar.Root` are exported as `avatarVariants` (for example if you need to mirror avatar dimensions in layout code). Prefer the `size` prop on `Avatar.Root` for normal use.
