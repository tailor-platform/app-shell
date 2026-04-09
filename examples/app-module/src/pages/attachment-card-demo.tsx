import {
  AttachmentCard,
  type AttachmentItem,
  defineResource,
  Layout,
  useToast,
} from "@tailor-platform/app-shell";
import { useMemo, useState } from "react";

const initialItems: AttachmentItem[] = [
  {
    id: "img-1",
    fileName: "shoe-red.png",
    mimeType: "image/png",
    previewUrl:
      "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=400&q=80",
  },
  {
    id: "img-2",
    fileName: "shoe-green.png",
    mimeType: "image/png",
    previewUrl:
      "https://images.unsplash.com/photo-1460353581641-37baddab0fa2?auto=format&fit=crop&w=400&q=80",
  },
  {
    id: "doc-1",
    fileName: "Aug-Sep 2025_1234-12.pdf",
    mimeType: "application/pdf",
  },
];

const AttachmentCardDemoPage = () => {
  const toast = useToast();
  const [items, setItems] = useState<AttachmentItem[]>(initialItems);
  const [asyncItems, setAsyncItems] = useState<AttachmentItem[]>(initialItems);

  const nextId = useMemo(() => items.length + 1, [items.length]);
  const nextAsyncId = useMemo(() => asyncItems.length + 1, [asyncItems.length]);

  return (
    <Layout>
      <Layout.Header title="AttachmentCard Demo" />
      <Layout.Column>
        <p style={{ color: "var(--muted-foreground)", marginBottom: "1rem" }}>
          Two integration styles are shown below: controlled `onUpload` and generic async
          `uploadFile`.
        </p>
        <AttachmentCard
          title="Product images (controlled mode)"
          uploadLabel="Click to upload"
          uploadHint="pdf, docx, png, jpg, max 10mb"
          accept="image/*,.pdf,.doc,.docx"
          items={items}
          onUpload={(files) => {
            const mapped = files.map((file, index) => {
              const id = `${Date.now()}-${nextId + index}`;
              const previewUrl = file.type.startsWith("image/")
                ? URL.createObjectURL(file)
                : undefined;
              return {
                id,
                fileName: file.name,
                mimeType: file.type || "application/octet-stream",
                previewUrl,
              } satisfies AttachmentItem;
            });
            setItems((prev) => [...mapped, ...prev]);
          }}
          onDelete={(item) => {
            setItems((prev) => prev.filter((candidate) => candidate.id !== item.id));
          }}
          onDownload={(item) => {
            toast(`Download clicked for: ${item.fileName}`);
          }}
        />
        <div style={{ height: "1.5rem" }} />
        <AttachmentCard
          title="Product images (async upload mode)"
          uploadLabel="Click to upload"
          uploadHint="pdf, docx, png, jpg, max 10mb"
          accept="image/*,.pdf,.doc,.docx"
          items={asyncItems}
          uploadFile={async (file) => {
            await new Promise((resolve) => setTimeout(resolve, 900));
            if (file.name.toLowerCase().includes("fail")) {
              throw new Error("Simulated upload failure");
            }

            const id = `async-${Date.now()}-${nextAsyncId}`;
            return {
              id,
              fileName: file.name,
              mimeType: file.type || "application/octet-stream",
              previewUrl: file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined,
              status: "ready",
            } satisfies AttachmentItem;
          }}
          onDelete={(item) => {
            setAsyncItems((prev) => prev.filter((candidate) => candidate.id !== item.id));
          }}
          onDownload={(item) => {
            toast(`Download clicked for: ${item.fileName}`);
          }}
        />
      </Layout.Column>
    </Layout>
  );
};

export const attachmentCardDemoResource = defineResource({
  path: "attachment-card-demo",
  meta: { title: "AttachmentCard Demo" },
  component: AttachmentCardDemoPage,
});
