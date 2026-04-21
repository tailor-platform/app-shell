import { useCallback, useRef, useState } from "react";

import type {
  AttachmentItem,
  AttachmentOperation,
  AttachmentControlledProps,
  UseAttachmentOptions,
} from "./types";

type UseAttachmentProps = Omit<AttachmentControlledProps, "items"> & {
  items: AttachmentItem[];
};

type UseAttachmentReturn = {
  props: UseAttachmentProps;
  /**
   * Flushes buffered operations to your backend by passing them to `fn`.
   * If `fn` throws, the buffer is preserved so the call can be retried.
   * The buffer is cleared only after `fn` resolves successfully.
   */
  applyChanges: (fn: (operations: AttachmentOperation[]) => Promise<void>) => Promise<void>;
};

export function useAttachment(options: UseAttachmentOptions = {}): UseAttachmentReturn {
  const { initialItems = [], accept, disabled = false } = options;

  const [items, setItems] = useState<AttachmentItem[]>(initialItems);
  const operationsRef = useRef<AttachmentOperation[]>([]);
  const pendingUploadIdsRef = useRef(new Set<string>());

  const onUpload = useCallback((files: File[]) => {
    const newItems = files.map(
      (file): AttachmentItem => ({
        id: `pending-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        fileName: file.name,
        mimeType: file.type || "application/octet-stream",
        previewUrl: file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined,
      }),
    );

    files.forEach((file, i) => {
      const item = newItems[i];
      if (item) {
        pendingUploadIdsRef.current.add(item.id);
        operationsRef.current.push({ type: "upload", file, item });
      }
    });

    setItems((prev) => [...newItems, ...prev]); // newly uploaded files are prepended to the list
  }, []);

  const onDelete = useCallback((item: AttachmentItem) => {
    setItems((prev) => prev.filter((i) => i.id !== item.id));

    const uploadOpIndex = operationsRef.current.findIndex(
      (op) => op.type === "upload" && op.item.id === item.id,
    );

    if (uploadOpIndex !== -1) {
      // Cancelling a pending upload — revoke preview URL and drop the op
      const op = operationsRef.current[uploadOpIndex];
      if (op?.type === "upload" && op.item.previewUrl) {
        URL.revokeObjectURL(op.item.previewUrl);
      }
      pendingUploadIdsRef.current.delete(item.id);
      operationsRef.current.splice(uploadOpIndex, 1);
    } else {
      // Not a pending upload → must be a server-side item; always emit delete
      operationsRef.current.push({ type: "delete", item });
    }
  }, []);

  const applyChanges = useCallback(
    async (fn: (operations: AttachmentOperation[]) => Promise<void>) => {
      await fn([...operationsRef.current]);
      operationsRef.current = [];
    },
    [],
  );

  const props: UseAttachmentProps = {
    items,
    onUpload: onUpload as (files: File[]) => void,
    onDelete,
    accept,
    disabled,
  };

  return { props, applyChanges };
}
