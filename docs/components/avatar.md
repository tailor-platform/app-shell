# Avatar

User avatar with image and fallback.

## Parts

| Part              | Description                           |
| ----------------- | ------------------------------------- |
| `Avatar.Root`     | Circular container (default: 32×32px) |
| `Avatar.Image`    | Avatar image                          |
| `Avatar.Fallback` | Shown when image fails to load        |

## Example

```tsx
import { Avatar } from "@tailor-platform/app-shell";

<Avatar.Root>
  <Avatar.Image src="/avatar.jpg" alt="User" />
  <Avatar.Fallback>JD</Avatar.Fallback>
</Avatar.Root>;
```
