---
"@tailor-platform/app-shell": minor
---

Add `Attachment` component and `useAttachment` hook for ERP attachment workflows with drag-and-drop upload, image/file previews, and per-item `Download`/`Delete` actions.

Use `useAttachment` to manage upload/delete state locally and flush operations to your backend on submit via `applyChanges`. Spread the returned `props` directly onto `<Attachment />`.

```tsx
import { Attachment, useAttachment } from "@tailor-platform/app-shell";
import type { AttachmentOperation } from "@tailor-platform/app-shell";

const { props, applyChanges } = useAttachment({
  initialItems: existingAttachments,
  accept: "image/*,.pdf",
});

async function handleSubmit() {
  // The component is agnostic to backend shape — run all operations in parallel.
  await applyChanges((operations) =>
    Promise.all(
      operations.map((op) => {
        if (op.type === "upload") return uploadToServer(op.file);
        if (op.type === "delete") return deleteFromServer(op.item.id);
      }),
    ),
  );
}

<Attachment {...props} uploadLabel="Upload" onDownload={handleDownload} />;
```
