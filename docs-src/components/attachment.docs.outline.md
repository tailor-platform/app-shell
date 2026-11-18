---
kind: code-backed
group: attachment
title: Attachment
description: Attachment list with upload, previews, and per-item actions; compose with Card for titles and surface styling
sources:
  - packages/core/src/components/attachment/**
---

# Attachment

`Attachment` is a reusable file/image attachment surface for ERP detail pages. It provides upload affordance (click or drag-and-drop onto the upload tile), optional helper text via `uploadHint`, image/file preview tiles, and per-item menu actions for download and delete.

## Import

```tsx
import { Attachment, useAttachment } from "@tailor-platform/app-shell";
import type { AttachmentItem, AttachmentOperation } from "@tailor-platform/app-shell";
```

The example below also imports `useState` from `react`, and `Button`, `Card`, and `Text` from `@tailor-platform/app-shell`.

## Basic usage

Use `useAttachment` to manage upload/delete state locally, then flush operations to your backend on submit via `applyChanges`. Spread the returned `props` directly onto `<Attachment />`.

This example starts with an image and a PDF tile. Add files through the upload tile, or use each item's menu to delete it. **Save changes** displays the buffered operations and clears the buffer without sending files to a server. **Download** displays the callback result instead of downloading a file. Files and changes remain in memory only for this preview.

<!-- example: basic-usage -->

For a real integration, handle each upload operation's `file` and each delete operation's `item.id` inside the `applyChanges` callback. The `accept` prop only filters the file picker, and `uploadHint` is informational; validate file type and size in your application and on the server for real uploads.

## Composition with Card

- Use **`Card.Header`** for the section title and description.
- Use **`Card.Root`** (and usually **`Card.Content`**) for border, radius, shadow, and padding around the attachment block.

## useAttachment

`useAttachment` tracks pending uploads and deletes locally until `applyChanges` is called. It handles object URL creation/revocation for image previews automatically.

### Options

| Option         | Type               | Default | Description                                  |
| -------------- | ------------------ | ------- | -------------------------------------------- |
| `initialItems` | `AttachmentItem[]` | `[]`    | Existing items to populate on mount          |
| `accept`       | `string`           | -       | Accepted file types passed to the file input |
| `disabled`     | `boolean`          | `false` | Disable upload and item actions              |

### Return value

| Field          | Type                                                                   | Description                                                                                                                                           |
| -------------- | ---------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `props`        | `{ items, onUpload, onDelete, accept, disabled }`                      | Spread directly onto `<Attachment />`                                                                                                                 |
| `applyChanges` | `(fn: (ops: AttachmentOperation[]) => Promise<void>) => Promise<void>` | Flush buffered operations to your backend; clears the buffer after `fn` resolves. If `fn` throws, the buffer is preserved so the call can be retried. |
| `isApplying`   | `boolean`                                                              | `true` while `applyChanges` is in progress. Use to show a loading indicator during form submission.                                                   |

> **Upload ordering:** newly uploaded files are prepended to `items`, so the most recent uploads appear first in the tile list.

## AttachmentOperation

Represents a single pending change buffered by `useAttachment`. Passed as an array to the `applyChanges` callback.

```ts
type AttachmentOperation =
  | { type: "upload"; file: File; item: AttachmentItem }
  | { type: "delete"; item: AttachmentItem };
```

## AttachmentItem

```ts
interface AttachmentItem {
  id: string;
  fileName: string;
  mimeType: string;
  previewUrl?: string;
}
```

## Attachment props

| Prop          | Type                             | Default             | Description                                                                                   |
| ------------- | -------------------------------- | ------------------- | --------------------------------------------------------------------------------------------- |
| `items`       | `AttachmentItem[]`               | `[]`                | Attachment list rendered as preview tiles                                                     |
| `onUpload`    | `(files: File[]) => void`        | _(required)_        | Called when files are selected or dropped on the upload tile                                  |
| `onDelete`    | `(item: AttachmentItem) => void` | _(required)_        | Called when Delete is chosen in a preview menu                                                |
| `onDownload`  | `(item: AttachmentItem) => void` | -                   | Called when Download is chosen in a preview menu                                              |
| `uploadLabel` | `string`                         | `"Click to upload"` | Primary label on the upload tile                                                              |
| `uploadHint`  | `string`                         | -                   | Supporting text below the upload label                                                        |
| `accept`      | `string`                         | -                   | Accepted file types for hidden file input                                                     |
| `disabled`    | `boolean`                        | `false`             | Disables upload, drop, and hides per-item menu actions                                        |
| `className`   | `string`                         | -                   | Classes on the root (e.g. padding); component has no outer border or inset padding by default |

## Behavior

- **Layout**: hidden file input, then the tile row—no built-in page inset.
- **Image items** (`mimeType` starts with `image/`) render as 120×120 image thumbnails when `previewUrl` loads; otherwise a fallback tile.
- **Non-image items** render as 120×120 file tiles with icon and wrapped filename.
- **Drag and drop** applies only to the **upload tile** (dashed “click to upload” control), not the full attachment block. Use the file picker from the same tile for click-to-upload.
- **Disabled state** (`disabled={true}`): the upload tile and drop target are hidden; per-item menu actions are also hidden.
- **Item actions** are available through the preview menu (`Download`, `Delete`) when not disabled.

### DOM

- Root: `data-slot="attachment"`
- Content wrapper: `data-slot="attachment-content"`

## Related components

- [Card](./card.md)
- [Button](./button.md)
- [Menu](./menu.md)
