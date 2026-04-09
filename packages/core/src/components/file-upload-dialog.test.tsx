import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FileUploadDialog } from "./file-upload-dialog";

afterEach(() => {
  cleanup();
});

describe("FileUploadDialog", () => {
  it("renders title and description when open", () => {
    render(
      <FileUploadDialog
        open
        onOpenChange={() => {}}
        onUpload={() => {}}
        title="Upload Invoice"
        description="Upload a PDF file"
      />,
    );
    expect(screen.getByText("Upload Invoice")).toBeDefined();
    expect(screen.getByText("Upload a PDF file")).toBeDefined();
  });

  it("renders default title when none provided", () => {
    render(<FileUploadDialog open onOpenChange={() => {}} onUpload={() => {}} />);
    expect(screen.getByText("Upload File")).toBeDefined();
  });

  it("shows accepted file types", () => {
    render(
      <FileUploadDialog open onOpenChange={() => {}} onUpload={() => {}} accept=".pdf,.png" />,
    );
    expect(screen.getByText("PDF, PNG")).toBeDefined();
  });

  it("shows selected file name after selection", async () => {
    const user = userEvent.setup();
    render(<FileUploadDialog open onOpenChange={() => {}} onUpload={() => {}} />);

    const file = new File(["content"], "invoice.pdf", { type: "application/pdf" });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(input, file);

    expect(screen.getByText("invoice.pdf")).toBeDefined();
  });

  it("calls onUpload with the file and closes dialog", async () => {
    const user = userEvent.setup();
    const onUpload = vi.fn();
    const onOpenChange = vi.fn();

    render(<FileUploadDialog open onOpenChange={onOpenChange} onUpload={onUpload} />);

    const file = new File(["content"], "invoice.pdf", { type: "application/pdf" });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(input, file);

    const uploadButton = screen.getByRole("button", { name: /upload/i });
    await user.click(uploadButton);

    expect(onUpload).toHaveBeenCalledWith(file);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("upload button is disabled when no file selected", () => {
    render(<FileUploadDialog open onOpenChange={() => {}} onUpload={() => {}} />);
    const uploadButton = screen.getByRole("button", { name: /upload/i });
    expect(uploadButton).toHaveProperty("disabled", true);
  });

  it("calls onOpenChange when cancel is clicked", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();

    render(<FileUploadDialog open onOpenChange={onOpenChange} onUpload={() => {}} />);

    await user.click(screen.getByRole("button", { name: /cancel/i }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("handles drag and drop", () => {
    render(<FileUploadDialog open onOpenChange={() => {}} onUpload={() => {}} />);

    const dropzone = document.querySelector('[data-slot="file-upload-dropzone"]') as HTMLElement;
    const file = new File(["content"], "dropped.pdf", { type: "application/pdf" });

    fireEvent.dragOver(dropzone, { dataTransfer: { files: [file] } });
    fireEvent.drop(dropzone, { dataTransfer: { files: [file] } });

    expect(screen.getByText("dropped.pdf")).toBeDefined();
  });

  it("matches snapshot", () => {
    const { container } = render(
      <FileUploadDialog
        open
        onOpenChange={() => {}}
        onUpload={() => {}}
        title="Upload Invoice"
        description="Upload a PDF or image"
        accept=".pdf,.png,.jpg"
      />,
    );
    expect(container.innerHTML).toMatchSnapshot();
  });
});
