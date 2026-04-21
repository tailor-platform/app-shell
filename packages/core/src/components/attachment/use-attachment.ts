import { useCallback, useEffect, useRef, useState } from "react";

import type {
  AttachmentItem,
  AttachmentOperation,
  AttachmentProps,
  UseAttachmentOptions,
} from "./types";

type AttachmentControlledProps = Pick<
  AttachmentProps,
  "items" | "onUpload" | "onDelete" | "accept" | "disabled"
>;

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
  /** True while applyChanges is in progress. */
  isApplying: boolean;
};

export function useAttachment(options: UseAttachmentOptions = {}): UseAttachmentReturn {
  const { initialItems = [], accept, disabled = false } = options;
  const [items, setItems] = useState<AttachmentItem[]>(initialItems);
  const [isApplying, setIsApplying] = useState(false);

  // Pending operations buffer: accumulates upload/delete ops until applyChanges is called.
  const operationsRef = useRef<AttachmentOperation[]>([]);

  // Flush guard: prevents concurrent applyChanges calls from sending duplicate operations.
  const isApplyingRef = useRef(false);

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
      operationsRef.current.splice(uploadOpIndex, 1);
    } else {
      // Not a pending upload → must be a server-side item; always emit delete
      operationsRef.current.push({ type: "delete", item });
    }
  }, []);

  // Revoke all blob URLs for pending image uploads on unmount to prevent memory leaks.
  // onDelete handles revocation for items removed during the component's lifetime;
  // this cleanup covers any remaining pending uploads when the component is unmounted
  // (e.g. the user navigates away without submitting).
  useEffect(() => {
    return () => {
      for (const op of operationsRef.current) {
        if (op.type === "upload" && op.item.previewUrl) {
          URL.revokeObjectURL(op.item.previewUrl);
        }
      }
    };
  }, []);

  const applyChanges = useCallback(
    async (fn: (operations: AttachmentOperation[]) => Promise<void>) => {
      if (isApplyingRef.current) {
        throw new Error("applyChanges is already in progress");
      }
      isApplyingRef.current = true;
      setIsApplying(true);
      const opsToFlush = [...operationsRef.current];
      try {
        await fn(opsToFlush);
        operationsRef.current = operationsRef.current.slice(opsToFlush.length);
      } finally {
        isApplyingRef.current = false;
        setIsApplying(false);
      }
    },
    [],
  );

  const props: UseAttachmentProps = {
    items,
    onUpload,
    onDelete,
    accept,
    disabled,
  };

  return { props, applyChanges, isApplying };
}
