import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AlertDialog } from "./alert-dialog";

afterEach(() => {
  cleanup();
});

describe("AlertDialog", () => {
  it("renders trigger button", () => {
    render(
      <AlertDialog.Root>
        <AlertDialog.Trigger data-testid="trigger">Delete</AlertDialog.Trigger>
        <AlertDialog.Content>
          <AlertDialog.Header>
            <AlertDialog.Title>Confirm</AlertDialog.Title>
          </AlertDialog.Header>
        </AlertDialog.Content>
      </AlertDialog.Root>,
    );

    expect(screen.getByTestId("trigger")).toBeDefined();
    expect(screen.getByText("Delete")).toBeDefined();
  });

  it("opens dialog when trigger is clicked", async () => {
    const user = userEvent.setup();

    render(
      <AlertDialog.Root>
        <AlertDialog.Trigger data-testid="trigger">Delete</AlertDialog.Trigger>
        <AlertDialog.Content>
          <AlertDialog.Header>
            <AlertDialog.Title>Are you sure?</AlertDialog.Title>
            <AlertDialog.Description>
              This action cannot be undone.
            </AlertDialog.Description>
          </AlertDialog.Header>
        </AlertDialog.Content>
      </AlertDialog.Root>,
    );

    expect(screen.queryByText("Are you sure?")).toBeNull();

    await user.click(screen.getByTestId("trigger"));

    await waitFor(() => {
      expect(screen.getByText("Are you sure?")).toBeDefined();
      expect(screen.getByText("This action cannot be undone.")).toBeDefined();
    });
  });

  it("closes dialog when cancel is clicked", async () => {
    const user = userEvent.setup();

    render(
      <AlertDialog.Root>
        <AlertDialog.Trigger data-testid="trigger">Delete</AlertDialog.Trigger>
        <AlertDialog.Content>
          <AlertDialog.Header>
            <AlertDialog.Title>Are you sure?</AlertDialog.Title>
          </AlertDialog.Header>
          <AlertDialog.Footer>
            <AlertDialog.Cancel data-testid="cancel">Cancel</AlertDialog.Cancel>
          </AlertDialog.Footer>
        </AlertDialog.Content>
      </AlertDialog.Root>,
    );

    await user.click(screen.getByTestId("trigger"));

    await waitFor(() => {
      expect(screen.getByText("Are you sure?")).toBeDefined();
    });

    await user.click(screen.getByTestId("cancel"));

    await waitFor(() => {
      expect(screen.queryByText("Are you sure?")).toBeNull();
    });
  });

  it("renders action and cancel buttons in footer", async () => {
    const user = userEvent.setup();
    const onAction = vi.fn();

    render(
      <AlertDialog.Root>
        <AlertDialog.Trigger data-testid="trigger">Delete</AlertDialog.Trigger>
        <AlertDialog.Content>
          <AlertDialog.Header>
            <AlertDialog.Title>Confirm</AlertDialog.Title>
          </AlertDialog.Header>
          <AlertDialog.Footer>
            <AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
            <AlertDialog.Action data-testid="action" onClick={onAction}>
              Continue
            </AlertDialog.Action>
          </AlertDialog.Footer>
        </AlertDialog.Content>
      </AlertDialog.Root>,
    );

    await user.click(screen.getByTestId("trigger"));

    await waitFor(() => {
      expect(screen.getByText("Cancel")).toBeDefined();
      expect(screen.getByText("Continue")).toBeDefined();
    });

    await user.click(screen.getByTestId("action"));

    expect(onAction).toHaveBeenCalledTimes(1);
  });

  it("applies custom className to content", async () => {
    const user = userEvent.setup();

    render(
      <AlertDialog.Root>
        <AlertDialog.Trigger data-testid="trigger">Open</AlertDialog.Trigger>
        <AlertDialog.Content className="custom-class" data-testid="content">
          <AlertDialog.Header>
            <AlertDialog.Title>Title</AlertDialog.Title>
          </AlertDialog.Header>
        </AlertDialog.Content>
      </AlertDialog.Root>,
    );

    await user.click(screen.getByTestId("trigger"));

    await waitFor(() => {
      expect(
        screen.getByTestId("content").classList.contains("custom-class"),
      ).toBe(true);
    });
  });
});
