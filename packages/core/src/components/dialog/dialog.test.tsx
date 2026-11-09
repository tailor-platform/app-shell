import * as React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Dialog } from "./dialog";

afterEach(() => {
  cleanup();
});

const isPopup = (el: HTMLElement) => el.getAttribute("data-slot") === "dialog-content";

describe("Dialog", () => {
  // ==========================================================================
  // Snapshots — verify full DOM structure for dialog variations
  // ==========================================================================

  describe("snapshots", () => {
    it("closed dialog (trigger only)", () => {
      const { container } = render(
        <Dialog.Root>
          <Dialog.Trigger>Open</Dialog.Trigger>
          <Dialog.Content>
            <Dialog.Header>
              <Dialog.Title>Title</Dialog.Title>
            </Dialog.Header>
          </Dialog.Content>
        </Dialog.Root>,
      );
      expect(container.innerHTML).toMatchSnapshot();
    });

    it("open dialog with header", async () => {
      const { baseElement } = render(
        <Dialog.Root defaultOpen>
          <Dialog.Trigger>Open</Dialog.Trigger>
          <Dialog.Content>
            <Dialog.Header>
              <Dialog.Title>Dialog Title</Dialog.Title>
              <Dialog.Description>Dialog description text</Dialog.Description>
            </Dialog.Header>
          </Dialog.Content>
        </Dialog.Root>,
      );

      await waitFor(() => {
        expect(screen.getByText("Dialog Title")).toBeDefined();
      });
      expect(baseElement.innerHTML).toMatchSnapshot();
    });

    it("open dialog with header and footer", async () => {
      const { baseElement } = render(
        <Dialog.Root defaultOpen>
          <Dialog.Trigger>Open</Dialog.Trigger>
          <Dialog.Content>
            <Dialog.Header>
              <Dialog.Title>Confirm Action</Dialog.Title>
              <Dialog.Description>Are you sure?</Dialog.Description>
            </Dialog.Header>
            <Dialog.Footer>
              <button>Cancel</button>
              <button>Confirm</button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Root>,
      );

      await waitFor(() => {
        expect(screen.getByText("Confirm Action")).toBeDefined();
      });
      expect(baseElement.innerHTML).toMatchSnapshot();
    });
  });

  it("renders trigger", () => {
    render(
      <Dialog.Root>
        <Dialog.Trigger data-testid="trigger">Open</Dialog.Trigger>
        <Dialog.Content>
          <Dialog.Header>
            <Dialog.Title>Title</Dialog.Title>
          </Dialog.Header>
        </Dialog.Content>
      </Dialog.Root>,
    );

    expect(screen.getByTestId("trigger")).toBeDefined();
    expect(screen.getByText("Open")).toBeDefined();
  });

  it("opens dialog when trigger is clicked", async () => {
    const user = userEvent.setup();

    render(
      <Dialog.Root>
        <Dialog.Trigger data-testid="trigger">Open</Dialog.Trigger>
        <Dialog.Content>
          <Dialog.Header>
            <Dialog.Title>Dialog Title</Dialog.Title>
            <Dialog.Description>Dialog description</Dialog.Description>
          </Dialog.Header>
        </Dialog.Content>
      </Dialog.Root>,
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
      <Dialog.Root>
        <Dialog.Trigger data-testid="trigger">Open</Dialog.Trigger>
        <Dialog.Content>
          <Dialog.Header>
            <Dialog.Title>Dialog Title</Dialog.Title>
          </Dialog.Header>
        </Dialog.Content>
      </Dialog.Root>,
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
      <Dialog.Root onOpenChange={onOpenChange}>
        <Dialog.Trigger data-testid="trigger">Open</Dialog.Trigger>
        <Dialog.Content>
          <Dialog.Header>
            <Dialog.Title>Dialog Title</Dialog.Title>
          </Dialog.Header>
        </Dialog.Content>
      </Dialog.Root>,
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
      <Dialog.Root open={false} onOpenChange={onOpenChange}>
        <Dialog.Trigger data-testid="trigger">Open</Dialog.Trigger>
        <Dialog.Content>
          <Dialog.Header>
            <Dialog.Title>Dialog Title</Dialog.Title>
          </Dialog.Header>
        </Dialog.Content>
      </Dialog.Root>,
    );

    expect(screen.queryByText("Dialog Title")).toBeNull();

    rerender(
      <Dialog.Root open={true} onOpenChange={onOpenChange}>
        <Dialog.Trigger data-testid="trigger">Open</Dialog.Trigger>
        <Dialog.Content>
          <Dialog.Header>
            <Dialog.Title>Dialog Title</Dialog.Title>
          </Dialog.Header>
        </Dialog.Content>
      </Dialog.Root>,
    );

    await waitFor(() => {
      expect(screen.getByText("Dialog Title")).toBeDefined();
    });
  });

  it("renders DialogFooter", async () => {
    const user = userEvent.setup();

    render(
      <Dialog.Root>
        <Dialog.Trigger data-testid="trigger">Open</Dialog.Trigger>
        <Dialog.Content>
          <Dialog.Header>
            <Dialog.Title>Dialog Title</Dialog.Title>
          </Dialog.Header>
          <Dialog.Footer>
            <button>Submit</button>
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog.Root>,
    );

    await user.click(screen.getByTestId("trigger"));

    await waitFor(() => {
      expect(screen.getByText("Submit")).toBeDefined();
    });
  });

  it("closes dialog when pressing Escape", async () => {
    const user = userEvent.setup();

    render(
      <Dialog.Root>
        <Dialog.Trigger data-testid="trigger">Open</Dialog.Trigger>
        <Dialog.Content>
          <Dialog.Header>
            <Dialog.Title>Dialog Title</Dialog.Title>
          </Dialog.Header>
        </Dialog.Content>
      </Dialog.Root>,
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
  // jsdom has no layout, so these check the classes that keep a tall dialog
  // inside the viewport, and that a consumer className still replaces them.
  describe("height", () => {
    it("caps the height to the viewport and scrolls the content", async () => {
      render(
        <Dialog.Root defaultOpen>
          <Dialog.Content>
            <Dialog.Title>Tall</Dialog.Title>
          </Dialog.Content>
        </Dialog.Root>,
      );

      const content = await screen.findByRole("dialog");
      expect(content.className).toContain("astw:max-h-[calc(100dvh-2rem)]");
      expect(content.className).toContain("astw:overflow-y-auto");
    });

    it("lets className replace the max height and overflow", async () => {
      render(
        <Dialog.Root defaultOpen>
          <Dialog.Content className="astw:max-h-[85vh] astw:overflow-hidden">
            <Dialog.Title>Custom</Dialog.Title>
          </Dialog.Content>
        </Dialog.Root>,
      );

      const content = await screen.findByRole("dialog");
      expect(content.className).toContain("astw:max-h-[85vh]");
      expect(content.className).toContain("astw:overflow-hidden");
      expect(content.className).not.toContain("astw:max-h-[calc(100dvh-2rem)]");
      expect(content.className).not.toContain("astw:overflow-y-auto");
    });

    it("lets className switch to a flex column for a pinned header and footer", async () => {
      render(
        <Dialog.Root defaultOpen>
          <Dialog.Content className="astw:flex astw:flex-col">
            <Dialog.Title>Pinned</Dialog.Title>
          </Dialog.Content>
        </Dialog.Root>,
      );

      const content = await screen.findByRole("dialog");
      expect(content.className).toContain("astw:flex");
      expect(content.className).not.toMatch(/(^|\s)astw:grid(\s|$)/);
    });
  });
  // jsdom has no layout, so overflow is simulated by stubbing the popup's
  // scrollHeight and clientHeight, and the first control's position by
  // stubbing its rect: `firstControlTop` is relative to the popup's box.
  describe("initial focus", () => {
    const stubOverflow = (firstControlTop: number) => {
      vi.spyOn(HTMLElement.prototype, "scrollHeight", "get").mockImplementation(
        function (this: HTMLElement) {
          return isPopup(this) ? 1000 : 0;
        },
      );
      vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockImplementation(
        function (this: HTMLElement) {
          return isPopup(this) ? 500 : 0;
        },
      );
      vi.spyOn(HTMLElement.prototype, "getClientRects").mockImplementation(
        () => [{}] as unknown as DOMRectList,
      );
      vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(
        function (this: HTMLElement) {
          const top = isPopup(this) ? 0 : firstControlTop;
          const height = isPopup(this) ? 500 : 40;
          return { top, bottom: top + height } as DOMRect;
        },
      );
    };

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it("focuses the first control when the content fits", async () => {
      render(
        <Dialog.Root defaultOpen>
          <Dialog.Content>
            <Dialog.Title>Fits</Dialog.Title>
            <button>First</button>
          </Dialog.Content>
        </Dialog.Root>,
      );

      await waitFor(() => {
        expect(document.activeElement).toBe(screen.getByText("First"));
      });
    });

    it("focuses the first control when the content overflows but the control is in view", async () => {
      stubOverflow(100);
      render(
        <Dialog.Root defaultOpen>
          <Dialog.Content>
            <Dialog.Title>Tall form</Dialog.Title>
            <input aria-label="Name" />
          </Dialog.Content>
        </Dialog.Root>,
      );

      await waitFor(() => {
        expect(document.activeElement).toBe(screen.getByLabelText("Name"));
      });
    });

    it("focuses the dialog itself when the first control is below the fold, so it opens at the top", async () => {
      stubOverflow(900);
      render(
        <Dialog.Root defaultOpen>
          <Dialog.Content>
            <Dialog.Title>Tall</Dialog.Title>
            <button>First</button>
          </Dialog.Content>
        </Dialog.Root>,
      );

      const content = await screen.findByRole("dialog");
      await waitFor(() => {
        expect(document.activeElement).toBe(content);
      });
    });

    it("lets initialFocus override the default", async () => {
      stubOverflow(900);
      function Example() {
        const ref = React.useRef<HTMLButtonElement>(null);
        return (
          <Dialog.Root defaultOpen>
            <Dialog.Content initialFocus={ref}>
              <Dialog.Title>Tall</Dialog.Title>
              <button>First</button>
              <button ref={ref}>Second</button>
            </Dialog.Content>
          </Dialog.Root>
        );
      }
      render(<Example />);

      await waitFor(() => {
        expect(document.activeElement).toBe(screen.getByText("Second"));
      });
    });
  });
});
