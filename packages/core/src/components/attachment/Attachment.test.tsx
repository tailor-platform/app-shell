import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { Attachment } from "./Attachment";
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

describe("Attachment", () => {
  describe("snapshots", () => {
    it("empty default", () => {
      const { container } = render(<Attachment />);
      expect(container.innerHTML).toMatchSnapshot();
    });

    it("populated mixed items", () => {
      const { container } = render(<Attachment items={mixedItems} />);
      expect(container.innerHTML).toMatchSnapshot();
    });

    it("disabled", () => {
      const { container } = render(<Attachment items={mixedItems} disabled />);
      expect(container.innerHTML).toMatchSnapshot();
    });
  });

  it("renders upload tile and labels", () => {
    render(<Attachment uploadLabel="Upload image" onUpload={vi.fn()} />);
    expect(screen.getByTestId("attachment-upload-tile")).toBeDefined();
    expect(screen.getByText("Upload image")).toBeDefined();
  });

  it("renders upload hint text in the upload tile", () => {
    render(
      <Attachment
        uploadLabel="Add file"
        uploadHint="PDF and images only. Max 5 MB."
        onUpload={vi.fn()}
      />,
    );
    expect(screen.getByText("PDF and images only. Max 5 MB.")).toBeDefined();
  });

  it("renders image and file preview branches", () => {
    render(<Attachment items={mixedItems} />);
    expect(screen.getByRole("img", { name: "shoe-red.png" })).toBeDefined();
    expect(screen.getByRole("button", { name: /Aug-Sep 2025_1234-12\.pdf/ })).toBeDefined();
    expect(screen.getByTestId("attachment-file-icon")).toBeDefined();
  });

  it("calls onUpload when files are selected through input", () => {
    const onUpload = vi.fn();
    render(<Attachment onUpload={onUpload} />);

    const file = new File(["hello"], "invoice.pdf", { type: "application/pdf" });
    const input = screen.getByTestId("attachment-upload-input") as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });

    expect(onUpload).toHaveBeenCalledTimes(1);
    expect(onUpload.mock.calls[0]?.[0]).toHaveLength(1);
    expect(onUpload.mock.calls[0]?.[0][0]?.name).toBe("invoice.pdf");
  });

  it("calls onUpload when files are dropped on the upload tile", () => {
    const onUpload = vi.fn();
    render(<Attachment onUpload={onUpload} />);
    const uploadTile = screen.getByTestId("attachment-upload-tile");
    expect(uploadTile).toBeTruthy();

    const file = new File(["hello"], "receipt.pdf", { type: "application/pdf" });
    fireEvent.drop(uploadTile, {
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

    render(<Attachment items={mixedItems} onDownload={onDownload} onDelete={onDelete} />);

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
    render(<Attachment items={mixedItems} disabled onUpload={onUpload} />);

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

    render(<Attachment uploadFile={uploadFile} />);

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

    render(<Attachment uploadFile={uploadFile} onUploadError={onUploadError} />);

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
      <Attachment
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

    render(<Attachment uploadFile={uploadFile} onDelete={onDelete} />);

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

  it("revokes object URLs after async upload completes (via finally)", async () => {
    const createObjectUrlSpy = vi
      .spyOn(URL, "createObjectURL")
      .mockReturnValue("blob:attachment-pending-image");
    const revokeObjectUrlSpy = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);

    const uploadFile = vi.fn(async () => {
      throw new Error("Upload failed");
    });

    render(<Attachment uploadFile={uploadFile} />);
    const input = screen.getByTestId("attachment-upload-input") as HTMLInputElement;

    fireEvent.change(input, {
      target: {
        files: [new File(["image-bytes"], "pending-image.jpg", { type: "image/jpeg" })],
      },
    });

    await waitFor(() => {
      expect(revokeObjectUrlSpy).toHaveBeenCalledWith("blob:attachment-pending-image");
    });

    createObjectUrlSpy.mockRestore();
    revokeObjectUrlSpy.mockRestore();
  });

  it("revokes object URLs after successful async image upload", async () => {
    const createObjectUrlSpy = vi
      .spyOn(URL, "createObjectURL")
      .mockReturnValue("blob:attachment-success-image");
    const revokeObjectUrlSpy = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);

    const uploadFile = vi.fn(async () => ({
      id: "uploaded-img-1",
      fileName: "success-image.jpg",
      mimeType: "image/jpeg",
      status: "ready" as const,
    }));

    render(<Attachment uploadFile={uploadFile} />);
    const input = screen.getByTestId("attachment-upload-input") as HTMLInputElement;

    fireEvent.change(input, {
      target: {
        files: [new File(["image-bytes"], "success-image.jpg", { type: "image/jpeg" })],
      },
    });

    await waitFor(() => {
      expect(revokeObjectUrlSpy).toHaveBeenCalledWith("blob:attachment-success-image");
    });

    createObjectUrlSpy.mockRestore();
    revokeObjectUrlSpy.mockRestore();
  });
});
