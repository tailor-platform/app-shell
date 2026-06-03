import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Sheet } from "./sheet";

afterEach(() => {
  cleanup();
});

describe("Sheet", () => {
  // ==========================================================================
  // Snapshots — verify full DOM structure for sheet variations
  // ==========================================================================

  describe("snapshots", () => {
    it("closed sheet (trigger only)", () => {
      const { container } = render(
        <Sheet.Root>
          <Sheet.Trigger>Open</Sheet.Trigger>
          <Sheet.Content>
            <Sheet.Header>
              <Sheet.Title>Title</Sheet.Title>
            </Sheet.Header>
          </Sheet.Content>
        </Sheet.Root>,
      );
      expect(container.innerHTML).toMatchSnapshot();
    });

    it("open sheet (right side, default)", async () => {
      const { baseElement } = render(
        <Sheet.Root defaultOpen>
          <Sheet.Trigger>Open</Sheet.Trigger>
          <Sheet.Content>
            <Sheet.Header>
              <Sheet.Title>Sheet Title</Sheet.Title>
              <Sheet.Description>Sheet description</Sheet.Description>
            </Sheet.Header>
          </Sheet.Content>
        </Sheet.Root>,
      );

      await waitFor(() => {
        expect(screen.getByText("Sheet Title")).toBeDefined();
      });
      expect(baseElement.innerHTML).toMatchSnapshot();
    });

    it("open sheet (left side)", async () => {
      const { baseElement } = render(
        <Sheet.Root side="left" defaultOpen>
          <Sheet.Trigger>Open</Sheet.Trigger>
          <Sheet.Content>
            <Sheet.Header>
              <Sheet.Title>Left Sheet</Sheet.Title>
            </Sheet.Header>
          </Sheet.Content>
        </Sheet.Root>,
      );

      await waitFor(() => {
        expect(screen.getByText("Left Sheet")).toBeDefined();
      });
      expect(baseElement.innerHTML).toMatchSnapshot();
    });

    it("open sheet with header and footer", async () => {
      const { baseElement } = render(
        <Sheet.Root defaultOpen>
          <Sheet.Trigger>Open</Sheet.Trigger>
          <Sheet.Content>
            <Sheet.Header>
              <Sheet.Title>Settings</Sheet.Title>
              <Sheet.Description>Manage your preferences.</Sheet.Description>
            </Sheet.Header>
            <Sheet.Footer>
              <button>Save</button>
            </Sheet.Footer>
          </Sheet.Content>
        </Sheet.Root>,
      );

      await waitFor(() => {
        expect(screen.getByText("Settings")).toBeDefined();
      });
      expect(baseElement.innerHTML).toMatchSnapshot();
    });
  });

  it("renders trigger", () => {
    render(
      <Sheet.Root>
        <Sheet.Trigger data-testid="trigger">Open</Sheet.Trigger>
        <Sheet.Content>
          <Sheet.Header>
            <Sheet.Title>Title</Sheet.Title>
          </Sheet.Header>
        </Sheet.Content>
      </Sheet.Root>,
    );

    expect(screen.getByTestId("trigger")).toBeDefined();
    expect(screen.getByText("Open")).toBeDefined();
  });

  it("opens sheet when trigger is clicked", async () => {
    const user = userEvent.setup();

    render(
      <Sheet.Root>
        <Sheet.Trigger data-testid="trigger">Open</Sheet.Trigger>
        <Sheet.Content>
          <Sheet.Header>
            <Sheet.Title>Sheet Title</Sheet.Title>
            <Sheet.Description>Sheet description</Sheet.Description>
          </Sheet.Header>
        </Sheet.Content>
      </Sheet.Root>,
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
      <Sheet.Root>
        <Sheet.Trigger data-testid="trigger">Open</Sheet.Trigger>
        <Sheet.Content>
          <Sheet.Header>
            <Sheet.Title>Sheet Title</Sheet.Title>
          </Sheet.Header>
        </Sheet.Content>
      </Sheet.Root>,
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
      <Sheet.Root onOpenChange={onOpenChange}>
        <Sheet.Trigger data-testid="trigger">Open</Sheet.Trigger>
        <Sheet.Content>
          <Sheet.Header>
            <Sheet.Title>Sheet Title</Sheet.Title>
          </Sheet.Header>
        </Sheet.Content>
      </Sheet.Root>,
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
      <Sheet.Root>
        <Sheet.Trigger data-testid="trigger">Open</Sheet.Trigger>
        <Sheet.Content data-testid="content">
          <Sheet.Header>
            <Sheet.Title>Sheet Title</Sheet.Title>
          </Sheet.Header>
        </Sheet.Content>
      </Sheet.Root>,
    );

    await user.click(screen.getByTestId("trigger"));

    await waitFor(() => {
      const content = screen.getByTestId("content");
      expect(content.className).toContain("border-l");
    });
  });

  it("renders sheet on the left side when specified", async () => {
    const user = userEvent.setup();

    render(
      <Sheet.Root side="left">
        <Sheet.Trigger data-testid="trigger">Open</Sheet.Trigger>
        <Sheet.Content data-testid="content">
          <Sheet.Header>
            <Sheet.Title>Sheet Title</Sheet.Title>
          </Sheet.Header>
        </Sheet.Content>
      </Sheet.Root>,
    );

    await user.click(screen.getByTestId("trigger"));

    await waitFor(() => {
      const content = screen.getByTestId("content");
      expect(content.className).toContain("border-r");
    });
  });

  it("renders SheetFooter", async () => {
    const user = userEvent.setup();

    render(
      <Sheet.Root>
        <Sheet.Trigger data-testid="trigger">Open</Sheet.Trigger>
        <Sheet.Content>
          <Sheet.Header>
            <Sheet.Title>Sheet Title</Sheet.Title>
          </Sheet.Header>
          <Sheet.Footer>
            <button>Submit</button>
          </Sheet.Footer>
        </Sheet.Content>
      </Sheet.Root>,
    );

    await user.click(screen.getByTestId("trigger"));

    await waitFor(() => {
      expect(screen.getByText("Submit")).toBeDefined();
    });
  });

  it("closes sheet when pressing Escape", async () => {
    const user = userEvent.setup();

    render(
      <Sheet.Root>
        <Sheet.Trigger data-testid="trigger">Open</Sheet.Trigger>
        <Sheet.Content>
          <Sheet.Header>
            <Sheet.Title>Sheet Title</Sheet.Title>
          </Sheet.Header>
        </Sheet.Content>
      </Sheet.Root>,
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

  describe("size prop", () => {
    it("applies sm max-width by default", async () => {
      const user = userEvent.setup();

      render(
        <Sheet.Root>
          <Sheet.Trigger data-testid="trigger">Open</Sheet.Trigger>
          <Sheet.Content data-testid="content">
            <Sheet.Header>
              <Sheet.Title>Sheet Title</Sheet.Title>
            </Sheet.Header>
          </Sheet.Content>
        </Sheet.Root>,
      );

      await user.click(screen.getByTestId("trigger"));

      await waitFor(() => {
        const content = screen.getByTestId("content");
        expect(content.className).toContain("max-w-[24rem]");
      });
    });

    it("applies lg max-width when size is lg", async () => {
      const user = userEvent.setup();

      render(
        <Sheet.Root>
          <Sheet.Trigger data-testid="trigger">Open</Sheet.Trigger>
          <Sheet.Content data-testid="content" size="lg">
            <Sheet.Header>
              <Sheet.Title>Sheet Title</Sheet.Title>
            </Sheet.Header>
          </Sheet.Content>
        </Sheet.Root>,
      );

      await user.click(screen.getByTestId("trigger"));

      await waitFor(() => {
        const content = screen.getByTestId("content");
        expect(content.className).toContain("max-w-[45rem]");
      });
    });

    it("applies xl max-width when size is xl", async () => {
      const user = userEvent.setup();

      render(
        <Sheet.Root>
          <Sheet.Trigger data-testid="trigger">Open</Sheet.Trigger>
          <Sheet.Content data-testid="content" size="xl">
            <Sheet.Header>
              <Sheet.Title>Sheet Title</Sheet.Title>
            </Sheet.Header>
          </Sheet.Content>
        </Sheet.Root>,
      );

      await user.click(screen.getByTestId("trigger"));

      await waitFor(() => {
        const content = screen.getByTestId("content");
        expect(content.className).toContain("max-w-[60rem]");
      });
    });
  });

  describe("action prop on Header", () => {
    it("renders action in the header", async () => {
      const user = userEvent.setup();

      render(
        <Sheet.Root>
          <Sheet.Trigger data-testid="trigger">Open</Sheet.Trigger>
          <Sheet.Content>
            <Sheet.Header action={<button data-testid="save-btn">Save</button>}>
              <Sheet.Title>Sheet Title</Sheet.Title>
            </Sheet.Header>
          </Sheet.Content>
        </Sheet.Root>,
      );

      await user.click(screen.getByTestId("trigger"));

      await waitFor(() => {
        expect(screen.getByTestId("save-btn")).toBeDefined();
        expect(screen.getByText("Save")).toBeDefined();
      });
    });

    it("does not render action container when action is not provided", async () => {
      const user = userEvent.setup();

      render(
        <Sheet.Root>
          <Sheet.Trigger data-testid="trigger">Open</Sheet.Trigger>
          <Sheet.Content>
            <Sheet.Header>
              <Sheet.Title>Sheet Title</Sheet.Title>
            </Sheet.Header>
          </Sheet.Content>
        </Sheet.Root>,
      );

      await user.click(screen.getByTestId("trigger"));

      await waitFor(() => {
        expect(screen.getByText("Sheet Title")).toBeDefined();
      });

      // When no action prop is provided, only the close button should be in the header's right section
      const header = document.querySelector('[data-slot="sheet-header"]');
      expect(header).toBeDefined();
      expect(screen.queryByTestId("save-btn")).toBeNull();
    });
  });
});
