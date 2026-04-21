import { useCallback, useEffect, useReducer, useRef } from "react";

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

/**
 * Internal wrapper that tags each buffered operation with a stable unique key.
 * `opKey` lets applyChanges identify exactly which entries were snapshotted for
 * a flush and remove them by identity after `fn` resolves — regardless of any
 * concurrent index shifts caused by onDelete mutating the buffer mid-flight.
 */
type OperationEntry = AttachmentOperation & { readonly opKey: string };

// ---------------------------------------------------------------------------
// Item lifecycle helpers
// These are the only two places that call URL.createObjectURL / revokeObjectURL.
// Keeping side effects here makes the rest of the hook free of URL management.
// ---------------------------------------------------------------------------

/**
 * Creates a pending AttachmentItem for a newly selected file.
 * Side effect: calls URL.createObjectURL for image files to generate a preview URL.
 */
function buildPendingItem(file: File): AttachmentItem {
  return {
    id: `pending-${crypto.randomUUID()}`,
    fileName: file.name,
    mimeType: file.type || "application/octet-stream",
    previewUrl: file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined,
  };
}

/**
 * Releases the blob preview URL held by an item, if any.
 * Side effect: calls URL.revokeObjectURL when previewUrl is a blob: URL.
 * Safe to call on server-side items (https: URLs are ignored).
 */
function releasePendingItem(item: AttachmentItem): void {
  if (item.previewUrl?.startsWith("blob:")) {
    URL.revokeObjectURL(item.previewUrl);
  }
}

// ---------------------------------------------------------------------------

type State = {
  items: AttachmentItem[];
  operations: OperationEntry[];
  isApplying: boolean;
};

type Action =
  /** Files are selected or dropped onto the upload tile. */
  | { type: "UPLOAD"; newItems: AttachmentItem[]; newOps: OperationEntry[] }
  /** Delete is chosen from a preview item's action menu. */
  | { type: "DELETE"; itemId: string }
  /** applyChanges begins — locks the buffer against concurrent flushes. */
  | { type: "FLUSH_START" }
  /** fn resolved successfully — removes the snapshotted ops from the buffer. */
  | { type: "FLUSH_COMPLETE"; flushedKeys: Set<string> }
  /** fn threw — resets isApplying without touching the buffer so the call can be retried. */
  | { type: "FLUSH_ROLLBACK" };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "UPLOAD":
      return {
        ...state,
        items: [...action.newItems, ...state.items],
        operations: [...state.operations, ...action.newOps],
      };
    case "DELETE": {
      const uploadOpIndex = state.operations.findIndex(
        (op) => op.type === "upload" && op.item.id === action.itemId,
      );
      const isRemovingPendingUpload = uploadOpIndex !== -1;
      return {
        ...state,
        items: state.items.filter((i) => i.id !== action.itemId),
        operations: isRemovingPendingUpload
          ? state.operations.filter((_, i) => i !== uploadOpIndex)
          : [
              ...state.operations,
              {
                type: "delete",
                item: state.items.find((i) => i.id === action.itemId)!,
                opKey: crypto.randomUUID(),
              },
            ],
      };
    }
    case "FLUSH_START":
      return { ...state, isApplying: true };
    case "FLUSH_COMPLETE":
      return {
        ...state,
        isApplying: false,
        operations: state.operations.filter((op) => !action.flushedKeys.has(op.opKey)),
      };
    case "FLUSH_ROLLBACK":
      return { ...state, isApplying: false };
  }
}

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

  const [state, dispatch] = useReducer(reducer, {
    items: initialItems,
    operations: [],
    isApplying: false,
  });

  // Flush guard: prevents concurrent applyChanges calls from sending duplicate operations.
  const isApplyingRef = useRef(false);

  // Used only by the useEffect cleanup on unmount to revoke any remaining blob URLs.
  // A ref is needed here because the cleanup function captures the ref object (stable),
  // not state.operations (which would be stale inside the effect's closure).
  const operationsRef = useRef(state.operations);
  operationsRef.current = state.operations;

  const onUpload = useCallback((files: File[]) => {
    const newItems = files.map(buildPendingItem);
    const newOps: OperationEntry[] = files.map((file, i) => ({
      type: "upload",
      file,
      item: newItems[i]!,
      opKey: crypto.randomUUID(),
    }));
    dispatch({ type: "UPLOAD", newItems, newOps });
  }, []);

  const onDelete = useCallback((item: AttachmentItem) => {
    releasePendingItem(item);
    dispatch({ type: "DELETE", itemId: item.id });
  }, []);

  // Revoke all blob URLs for pending image uploads on unmount to prevent memory leaks.
  // onDelete handles revocation for items removed during the component's lifetime;
  // this cleanup covers any remaining pending uploads when the component is unmounted
  // (e.g. the user navigates away without submitting).
  useEffect(() => {
    return () => {
      for (const op of operationsRef.current) {
        if (op.type === "upload") releasePendingItem(op.item);
      }
    };
  }, []);

  const applyChanges = useCallback(
    async (fn: (operations: AttachmentOperation[]) => Promise<void>) => {
      if (isApplyingRef.current) {
        throw new Error("applyChanges is already in progress");
      }
      isApplyingRef.current = true;
      dispatch({ type: "FLUSH_START" });

      const snapshot = [...state.operations];
      const flushedKeys = new Set(snapshot.map((op) => op.opKey));
      // Strip internal opKey before passing to the consumer
      const opsToFlush: AttachmentOperation[] = snapshot.map(({ opKey: _opKey, ...op }) => op);
      try {
        await fn(opsToFlush);
        dispatch({ type: "FLUSH_COMPLETE", flushedKeys });
      } catch (err) {
        dispatch({ type: "FLUSH_ROLLBACK" });
        throw err;
      } finally {
        isApplyingRef.current = false;
      }
    },
    [state.operations],
  );

  const props: UseAttachmentProps = {
    items: state.items,
    onUpload,
    onDelete,
    accept,
    disabled,
  };

  return { props, applyChanges, isApplying: state.isApplying };
}
