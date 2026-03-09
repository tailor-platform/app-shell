import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Select } from "./select";

afterEach(() => {
  cleanup();
});

describe("Select", () => {
  it("renders trigger with placeholder", () => {
    render(
      <Select.Root>
        <Select.Trigger data-testid="trigger">
          <Select.Value placeholder="Pick one" />
        </Select.Trigger>
        <Select.Content>
          <Select.Item value="a">Apple</Select.Item>
          <Select.Item value="b">Banana</Select.Item>
        </Select.Content>
      </Select.Root>,
    );

    expect(screen.getByTestId("trigger")).toBeDefined();
    expect(screen.getByText("Pick one")).toBeDefined();
  });

  it("opens popup when trigger is clicked", async () => {
    const user = userEvent.setup();

    render(
      <Select.Root>
        <Select.Trigger data-testid="trigger">
          <Select.Value placeholder="Pick one" />
        </Select.Trigger>
        <Select.Content>
          <Select.Item value="a">Apple</Select.Item>
          <Select.Item value="b">Banana</Select.Item>
        </Select.Content>
      </Select.Root>,
    );

    await user.click(screen.getByTestId("trigger"));

    await waitFor(() => {
      expect(screen.getByText("Apple")).toBeDefined();
      expect(screen.getByText("Banana")).toBeDefined();
    });
  });

  it("selects an item on click", async () => {
    const user = userEvent.setup();

    render(
      <Select.Root>
        <Select.Trigger data-testid="trigger">
          <Select.Value placeholder="Pick one" />
        </Select.Trigger>
        <Select.Content>
          <Select.Item value="Apple">Apple</Select.Item>
          <Select.Item value="Banana">Banana</Select.Item>
        </Select.Content>
      </Select.Root>,
    );

    await user.click(screen.getByTestId("trigger"));

    await waitFor(() => {
      expect(screen.getByText("Apple")).toBeDefined();
    });

    await user.click(screen.getByText("Apple"));

    await waitFor(() => {
      expect(screen.getByTestId("trigger").textContent).toContain("Apple");
    });
  });

  it("calls onValueChange when an item is selected", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();

    render(
      <Select.Root onValueChange={onValueChange}>
        <Select.Trigger data-testid="trigger">
          <Select.Value placeholder="Pick one" />
        </Select.Trigger>
        <Select.Content>
          <Select.Item value="a">Apple</Select.Item>
          <Select.Item value="b">Banana</Select.Item>
        </Select.Content>
      </Select.Root>,
    );

    await user.click(screen.getByTestId("trigger"));

    await waitFor(() => {
      expect(screen.getByText("Banana")).toBeDefined();
    });

    await user.click(screen.getByText("Banana"));

    await waitFor(() => {
      expect(onValueChange).toHaveBeenCalledWith("b", expect.anything());
    });
  });

  it("renders with a controlled value", () => {
    render(
      <Select.Root value="Banana">
        <Select.Trigger data-testid="trigger">
          <Select.Value placeholder="Pick one" />
        </Select.Trigger>
        <Select.Content>
          <Select.Item value="Apple">Apple</Select.Item>
          <Select.Item value="Banana">Banana</Select.Item>
        </Select.Content>
      </Select.Root>,
    );

    expect(screen.getByTestId("trigger").textContent).toContain("Banana");
  });

  it("renders with a default value", () => {
    render(
      <Select.Root defaultValue="Apple">
        <Select.Trigger data-testid="trigger">
          <Select.Value placeholder="Pick one" />
        </Select.Trigger>
        <Select.Content>
          <Select.Item value="Apple">Apple</Select.Item>
          <Select.Item value="Banana">Banana</Select.Item>
        </Select.Content>
      </Select.Root>,
    );

    expect(screen.getByTestId("trigger").textContent).toContain("Apple");
  });

  it("renders groups with labels", async () => {
    const user = userEvent.setup();

    render(
      <Select.Root>
        <Select.Trigger data-testid="trigger">
          <Select.Value placeholder="Pick one" />
        </Select.Trigger>
        <Select.Content>
          <Select.Group>
            <Select.GroupLabel>Fruits</Select.GroupLabel>
            <Select.Item value="a">Apple</Select.Item>
          </Select.Group>
        </Select.Content>
      </Select.Root>,
    );

    await user.click(screen.getByTestId("trigger"));

    await waitFor(() => {
      expect(screen.getByText("Fruits")).toBeDefined();
      expect(screen.getByText("Apple")).toBeDefined();
    });
  });

  it("renders disabled trigger", () => {
    render(
      <Select.Root disabled>
        <Select.Trigger data-testid="trigger">
          <Select.Value placeholder="Pick one" />
        </Select.Trigger>
        <Select.Content>
          <Select.Item value="a">Apple</Select.Item>
        </Select.Content>
      </Select.Root>,
    );

    const trigger = screen.getByTestId("trigger");
    expect(trigger.hasAttribute("data-disabled")).toBe(true);
  });

  it("applies custom className to trigger", () => {
    render(
      <Select.Root>
        <Select.Trigger data-testid="trigger" className="custom-class">
          <Select.Value placeholder="Pick one" />
        </Select.Trigger>
        <Select.Content>
          <Select.Item value="a">Apple</Select.Item>
        </Select.Content>
      </Select.Root>,
    );

    expect(screen.getByTestId("trigger").classList.contains("custom-class")).toBe(true);
  });
});
