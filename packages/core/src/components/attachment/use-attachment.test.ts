import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, renderHook } from "@testing-library/react";

import { useAttachment } from "./use-attachment";
import type { AttachmentItem, AttachmentOperation } from "./types";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const existingItem: AttachmentItem = {
  id: "existing-1",
  fileName: "blueprint.pdf",
  mimeType: "application/pdf",
};

describe("useAttachment", () => {
  it("initializes with empty items by default", () => {
    const { result } = renderHook(() => useAttachment());
    expect(result.current.props.items).toEqual([]);
  });

  it("initializes with provided initialItems", () => {
    const { result } = renderHook(() => useAttachment({ initialItems: [existingItem] }));
    expect(result.current.props.items).toHaveLength(1);
    expect(result.current.props.items[0]?.id).toBe("existing-1");
  });

  it("passes accept and disabled to props", () => {
    const { result } = renderHook(() => useAttachment({ accept: "image/*", disabled: true }));
    expect(result.current.props.accept).toBe("image/*");
    expect(result.current.props.disabled).toBe(true);
  });

  it("adds items when onUpload is called", () => {
    const { result } = renderHook(() => useAttachment());

    const file = new File(["hello"], "invoice.pdf", {
      type: "application/pdf",
    });
    act(() => {
      result.current.props.onUpload?.([file]);
    });

    expect(result.current.props.items).toHaveLength(1);
    expect(result.current.props.items[0]?.fileName).toBe("invoice.pdf");
  });

  it("creates image preview URL for image uploads", () => {
    const createObjectUrlSpy = vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:preview-url");

    const { result } = renderHook(() => useAttachment());
    const file = new File(["img"], "photo.jpg", { type: "image/jpeg" });

    act(() => {
      result.current.props.onUpload?.([file]);
    });

    expect(createObjectUrlSpy).toHaveBeenCalledWith(file);
    expect(result.current.props.items[0]?.previewUrl).toBe("blob:preview-url");

    createObjectUrlSpy.mockRestore();
  });

  it("removes item when onDelete is called for a pending upload", () => {
    const { result } = renderHook(() => useAttachment());
    const file = new File(["hello"], "invoice.pdf", {
      type: "application/pdf",
    });

    act(() => {
      result.current.props.onUpload?.([file]);
    });
    const item = result.current.props.items[0]!;

    act(() => {
      result.current.props.onDelete?.(item);
    });

    expect(result.current.props.items).toHaveLength(0);
  });

  it("revokes preview URL when pending image is deleted", () => {
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:preview-url");
    const revokeObjectUrlSpy = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);

    const { result } = renderHook(() => useAttachment());
    const file = new File(["img"], "photo.jpg", { type: "image/jpeg" });

    act(() => {
      result.current.props.onUpload?.([file]);
    });
    const item = result.current.props.items[0]!;

    act(() => {
      result.current.props.onDelete?.(item);
    });

    expect(revokeObjectUrlSpy).toHaveBeenCalledWith("blob:preview-url");

    revokeObjectUrlSpy.mockRestore();
  });

  it("applyChanges receives upload operation for new files", async () => {
    const { result } = renderHook(() => useAttachment());
    const file = new File(["hello"], "invoice.pdf", {
      type: "application/pdf",
    });

    act(() => {
      result.current.props.onUpload?.([file]);
    });

    const fn = vi.fn<(operations: AttachmentOperation[]) => Promise<void>>(async () => {});
    await act(async () => {
      await result.current.applyChanges(fn);
    });

    expect(fn).toHaveBeenCalledTimes(1);
    const ops = fn.mock.calls[0]?.[0] ?? [];
    expect(ops).toHaveLength(1);
    expect(ops[0]?.type).toBe("upload");
    expect((ops[0] as { type: "upload"; file: File })?.file).toBe(file);
  });

  it("applyChanges receives delete operation for initial items", async () => {
    const { result } = renderHook(() => useAttachment({ initialItems: [existingItem] }));

    act(() => {
      result.current.props.onDelete?.(existingItem);
    });

    const fn = vi.fn<(operations: AttachmentOperation[]) => Promise<void>>(async () => {});
    await act(async () => {
      await result.current.applyChanges(fn);
    });

    const ops = fn.mock.calls[0]?.[0] ?? [];
    expect(ops).toHaveLength(1);
    expect(ops[0]?.type).toBe("delete");
    expect((ops[0] as { type: "delete"; item: AttachmentItem })?.item).toEqual(existingItem);
  });

  it("does not add delete operation when a pending upload is deleted", async () => {
    const { result } = renderHook(() => useAttachment());
    const file = new File(["hello"], "invoice.pdf", {
      type: "application/pdf",
    });

    act(() => {
      result.current.props.onUpload?.([file]);
    });
    const item = result.current.props.items[0]!;
    act(() => {
      result.current.props.onDelete?.(item);
    });

    const fn = vi.fn<(operations: AttachmentOperation[]) => Promise<void>>(async () => {});
    await act(async () => {
      await result.current.applyChanges(fn);
    });

    expect(fn.mock.calls[0]?.[0] ?? []).toHaveLength(0);
  });

  it("preserves operations buffer when applyChanges fn throws", async () => {
    const { result } = renderHook(() => useAttachment());
    const file = new File(["hello"], "invoice.pdf", {
      type: "application/pdf",
    });

    act(() => {
      result.current.props.onUpload?.([file]);
    });

    // fn throws — buffer must be preserved for retry
    await act(async () => {
      await expect(
        result.current.applyChanges(async () => {
          throw new Error("upload failed");
        }),
      ).rejects.toThrow("upload failed");
    });

    // retry: operations are still available
    const fn = vi.fn<(operations: AttachmentOperation[]) => Promise<void>>(async () => {});
    await act(async () => {
      await result.current.applyChanges(fn);
    });

    expect(fn.mock.calls[0]?.[0] ?? []).toHaveLength(1);
    expect(fn.mock.calls[0]?.[0]?.[0]?.type).toBe("upload");
  });

  it("clears operations after applyChanges", async () => {
    const { result } = renderHook(() => useAttachment());
    const file = new File(["hello"], "invoice.pdf", {
      type: "application/pdf",
    });

    act(() => {
      result.current.props.onUpload?.([file]);
    });

    await act(async () => {
      await result.current.applyChanges(async () => {});
    });

    const fn = vi.fn<(operations: AttachmentOperation[]) => Promise<void>>(async () => {});
    await act(async () => {
      await result.current.applyChanges(fn);
    });

    expect(fn.mock.calls[0]?.[0] ?? []).toHaveLength(0);
  });

  it("applyChanges throws if called while already flushing", async () => {
    const { result } = renderHook(() => useAttachment());
    const file = new File(["x"], "doc.pdf", { type: "application/pdf" });

    act(() => {
      result.current.props.onUpload?.([file]);
    });

    let resolveFirst!: () => void;
    const firstCall = result.current.applyChanges(
      () =>
        new Promise<void>((res) => {
          resolveFirst = res;
        }),
    );

    await expect(result.current.applyChanges(async () => {})).rejects.toThrow(
      "applyChanges is already in progress",
    );

    resolveFirst();
    await firstCall;
  });

  it("ops added during applyChanges are not lost", async () => {
    const { result } = renderHook(() => useAttachment());
    const file1 = new File(["a"], "first.pdf", { type: "application/pdf" });
    const file2 = new File(["b"], "second.pdf", { type: "application/pdf" });

    act(() => {
      result.current.props.onUpload?.([file1]);
    });

    let resolveFirst!: () => void;
    const firstFlush = result.current.applyChanges(
      () =>
        new Promise<void>((res) => {
          resolveFirst = res;
        }),
    );

    // Add another file while the first applyChanges is still in flight
    act(() => {
      result.current.props.onUpload?.([file2]);
    });

    resolveFirst();
    await act(async () => {
      await firstFlush;
    });

    // file2's op must survive and appear in the next applyChanges call
    const fn = vi.fn<(operations: AttachmentOperation[]) => Promise<void>>(async () => {});
    await act(async () => {
      await result.current.applyChanges(fn);
    });

    const ops = fn.mock.calls[0]?.[0] ?? [];
    expect(ops).toHaveLength(1);
    expect(ops[0]?.type).toBe("upload");
    expect((ops[0] as { type: "upload"; file: File }).file).toBe(file2);
  });

  it("pending upload deleted during applyChanges does not corrupt the remaining buffer", async () => {
    const { result } = renderHook(() => useAttachment());
    const file1 = new File(["a"], "first.pdf", { type: "application/pdf" });
    const file2 = new File(["b"], "second.pdf", { type: "application/pdf" });

    act(() => {
      result.current.props.onUpload?.([file1, file2]);
    });

    const itemToDelete = result.current.props.items[0]!; // file1 (prepended, so index 0)

    let resolveFirst!: () => void;
    const firstFlush = result.current.applyChanges(
      () =>
        new Promise<void>((res) => {
          resolveFirst = res;
        }),
    );

    // Cancel file1's pending upload while applyChanges is in flight
    act(() => {
      result.current.props.onDelete?.(itemToDelete);
    });

    resolveFirst();
    await act(async () => {
      await firstFlush;
    });

    // Both ops were in the snapshot → both should be cleared; the splice of file1
    // mid-flight must not cause file2's op to survive into the next flush.
    const fn = vi.fn<(operations: AttachmentOperation[]) => Promise<void>>(async () => {});
    await act(async () => {
      await result.current.applyChanges(fn);
    });

    expect(fn.mock.calls[0]?.[0] ?? []).toHaveLength(0);
  });
});
