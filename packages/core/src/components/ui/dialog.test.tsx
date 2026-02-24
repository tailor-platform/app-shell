import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "./dialog";

afterEach(() => {
  cleanup();
});

describe("Dialog", () => {
  it("renders trigger", () => {
    render(
      <Dialog>
        <DialogTrigger data-testid="trigger">Open</DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Title</DialogTitle>
          </DialogHeader>
        </DialogContent>
      </Dialog>,
    );

    expect(screen.getByTestId("trigger")).toBeDefined();
    expect(screen.getByText("Open")).toBeDefined();
  });

  it("opens dialog when trigger is clicked", async () => {
    const user = userEvent.setup();

    render(
      <Dialog>
        <DialogTrigger data-testid="trigger">Open</DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Dialog Title</DialogTitle>
            <DialogDescription>Dialog description</DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>,
    );

    expect(screen.queryByText("Dialog Title")).toBeNull();

    await user.click(screen.getByTestId("trigger"));

    await waitFor(() => {
      expect(screen.getByText("Dialog Title")).toBeDefined();
      expect(screen.getByText("Dialog description")).toBeDefined();
    });
  });

  it("closes dialog when close button is clicked", async () => {
    const user = userEvent.setup();

    render(
      <Dialog>
        <DialogTrigger data-testid="trigger">Open</DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Dialog Title</DialogTitle>
          </DialogHeader>
        </DialogContent>
      </Dialog>,
    );

    await user.click(screen.getByTestId("trigger"));

    await waitFor(() => {
      expect(screen.getByText("Dialog Title")).toBeDefined();
    });

    // Click the close button (has sr-only text "Close")
    const closeButton = screen.getByText("Close").closest("button");
    expect(closeButton).toBeDefined();
    await user.click(closeButton!);

    await waitFor(() => {
      expect(screen.queryByText("Dialog Title")).toBeNull();
    });
  });

  it("calls onOpenChange when dialog state changes", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();

    render(
      <Dialog onOpenChange={onOpenChange}>
        <DialogTrigger data-testid="trigger">Open</DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Dialog Title</DialogTitle>
          </DialogHeader>
        </DialogContent>
      </Dialog>,
    );

    await user.click(screen.getByTestId("trigger"));

    await waitFor(() => {
      // Base UI calls onOpenChange with (open, eventDetails)
      expect(onOpenChange).toHaveBeenCalled();
      expect(onOpenChange.mock.calls[0][0]).toBe(true);
    });
  });

  it("supports controlled open state", async () => {
    const onOpenChange = vi.fn();

    const { rerender } = render(
      <Dialog open={false} onOpenChange={onOpenChange}>
        <DialogTrigger data-testid="trigger">Open</DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Dialog Title</DialogTitle>
          </DialogHeader>
        </DialogContent>
      </Dialog>,
    );

    expect(screen.queryByText("Dialog Title")).toBeNull();

    rerender(
      <Dialog open={true} onOpenChange={onOpenChange}>
        <DialogTrigger data-testid="trigger">Open</DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Dialog Title</DialogTitle>
          </DialogHeader>
        </DialogContent>
      </Dialog>,
    );

    await waitFor(() => {
      expect(screen.getByText("Dialog Title")).toBeDefined();
    });
  });

  it("renders DialogFooter", async () => {
    const user = userEvent.setup();

    render(
      <Dialog>
        <DialogTrigger data-testid="trigger">Open</DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Dialog Title</DialogTitle>
          </DialogHeader>
          <DialogFooter>
            <button>Submit</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>,
    );

    await user.click(screen.getByTestId("trigger"));

    await waitFor(() => {
      expect(screen.getByText("Submit")).toBeDefined();
    });
  });

  it("closes dialog when pressing Escape", async () => {
    const user = userEvent.setup();

    render(
      <Dialog>
        <DialogTrigger data-testid="trigger">Open</DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Dialog Title</DialogTitle>
          </DialogHeader>
        </DialogContent>
      </Dialog>,
    );

    await user.click(screen.getByTestId("trigger"));

    await waitFor(() => {
      expect(screen.getByText("Dialog Title")).toBeDefined();
    });

    await user.keyboard("{Escape}");

    await waitFor(() => {
      expect(screen.queryByText("Dialog Title")).toBeNull();
    });
  });
});
