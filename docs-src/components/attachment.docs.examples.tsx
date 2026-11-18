import { useState } from "react";
import {
  Attachment,
  Button,
  Card,
  Text,
  useAttachment,
  type AttachmentItem,
} from "@tailor-platform/app-shell";

export function BasicUsage() {
  const initialItems: AttachmentItem[] = [
    {
      id: "sample-image",
      fileName: "product.svg",
      mimeType: "image/svg+xml",
      previewUrl: `data:image/svg+xml,${encodeURIComponent(
        '<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120"><rect width="120" height="120" fill="#dbeafe"/><circle cx="60" cy="50" r="26" fill="#2563eb"/><text x="60" y="100" text-anchor="middle" font-family="sans-serif" font-size="12" fill="#1e3a8a">Sample image</text></svg>',
      )}`,
    },
    {
      id: "sample-pdf",
      fileName: "specification.pdf",
      mimeType: "application/pdf",
    },
  ];
  const { props, applyChanges, isApplying } = useAttachment({
    initialItems,
    accept: "image/*,.pdf",
  });
  const [savedOperations, setSavedOperations] = useState<string[] | null>(null);
  const [downloadMessage, setDownloadMessage] = useState("No download requested.");

  return (
    <Card.Root>
      <Card.Header
        title="Product attachments"
        description="Files stay in this preview. Save and Download only display their results below."
      />
      <Card.Content className="flex flex-col gap-4">
        <Attachment
          {...props}
          disabled={isApplying}
          uploadLabel="Add files"
          uploadHint="Choose images or PDFs, or drop files here."
          onDownload={(item) =>
            setDownloadMessage(`Download requested: ${item.fileName} (demo only).`)
          }
        />
        <div>
          <Button
            disabled={isApplying}
            onClick={() =>
              applyChanges(async (operations) => {
                setSavedOperations(
                  operations.map((operation) => `${operation.type}: ${operation.item.fileName}`),
                );
              })
            }
          >
            Save changes
          </Button>
        </div>
        <Text.p role="status">
          {savedOperations === null
            ? "No changes saved yet."
            : `Applied operations (demo): ${JSON.stringify(savedOperations)}`}
        </Text.p>
        <Text.p role="status">{downloadMessage}</Text.p>
      </Card.Content>
    </Card.Root>
  );
}
