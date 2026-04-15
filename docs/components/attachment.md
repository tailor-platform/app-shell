---
title: Attachment
description: Attachment list with upload, previews, and per-item actions; compose with Card for titles and surface styling
---

# Attachment

`Attachment` is a reusable file/image attachment surface for ERP detail pages. It provides upload affordance (click or drag-and-drop onto the upload tile), optional helper text via `uploadHint`, image/file preview tiles, and per-item menu actions for download and delete.

It does **not** render a section title—use [`Card.Header`](./card.md) (or your page layout) for headings. It does **not** apply an outer card frame, border, or inset padding around the block. Add padding, borders, and backgrounds with **`className`** on the root, or by wrapping with [`Card`](./card.md) / `Card.Content` (or your own layout).

## Import

```tsx
import { Attachment } from "@tailor-platform/app-shell";
```

## Basic usage

Padding and card chrome are up to you—for example `className` on the root, or `Card` around the component:

```tsx
import { Attachment, Card, type AttachmentItem } from "@tailor-platform/app-shell";

const items: AttachmentItem[] = [
  { id: "1", fileName: "shoe-red.png", mimeType: "image/png", previewUrl: "/img/shoe-red.png" },
  { id: "2", fileName: "Aug-Sep 2025_1234-12.pdf", mimeType: "application/pdf" },
];

<Card.Root>
  <Card.Header title="Product images" description="PNG, JPG, or PDF — max 10 MB per file." />
  <Card.Content>
    <Attachment
      items={items}
      uploadLabel="Upload image"
      uploadHint="PNG, JPG, or PDF — max 10 MB per file."
      accept="image/*,.pdf"
      onUpload={(files) => console.log("upload", files)}
      onDownload={(item) => console.log("download", item)}
      onDelete={(item) => console.log("delete", item)}
    />
  </Card.Content>
</Card.Root>;
```

Or pass padding directly:

```tsx
<Attachment className="astw:p-5" items={items} onUpload={...} />
```

Use **`uploadHint`** for secondary guidance (formats, size limits). It is informational only; enforce limits in your own validation and in `onUpload` / `uploadFile`.

## Composition with Card

- Use **`Card.Header`** for the section title and description.
- Use **`Card.Root`** (and usually **`Card.Content`**) for border, radius, shadow, and padding around the attachment block.

## Props

| Prop            | Type                                          | Default             | Description                                                                                   |
| --------------- | --------------------------------------------- | ------------------- | --------------------------------------------------------------------------------------------- |
| `items`         | `AttachmentItem[]`                            | `[]`                | Attachment list rendered as preview tiles                                                     |
| `onUpload`      | `(files: File[]) => void`                     | -                   | Controlled upload callback for file input + drop on upload tile                               |
| `uploadFile`    | `(file: File) => Promise<AttachmentItem>`     | -                   | Optional async upload handler for built-in uploading lifecycle UI                             |
| `onUploadError` | `(ctx: { file: File; error: Error }) => void` | -                   | Called when `uploadFile` fails                                                                |
| `onDelete`      | `(item: AttachmentItem) => void`              | -                   | Called when Delete is chosen in a preview menu                                                |
| `onDownload`    | `(item: AttachmentItem) => void`              | -                   | Called when Download is chosen in a preview menu                                              |
| `uploadLabel`   | `string`                                      | `"Click to upload"` | Primary label on the upload tile                                                              |
| `uploadHint`    | `string`                                      | -                   | Supporting text below the upload label                                                        |
| `accept`        | `string`                                      | -                   | Accepted file types for hidden file input                                                     |
| `disabled`      | `boolean`                                     | `false`             | Disables upload, drop, and hides per-item menu actions                                        |
| `className`     | `string`                                      | -                   | Classes on the root (e.g. padding); component has no outer border or inset padding by default |

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

## Upload integration modes

- **Controlled mode (`onUpload`)**: component emits selected files and the parent owns upload + list updates.
- **Async mode (`uploadFile`)**: component shows temporary uploading tiles with local previews, dark overlay, and spinner while awaiting each upload promise.
- `onUpload` and `uploadFile` are mutually exclusive integration modes.
- **Failure behavior**: when `uploadFile` rejects, the component removes the temporary tile, shows a toast, and calls `onUploadError`.

## Behavior

- **Layout**: hidden file input, then the tile row—no built-in page inset.
- **Image items** (`mimeType` starts with `image/`) render as 120×120 image thumbnails when `previewUrl` loads; otherwise a fallback tile.
- **Non-image items** render as 120×120 file tiles with icon and wrapped filename.
- **Drag and drop** applies only to the **upload tile** (dashed “click to upload” control), not the full attachment block. Use the file picker from the same tile for click-to-upload.
- **Read-only lists** (no `onUpload` and no `uploadFile`): no upload tile and no drop target.
- **Uploading state** renders a dark overlay and centered spinner on the 120×120 tile.
- **Item actions** are available through the preview menu (`Download`, `Delete`) when not disabled and not uploading.

### DOM

- Root: `data-slot="attachment"`
- Content wrapper: `data-slot="attachment-content"`

## Related components

- [Card](./card.md)
- [Button](./button.md)
- [Menu](./menu.md)
