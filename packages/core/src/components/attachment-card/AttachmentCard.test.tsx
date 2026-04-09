import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { AttachmentCard } from "./AttachmentCard";
import type { AttachmentItem } from "./types";

const toastError = vi.fn();

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({
    error: toastError,
  }),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const mixedItems: AttachmentItem[] = [
  {
    id: "img-1",
    fileName: "shoe-red.png",
    mimeType: "image/png",
    previewUrl: "https://example.com/shoe-red.png",
  },
  {
    id: "file-1",
    fileName: "Aug-Sep 2025_1234-12.pdf",
    mimeType: "application/pdf",
  },
];

describe("AttachmentCard", () => {
  describe("snapshots", () => {
    it("empty default", () => {
      const { container } = render(<AttachmentCard />);
      expect(container.innerHTML).toMatchSnapshot();
    });

    it("populated mixed items", () => {
      const { container } = render(<AttachmentCard items={mixedItems} />);
      expect(container.innerHTML).toMatchSnapshot();
    });

    it("disabled", () => {
      const { container } = render(<AttachmentCard items={mixedItems} disabled />);
      expect(container.innerHTML).toMatchSnapshot();
    });
  });

  it("renders title and upload tile", () => {
    render(<AttachmentCard title="Product images" uploadLabel="Upload image" onUpload={vi.fn()} />);
    expect(screen.getByRole("heading", { name: "Product images" })).toBeDefined();
    expect(screen.getByTestId("attachment-upload-tile")).toBeDefined();
    expect(screen.getByText("Upload image")).toBeDefined();
  });

  it("renders upload hint text in the upload tile", () => {
    render(
      <AttachmentCard
        title="Documents"
        uploadLabel="Add file"
        uploadHint="PDF and images only. Max 5 MB."
        onUpload={vi.fn()}
      />,
    );
    expect(screen.getByText("PDF and images only. Max 5 MB.")).toBeDefined();
  });

  it("renders image and file preview branches", () => {
    render(<AttachmentCard items={mixedItems} />);
    expect(screen.getByRole("img", { name: "shoe-red.png" })).toBeDefined();
    expect(screen.getByRole("button", { name: /Aug-Sep 2025_1234-12\.pdf/ })).toBeDefined();
    expect(screen.getByTestId("attachment-file-icon")).toBeDefined();
  });

  it("calls onUpload when files are selected through input", () => {
    const onUpload = vi.fn();
    render(<AttachmentCard onUpload={onUpload} />);

    const file = new File(["hello"], "invoice.pdf", { type: "application/pdf" });
    const input = screen.getByTestId("attachment-upload-input") as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });

    expect(onUpload).toHaveBeenCalledTimes(1);
    expect(onUpload.mock.calls[0]?.[0]).toHaveLength(1);
    expect(onUpload.mock.calls[0]?.[0][0]?.name).toBe("invoice.pdf");
  });

  it("calls onUpload when files are dropped on the card", () => {
    const onUpload = vi.fn();
    const { container } = render(<AttachmentCard onUpload={onUpload} />);
    const cardRoot = container.querySelector('[data-slot="attachment-card"]');
    expect(cardRoot).toBeTruthy();

    const file = new File(["hello"], "receipt.pdf", { type: "application/pdf" });
    fireEvent.drop(cardRoot as HTMLElement, {
      dataTransfer: {
        files: [file],
      },
    });

    expect(onUpload).toHaveBeenCalledTimes(1);
    expect(onUpload.mock.calls[0]?.[0][0]?.name).toBe("receipt.pdf");
  });

  it("triggers download and delete actions from menu", async () => {
    const user = userEvent.setup();
    const onDownload = vi.fn();
    const onDelete = vi.fn();

    render(<AttachmentCard items={mixedItems} onDownload={onDownload} onDelete={onDelete} />);

    const trigger = screen.getByRole("button", {
      name: /Attachment options for Aug-Sep 2025_1234-12\.pdf/,
    });
    await user.click(trigger);

    await waitFor(() => {
      expect(screen.getByText("Download")).toBeDefined();
    });

    await user.click(screen.getByText("Download"));
    expect(onDownload).toHaveBeenCalledTimes(1);
    expect(onDownload).toHaveBeenCalledWith(mixedItems[1]);

    await user.click(trigger);
    await waitFor(() => {
      expect(screen.getByText("Delete")).toBeDefined();
    });
    await user.click(screen.getByText("Delete"));
    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(onDelete).toHaveBeenCalledWith(mixedItems[1]);
  });

  it("disables upload and hides menu actions when disabled", () => {
    const onUpload = vi.fn();
    render(<AttachmentCard items={mixedItems} disabled onUpload={onUpload} />);

    expect(screen.queryByTestId("attachment-upload-tile")).toBeNull();

    const input = screen.getByTestId("attachment-upload-input") as HTMLInputElement;
    fireEvent.change(input, {
      target: {
        files: [new File(["x"], "blocked.pdf", { type: "application/pdf" })],
      },
    });
    expect(onUpload).not.toHaveBeenCalled();

    const menuTrigger = screen.queryByRole("button", {
      name: /Attachment options for/i,
    });
    expect(menuTrigger).toBeNull();
  });

  it("renders upload overlay and resolves async uploadFile results", async () => {
    let resolveUpload: ((value: AttachmentItem) => void) | undefined;
    const uploadFile = vi.fn(
      () =>
        new Promise<AttachmentItem>((resolve) => {
          resolveUpload = resolve;
        }),
    );

    render(<AttachmentCard uploadFile={uploadFile} />);

    const pendingFile = new File(["hello"], "pending.pdf", { type: "application/pdf" });
    const input = screen.getByTestId("attachment-upload-input") as HTMLInputElement;
    fireEvent.change(input, { target: { files: [pendingFile] } });

    await waitFor(() => {
      expect(uploadFile).toHaveBeenCalledTimes(1);
      expect(screen.getAllByTestId("attachment-upload-overlay")).toHaveLength(1);
      expect(screen.getAllByTestId("attachment-upload-spinner")).toHaveLength(1);
    });

    expect(
      screen.queryByRole("button", { name: /Attachment options for pending\.pdf/ }),
    ).toBeNull();

    resolveUpload?.({
      id: "uploaded-1",
      fileName: "pending.pdf",
      mimeType: "application/pdf",
      status: "ready",
    });

    await waitFor(() => {
      expect(screen.queryByTestId("attachment-upload-overlay")).toBeNull();
      expect(screen.getByRole("button", { name: /pending\.pdf/ })).toBeDefined();
    });
  });

  it("shows toast and removes failed temporary items in async upload mode", async () => {
    const uploadFile = vi.fn(async () => {
      throw new Error("Network failed");
    });
    const onUploadError = vi.fn();

    render(<AttachmentCard uploadFile={uploadFile} onUploadError={onUploadError} />);

    const failedFile = new File(["hello"], "bad-file.pdf", { type: "application/pdf" });
    const input = screen.getByTestId("attachment-upload-input") as HTMLInputElement;
    fireEvent.change(input, { target: { files: [failedFile] } });

    await waitFor(() => {
      expect(toastError).toHaveBeenCalledWith("Failed to upload bad-file.pdf");
      expect(onUploadError).toHaveBeenCalledTimes(1);
    });

    await waitFor(() => {
      expect(screen.queryByRole("button", { name: /bad-file\.pdf/ })).toBeNull();
      expect(screen.queryByTestId("attachment-upload-overlay")).toBeNull();
    });
  });

  it("falls back to image icon tile when image preview fails to load", async () => {
    render(
      <AttachmentCard
        items={[
          {
            id: "img-broken",
            fileName: "IMG_0689_Original.jpg",
            mimeType: "image/jpeg",
            previewUrl: "https://example.com/missing-image.jpg",
          },
        ]}
      />,
    );

    const image = screen.getByRole("img", { name: "IMG_0689_Original.jpg" });
    fireEvent.error(image);

    await waitFor(() => {
      expect(screen.getByTestId("attachment-image-fallback-icon")).toBeDefined();
      expect(screen.getByRole("button", { name: /IMG_0689_Original\.jpg/ })).toBeDefined();
    });
  });

  it("removes async-uploaded local item when delete is selected", async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();
    const uploadFile = vi.fn(async () => ({
      id: "local-uploaded-1",
      fileName: "local-delete.pdf",
      mimeType: "application/pdf",
      status: "ready" as const,
    }));

    render(<AttachmentCard uploadFile={uploadFile} onDelete={onDelete} />);

    const input = screen.getByTestId("attachment-upload-input") as HTMLInputElement;
    fireEvent.change(input, {
      target: { files: [new File(["x"], "local-delete.pdf", { type: "application/pdf" })] },
    });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /local-delete\.pdf/ })).toBeDefined();
    });

    const trigger = screen.getByRole("button", {
      name: /Attachment options for local-delete\.pdf/,
    });
    await user.click(trigger);
    await waitFor(() => {
      expect(screen.getByText("Delete")).toBeDefined();
    });
    await user.click(screen.getByText("Delete"));

    await waitFor(() => {
      expect(screen.queryByRole("button", { name: /local-delete\.pdf/ })).toBeNull();
      expect(onDelete).toHaveBeenCalledTimes(1);
    });
  });

  it("revokes pending object URLs when unmounted during async upload", async () => {
    const createObjectUrlSpy = vi
      .spyOn(URL, "createObjectURL")
      .mockReturnValue("blob:attachment-card-pending-image");
    const revokeObjectUrlSpy = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);

    const uploadFile = vi.fn(
      () =>
        new Promise<AttachmentItem>(() => {
          // Intentionally unresolved promise to simulate in-flight upload.
        }),
    );

    const { unmount } = render(<AttachmentCard uploadFile={uploadFile} />);
    const input = screen.getByTestId("attachment-upload-input") as HTMLInputElement;

    fireEvent.change(input, {
      target: {
        files: [new File(["image-bytes"], "pending-image.jpg", { type: "image/jpeg" })],
      },
    });

    await waitFor(() => {
      expect(uploadFile).toHaveBeenCalledTimes(1);
    });

    unmount();

    expect(revokeObjectUrlSpy).toHaveBeenCalledWith("blob:attachment-card-pending-image");

    createObjectUrlSpy.mockRestore();
    revokeObjectUrlSpy.mockRestore();
  });
});
