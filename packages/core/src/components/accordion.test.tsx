import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Accordion } from "./accordion";

afterEach(() => {
  cleanup();
});

describe("Accordion", () => {
  it("renders triggers", () => {
    render(
      <Accordion.Root>
        <Accordion.Item>
          <Accordion.Trigger data-testid="trigger-1">Section 1</Accordion.Trigger>
          <Accordion.Content>Content 1</Accordion.Content>
        </Accordion.Item>
        <Accordion.Item>
          <Accordion.Trigger data-testid="trigger-2">Section 2</Accordion.Trigger>
          <Accordion.Content>Content 2</Accordion.Content>
        </Accordion.Item>
      </Accordion.Root>,
    );

    expect(screen.getByText("Section 1")).toBeDefined();
    expect(screen.getByText("Section 2")).toBeDefined();
  });

  it("expands content when trigger is clicked", async () => {
    const user = userEvent.setup();

    render(
      <Accordion.Root>
        <Accordion.Item>
          <Accordion.Trigger data-testid="trigger">Section</Accordion.Trigger>
          <Accordion.Content>Hidden content</Accordion.Content>
        </Accordion.Item>
      </Accordion.Root>,
    );

    expect(screen.queryByText("Hidden content")).toBeNull();

    await user.click(screen.getByTestId("trigger"));

    await waitFor(() => {
      expect(screen.getByText("Hidden content")).toBeDefined();
    });
  });

  it("collapses content when trigger is clicked again", async () => {
    const user = userEvent.setup();

    render(
      <Accordion.Root>
        <Accordion.Item>
          <Accordion.Trigger data-testid="trigger">Section</Accordion.Trigger>
          <Accordion.Content>Hidden content</Accordion.Content>
        </Accordion.Item>
      </Accordion.Root>,
    );

    await user.click(screen.getByTestId("trigger"));

    await waitFor(() => {
      expect(screen.getByText("Hidden content")).toBeDefined();
    });

    await user.click(screen.getByTestId("trigger"));

    await waitFor(() => {
      expect(screen.queryByText("Hidden content")).toBeNull();
    });
  });

  it("renders with defaultValue to open an item initially", async () => {
    render(
      <Accordion.Root defaultValue={["item-1"]}>
        <Accordion.Item value="item-1">
          <Accordion.Trigger>Section 1</Accordion.Trigger>
          <Accordion.Content>Content 1</Accordion.Content>
        </Accordion.Item>
        <Accordion.Item value="item-2">
          <Accordion.Trigger>Section 2</Accordion.Trigger>
          <Accordion.Content>Content 2</Accordion.Content>
        </Accordion.Item>
      </Accordion.Root>,
    );

    await waitFor(() => {
      expect(screen.getByText("Content 1")).toBeDefined();
    });
    expect(screen.queryByText("Content 2")).toBeNull();
  });

  it("allows multiple items open with openMultiple", async () => {
    const user = userEvent.setup();

    render(
      <Accordion.Root multiple>
        <Accordion.Item>
          <Accordion.Trigger data-testid="trigger-1">Section 1</Accordion.Trigger>
          <Accordion.Content>Content 1</Accordion.Content>
        </Accordion.Item>
        <Accordion.Item>
          <Accordion.Trigger data-testid="trigger-2">Section 2</Accordion.Trigger>
          <Accordion.Content>Content 2</Accordion.Content>
        </Accordion.Item>
      </Accordion.Root>,
    );

    await user.click(screen.getByTestId("trigger-1"));
    await user.click(screen.getByTestId("trigger-2"));

    await waitFor(() => {
      expect(screen.getByText("Content 1")).toBeDefined();
      expect(screen.getByText("Content 2")).toBeDefined();
    });
  });

  it("applies custom className to root", () => {
    render(
      <Accordion.Root data-testid="root" className="custom-class">
        <Accordion.Item>
          <Accordion.Trigger>Section</Accordion.Trigger>
          <Accordion.Content>Content</Accordion.Content>
        </Accordion.Item>
      </Accordion.Root>,
    );

    expect(screen.getByTestId("root").classList.contains("custom-class")).toBe(true);
  });
});
