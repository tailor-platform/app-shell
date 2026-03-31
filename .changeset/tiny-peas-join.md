---
"@tailor-platform/app-shell": minor
---

Add `AttachmentCard` for ERP attachment workflows with drag-and-drop upload, image/file previews, and per-item `Download`/`Delete` actions.

```tsx
import { AttachmentCard } from "@tailor-platform/app-shell";

<AttachmentCard
  title="Product images"
  items={items}
  onUpload={handleUpload}
  onDownload={handleDownload}
  onDelete={handleDelete}
/>;
```
