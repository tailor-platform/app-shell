---
title: AttachmentCard
description: Card component for uploading, previewing, and managing attachments
---

# AttachmentCard

`AttachmentCard` is a reusable file/image attachment surface for ERP detail pages. It provides a header with upload affordance, drag-and-drop upload support, image/file preview tiles, and per-item menu actions for download and delete.

## Import

```tsx
import { AttachmentCard } from "@tailor-platform/app-shell";
```

## Basic Usage

```tsx
import { AttachmentCard, type AttachmentItem } from "@tailor-platform/app-shell";

const items: AttachmentItem[] = [
  { id: "1", fileName: "shoe-red.png", mimeType: "image/png", previewUrl: "/img/shoe-red.png" },
  { id: "2", fileName: "Aug-Sep 2025_1234-12.pdf", mimeType: "application/pdf" },
];

<AttachmentCard
  title="Product images"
  items={items}
  uploadLabel="Upload image"
  accept="image/*,.pdf"
  onUpload={(files) => console.log("upload", files)}
  onDownload={(item) => console.log("download", item)}
  onDelete={(item) => console.log("delete", item)}
/>;
```

## Props

| Prop            | Type                                          | Default         | Description                                                       |
| --------------- | --------------------------------------------- | --------------- | ----------------------------------------------------------------- |
| `title`         | `string`                                      | `"Attachments"` | Card heading text                                                 |
| `items`         | `AttachmentItem[]`                            | `[]`            | Attachment list rendered as preview tiles                         |
| `onUpload`      | `(files: File[]) => void`                     | -               | Controlled upload callback for file input + drag/drop             |
| `uploadFile`    | `(file: File) => Promise<AttachmentItem>`     | -               | Optional async upload handler for built-in uploading lifecycle UI |
| `onUploadError` | `(ctx: { file: File; error: Error }) => void` | -               | Called when `uploadFile` fails                                    |
| `onDelete`      | `(item: AttachmentItem) => void`              | -               | Called when Delete is chosen in a preview menu                    |
| `onDownload`    | `(item: AttachmentItem) => void`              | -               | Called when Download is chosen in a preview menu                  |
| `uploadLabel`   | `string`                                      | `"Upload"`      | Upload button text                                                |
| `accept`        | `string`                                      | -               | Accepted file types for hidden file input                         |
| `disabled`      | `boolean`                                     | `false`         | Disables upload/drop and hides per-item menu actions              |
| `className`     | `string`                                      | -               | Additional classes on the root card                               |

## AttachmentItem

```ts
interface AttachmentItem {
  id: string;
  fileName: string;
  mimeType: string;
  previewUrl?: string;
  status?: "ready" | "uploading";
}
```

## Upload Integration Modes

- **Controlled mode (`onUpload`)**: component emits selected files and the parent owns upload + list updates.
- **Async mode (`uploadFile`)**: component shows temporary uploading tiles with local previews, dark overlay, and spinner while awaiting each upload promise.
- `onUpload` and `uploadFile` are mutually exclusive integration modes.
- **Failure behavior**: when `uploadFile` rejects, the component removes the temporary tile, shows a toast, and calls `onUploadError`.

## Behavior

- **Image items** (`mimeType` starts with `image/`) render as 120x120 image thumbnails.
- **Non-image items** render as 120x120 file tiles with icon and wrapped filename.
- **Drag and drop** is supported on the entire card container.
- **Uploading state** renders a dark overlay + centered spinner on the 120x120 tile.
- **Item actions** are available through the preview menu (`Download`, `Delete`) when not disabled and not uploading.

## Related Components

- [Card](./card.md)
- [Button](./button.md)
- [Menu](./menu.md)
