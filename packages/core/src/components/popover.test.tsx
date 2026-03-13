import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Popover } from "./popover";

afterEach(() => {
  cleanup();
});

describe("Popover", () => {
  it("renders trigger", () => {
    render(
      <Popover.Root>
        <Popover.Trigger data-testid="trigger">Open</Popover.Trigger>
        <Popover.Content>Popover content</Popover.Content>
      </Popover.Root>,
    );

    expect(screen.getByTestId("trigger")).toBeDefined();
    expect(screen.getByText("Open")).toBeDefined();
  });

  it("opens popover when trigger is clicked", async () => {
    const user = userEvent.setup();

    render(
      <Popover.Root>
        <Popover.Trigger data-testid="trigger">Open</Popover.Trigger>
        <Popover.Content>Popover content</Popover.Content>
      </Popover.Root>,
    );

    expect(screen.queryByText("Popover content")).toBeNull();

    await user.click(screen.getByTestId("trigger"));

    await waitFor(() => {
      expect(screen.getByText("Popover content")).toBeDefined();
    });
  });

  it("closes popover when trigger is clicked again", async () => {
    const user = userEvent.setup();

    render(
      <Popover.Root>
        <Popover.Trigger data-testid="trigger">Open</Popover.Trigger>
        <Popover.Content>Popover content</Popover.Content>
      </Popover.Root>,
    );

    await user.click(screen.getByTestId("trigger"));

    await waitFor(() => {
      expect(screen.getByText("Popover content")).toBeDefined();
    });

    await user.click(screen.getByTestId("trigger"));

    await waitFor(() => {
      expect(screen.queryByText("Popover content")).toBeNull();
    });
  });

  it("closes popover when close button is clicked", async () => {
    const user = userEvent.setup();

    render(
      <Popover.Root>
        <Popover.Trigger data-testid="trigger">Open</Popover.Trigger>
        <Popover.Content>
          <p>Popover content</p>
          <Popover.Close data-testid="close">Close</Popover.Close>
        </Popover.Content>
      </Popover.Root>,
    );

    await user.click(screen.getByTestId("trigger"));

    await waitFor(() => {
      expect(screen.getByText("Popover content")).toBeDefined();
    });

    await user.click(screen.getByTestId("close"));

    await waitFor(() => {
      expect(screen.queryByText("Popover content")).toBeNull();
    });
  });

  it("renders with defaultOpen", async () => {
    render(
      <Popover.Root defaultOpen>
        <Popover.Trigger>Open</Popover.Trigger>
        <Popover.Content>Popover content</Popover.Content>
      </Popover.Root>,
    );

    await waitFor(() => {
      expect(screen.getByText("Popover content")).toBeDefined();
    });
  });

  it("applies custom className to content", async () => {
    const user = userEvent.setup();

    render(
      <Popover.Root>
        <Popover.Trigger data-testid="trigger">Open</Popover.Trigger>
        <Popover.Content className="custom-class" data-testid="content">
          Content
        </Popover.Content>
      </Popover.Root>,
    );

    await user.click(screen.getByTestId("trigger"));

    await waitFor(() => {
      expect(screen.getByTestId("content").classList.contains("custom-class")).toBe(true);
    });
  });
});
