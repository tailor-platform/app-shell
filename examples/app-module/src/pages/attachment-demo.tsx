import {
  Attachment,
  Card,
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

const AttachmentDemoPage = () => {
  const toast = useToast();
  const [cardWrappedItems, setCardWrappedItems] = useState<AttachmentItem[]>(() =>
    initialItems.filter((item) => item.id === "doc-1"),
  );
  const [items, setItems] = useState<AttachmentItem[]>(initialItems);
  const [asyncItems, setAsyncItems] = useState<AttachmentItem[]>(initialItems);
  const [readOnlyItems, setReadOnlyItems] = useState<AttachmentItem[]>(initialItems);

  const nextCardId = useMemo(() => cardWrappedItems.length + 1, [cardWrappedItems.length]);
  const nextId = useMemo(() => items.length + 1, [items.length]);
  const nextAsyncId = useMemo(() => asyncItems.length + 1, [asyncItems.length]);

  return (
    <Layout>
      <Layout.Header title="Attachment Demo" />
      <Layout.Column>
        <div style={{ color: "var(--muted-foreground)", marginBottom: "1.25rem" }}>
          <p style={{ margin: "0 0 0.75rem" }}>
            <code>Attachment</code> does not add a card frame, outer border, or inset padding—only
            the tile grid and upload control. Use <code>Card.Header</code> for a section title, or{" "}
            <code>className</code> for spacing. Drag-and-drop files onto the dashed{" "}
            <strong>upload tile</strong> only, or use the file picker from that tile.
          </p>
          <p style={{ margin: 0 }}>
            Four blocks below: <strong>inside Card</strong> (with <code>Card.Header</code> for the
            title), then three standalone cases—controlled <code>onUpload</code>, async{" "}
            <code>uploadFile</code>, and a read-only list (no upload tile).
          </p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
          <section style={{ paddingBottom: "1.5rem", borderBottom: "1px solid var(--border)" }}>
            <p
              style={{
                color: "var(--muted-foreground)",
                margin: "0 0 1rem",
              }}
            >
              <strong>Inside Card:</strong> <code>Card.Header</code> holds the title;{" "}
              <code>Card.Content</code> wraps <code>Attachment</code> (no extra{" "}
              <code>className</code> on <code>Attachment</code>).
            </p>
            <Card.Root>
              <Card.Header
                title="Documents"
                description="Wrapped in Card — border, padding, radius"
              />
              <Card.Content>
                <Attachment
                  uploadLabel="Upload"
                  uploadHint="PDF, images"
                  accept="image/*,.pdf"
                  items={cardWrappedItems}
                  onUpload={(files) => {
                    const mapped = files.map((file, index) => {
                      const id = `${Date.now()}-${nextCardId + index}`;
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
                    setCardWrappedItems((prev) => [...mapped, ...prev]);
                  }}
                  onDelete={(item) => {
                    setCardWrappedItems((prev) => prev.filter((c) => c.id !== item.id));
                  }}
                  onDownload={(item) => {
                    toast(`Download: ${item.fileName}`);
                  }}
                />
              </Card.Content>
            </Card.Root>
          </section>
          <section style={{ paddingBottom: "1.5rem", borderBottom: "1px solid var(--border)" }}>
            <p style={{ color: "var(--muted-foreground)", margin: "0 0 0.75rem" }}>
              <strong>Controlled</strong> <code>onUpload</code>
            </p>
            <Attachment
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
          </section>
          <section style={{ paddingBottom: "1.5rem", borderBottom: "1px solid var(--border)" }}>
            <p style={{ color: "var(--muted-foreground)", margin: "0 0 0.75rem" }}>
              <strong>Async</strong> <code>uploadFile</code>
            </p>
            <Attachment
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
                  previewUrl: file.type.startsWith("image/")
                    ? URL.createObjectURL(file)
                    : undefined,
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
          </section>
          <section>
            <p style={{ color: "var(--muted-foreground)", margin: "0 0 0.75rem" }}>
              <strong>Read-only</strong> (no upload tile)
            </p>
            <Attachment
              items={readOnlyItems}
              onDownload={(item) => {
                toast(`Download clicked for: ${item.fileName}`);
              }}
              onDelete={(item) => {
                setReadOnlyItems((prev) => prev.filter((candidate) => candidate.id !== item.id));
              }}
            />
          </section>
        </div>
      </Layout.Column>
    </Layout>
  );
};

export const attachmentDemoResource = defineResource({
  path: "attachment-demo",
  meta: { title: "Attachment Demo" },
  component: AttachmentDemoPage,
});
