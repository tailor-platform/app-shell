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
});
