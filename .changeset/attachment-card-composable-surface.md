---
"@tailor-platform/app-shell": major
---

**Breaking:** The attachment UI component is renamed from `AttachmentCard` to **`Attachment`**. Types are now **`AttachmentProps`** (replacing `AttachmentCardProps`). The **`title` prop is removed**—use **`Card.Header`** (or your layout) for section titles.

**DOM:** Root `data-slot` is **`attachment`** (was `attachment-card`); content is **`attachment-content`** (was `attachment-card-content`).

`Attachment` does not wrap content in an internal `Card` and does not apply outer inset padding—add `className`, or `Card.Root` / `Card.Content`, for spacing and surfaces. Drag-and-drop upload applies only to the dashed **upload tile**.

**Migrate:**

```tsx
// Before
import { AttachmentCard } from "@tailor-platform/app-shell";

<AttachmentCard title="Files" items={items} onUpload={handleUpload} />;

// After
import { Attachment, Card } from "@tailor-platform/app-shell";

<Card.Root>
  <Card.Header title="Files" />
  <Card.Content>
    <Attachment items={items} onUpload={handleUpload} />
  </Card.Content>
</Card.Root>;
```

The example app route is now **`/custom-page/attachment-demo`** (was `attachment-card-demo`).
