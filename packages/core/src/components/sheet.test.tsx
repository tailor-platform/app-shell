import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
} from "./sheet";

afterEach(() => {
  cleanup();
});

describe("Sheet", () => {
  it("renders trigger", () => {
    render(
      <Sheet>
        <SheetTrigger data-testid="trigger">Open</SheetTrigger>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Title</SheetTitle>
          </SheetHeader>
        </SheetContent>
      </Sheet>,
    );

    expect(screen.getByTestId("trigger")).toBeDefined();
    expect(screen.getByText("Open")).toBeDefined();
  });

  it("opens sheet when trigger is clicked", async () => {
    const user = userEvent.setup();

    render(
      <Sheet>
        <SheetTrigger data-testid="trigger">Open</SheetTrigger>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Sheet Title</SheetTitle>
            <SheetDescription>Sheet description</SheetDescription>
          </SheetHeader>
        </SheetContent>
      </Sheet>,
    );

    expect(screen.queryByText("Sheet Title")).toBeNull();

    await user.click(screen.getByTestId("trigger"));

    await waitFor(() => {
      expect(screen.getByText("Sheet Title")).toBeDefined();
      expect(screen.getByText("Sheet description")).toBeDefined();
    });
  });

  it("closes sheet when close button is clicked", async () => {
    const user = userEvent.setup();

    render(
      <Sheet>
        <SheetTrigger data-testid="trigger">Open</SheetTrigger>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Sheet Title</SheetTitle>
          </SheetHeader>
        </SheetContent>
      </Sheet>,
    );

    await user.click(screen.getByTestId("trigger"));

    await waitFor(() => {
      expect(screen.getByText("Sheet Title")).toBeDefined();
    });

    // Click the close button (has sr-only text "Close")
    const closeButton = screen.getByText("Close").closest("button");
    expect(closeButton).toBeDefined();
    await user.click(closeButton!);

    await waitFor(() => {
      expect(screen.queryByText("Sheet Title")).toBeNull();
    });
  });

  it("calls onOpenChange when sheet state changes", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();

    render(
      <Sheet onOpenChange={onOpenChange}>
        <SheetTrigger data-testid="trigger">Open</SheetTrigger>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Sheet Title</SheetTitle>
          </SheetHeader>
        </SheetContent>
      </Sheet>,
    );

    await user.click(screen.getByTestId("trigger"));

    await waitFor(() => {
      // Base UI calls onOpenChange with (open, eventDetails)
      expect(onOpenChange).toHaveBeenCalled();
      expect(onOpenChange.mock.calls[0][0]).toBe(true);
    });
  });

  it("renders sheet on the right side by default", async () => {
    const user = userEvent.setup();

    render(
      <Sheet>
        <SheetTrigger data-testid="trigger">Open</SheetTrigger>
        <SheetContent data-testid="content">
          <SheetHeader>
            <SheetTitle>Sheet Title</SheetTitle>
          </SheetHeader>
        </SheetContent>
      </Sheet>,
    );

    await user.click(screen.getByTestId("trigger"));

    await waitFor(() => {
      const content = screen.getByTestId("content");
      expect(content.className).toContain("right-0");
    });
  });

  it("renders sheet on the left side when specified", async () => {
    const user = userEvent.setup();

    render(
      <Sheet>
        <SheetTrigger data-testid="trigger">Open</SheetTrigger>
        <SheetContent side="left" data-testid="content">
          <SheetHeader>
            <SheetTitle>Sheet Title</SheetTitle>
          </SheetHeader>
        </SheetContent>
      </Sheet>,
    );

    await user.click(screen.getByTestId("trigger"));

    await waitFor(() => {
      const content = screen.getByTestId("content");
      expect(content.className).toContain("left-0");
    });
  });

  it("renders SheetFooter", async () => {
    const user = userEvent.setup();

    render(
      <Sheet>
        <SheetTrigger data-testid="trigger">Open</SheetTrigger>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Sheet Title</SheetTitle>
          </SheetHeader>
          <SheetFooter>
            <button>Submit</button>
          </SheetFooter>
        </SheetContent>
      </Sheet>,
    );

    await user.click(screen.getByTestId("trigger"));

    await waitFor(() => {
      expect(screen.getByText("Submit")).toBeDefined();
    });
  });

  it("closes sheet when pressing Escape", async () => {
    const user = userEvent.setup();

    render(
      <Sheet>
        <SheetTrigger data-testid="trigger">Open</SheetTrigger>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Sheet Title</SheetTitle>
          </SheetHeader>
        </SheetContent>
      </Sheet>,
    );

    await user.click(screen.getByTestId("trigger"));

    await waitFor(() => {
      expect(screen.getByText("Sheet Title")).toBeDefined();
    });

    await user.keyboard("{Escape}");

    await waitFor(() => {
      expect(screen.queryByText("Sheet Title")).toBeNull();
    });
  });
});
