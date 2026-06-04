import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Alert } from "./alert";

afterEach(() => {
  cleanup();
});

describe("Alert", () => {
  describe("snapshots", () => {
    it("neutral variant (default)", () => {
      const { container } = render(
        <Alert.Root>
          <Alert.Title>Title</Alert.Title>
          <Alert.Description>Description</Alert.Description>
        </Alert.Root>,
      );
      expect(container.innerHTML).toMatchSnapshot();
    });

    it("success variant", () => {
      const { container } = render(
        <Alert.Root variant="success">
          <Alert.Title>Success</Alert.Title>
          <Alert.Description>Operation completed</Alert.Description>
        </Alert.Root>,
      );
      expect(container.innerHTML).toMatchSnapshot();
    });

    it("error variant", () => {
      const { container } = render(
        <Alert.Root variant="error">
          <Alert.Title>Error</Alert.Title>
          <Alert.Description>Something went wrong</Alert.Description>
        </Alert.Root>,
      );
      expect(container.innerHTML).toMatchSnapshot();
    });

    it("warning variant", () => {
      const { container } = render(
        <Alert.Root variant="warning">
          <Alert.Title>Warning</Alert.Title>
          <Alert.Description>Be careful</Alert.Description>
        </Alert.Root>,
      );
      expect(container.innerHTML).toMatchSnapshot();
    });

    it("info variant", () => {
      const { container } = render(
        <Alert.Root variant="info">
          <Alert.Title>Info</Alert.Title>
          <Alert.Description>FYI</Alert.Description>
        </Alert.Root>,
      );
      expect(container.innerHTML).toMatchSnapshot();
    });

    it("with dismissible", () => {
      const { container } = render(
        <Alert.Root dismissible>
          <Alert.Title>Dismissible</Alert.Title>
          <Alert.Description>This can be dismissed</Alert.Description>
        </Alert.Root>,
      );
      expect(container.innerHTML).toMatchSnapshot();
    });
  });

  it("renders with role=alert", () => {
    render(<Alert.Root>Content</Alert.Root>);
    expect(screen.getByRole("alert")).toBeDefined();
  });

  it("renders title and description", () => {
    render(
      <Alert.Root>
        <Alert.Title>Test Title</Alert.Title>
        <Alert.Description>Test Description</Alert.Description>
      </Alert.Root>,
    );
    expect(screen.getByText("Test Title")).toBeDefined();
    expect(screen.getByText("Test Description")).toBeDefined();
  });

  it("accepts custom className", () => {
    render(<Alert.Root className="astw:mt-4">Content</Alert.Root>);
    const alert = screen.getByRole("alert");
    expect(alert.className).toContain("astw:mt-4");
  });

  it("dismisses when dismissible button is clicked", async () => {
    const user = userEvent.setup();
    const onDismiss = vi.fn();
    render(
      <Alert.Root dismissible onDismiss={onDismiss}>
        <Alert.Title>Dismissible</Alert.Title>
      </Alert.Root>,
    );
    expect(screen.getByRole("alert")).toBeDefined();
    await user.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(screen.queryByRole("alert")).toBeNull();
    expect(onDismiss).toHaveBeenCalledOnce();
  });

  it("renders actions area", () => {
    render(
      <Alert.Root>
        <Alert.Title>Action</Alert.Title>
        <Alert.Actions>
          <button type="button">Undo</button>
        </Alert.Actions>
      </Alert.Root>,
    );
    expect(screen.getByRole("button", { name: "Undo" })).toBeDefined();
  });
});
