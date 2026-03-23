---
"@tailor-platform/app-shell": minor
---

Add `Avatar` (Base UI): `Avatar.Root`, `Avatar.Image`, and `Avatar.Fallback` with `size` variants (`sm`, `default`, `lg`) and exported `avatarVariants`. `ActivityCard` now uses this shared avatar.

```tsx
import { Avatar } from "@tailor-platform/app-shell";

<Avatar.Root>
  <Avatar.Image src="/user.png" alt="" />
  <Avatar.Fallback>AB</Avatar.Fallback>
</Avatar.Root>;
```
