---
"@tailor-platform/app-shell": minor
---

Add `Attachment` for ERP attachment workflows with drag-and-drop upload, image/file previews, and per-item `Download`/`Delete` actions.

```tsx
import { Attachment } from "@tailor-platform/app-shell";

<Attachment
  items={items}
  onUpload={handleUpload}
  onDownload={handleDownload}
  onDelete={handleDelete}
/>;
```
