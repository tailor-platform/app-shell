import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SelectParts as Select } from "./select";

afterEach(() => {
  cleanup();
});

describe("Select", () => {
  // ==========================================================================
  // Snapshots — verify full DOM structure for select variations
  // ==========================================================================

  describe("snapshots", () => {
    it("closed select with placeholder", () => {
      const { container } = render(
        <Select.Root>
          <Select.Trigger>
            <Select.Value placeholder="Pick one" />
          </Select.Trigger>
          <Select.Content>
            <Select.Item value="a">Apple</Select.Item>
            <Select.Item value="b">Banana</Select.Item>
          </Select.Content>
        </Select.Root>,
      );
      expect(container.innerHTML).toMatchSnapshot();
    });

    it("open select", async () => {
      const user = userEvent.setup();
      const { baseElement } = render(
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
      });
      expect(baseElement.innerHTML).toMatchSnapshot();
    });

    it("with groups and separator", async () => {
      const user = userEvent.setup();
      const { baseElement } = render(
        <Select.Root>
          <Select.Trigger data-testid="trigger">
            <Select.Value placeholder="Pick" />
          </Select.Trigger>
          <Select.Content>
            <Select.Group>
              <Select.GroupLabel>Fruits</Select.GroupLabel>
              <Select.Item value="apple">Apple</Select.Item>
            </Select.Group>
            <Select.Separator />
            <Select.Group>
              <Select.GroupLabel>Vegetables</Select.GroupLabel>
              <Select.Item value="carrot">Carrot</Select.Item>
            </Select.Group>
          </Select.Content>
        </Select.Root>,
      );

      await user.click(screen.getByTestId("trigger"));
      await waitFor(() => {
        expect(screen.getByText("Fruits")).toBeDefined();
      });
      expect(baseElement.innerHTML).toMatchSnapshot();
    });

    it("disabled select", () => {
      const { container } = render(
        <Select.Root disabled>
          <Select.Trigger>
            <Select.Value placeholder="Disabled" />
          </Select.Trigger>
          <Select.Content>
            <Select.Item value="a">Apple</Select.Item>
          </Select.Content>
        </Select.Root>,
      );
      expect(container.innerHTML).toMatchSnapshot();
    });

    it("disabled item", async () => {
      const user = userEvent.setup();
      const { baseElement } = render(
        <Select.Root>
          <Select.Trigger data-testid="trigger">
            <Select.Value placeholder="Pick" />
          </Select.Trigger>
          <Select.Content>
            <Select.Item value="a">Apple</Select.Item>
            <Select.Item value="b" disabled>
              Banana
            </Select.Item>
          </Select.Content>
        </Select.Root>,
      );

      await user.click(screen.getByTestId("trigger"));
      await waitFor(() => {
        expect(screen.getByText("Apple")).toBeDefined();
      });
      expect(baseElement.innerHTML).toMatchSnapshot();
    });
  });

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

  describe("popup height", () => {
    async function openPopup(contentClassName?: string) {
      const user = userEvent.setup();
      render(
        <Select.Root>
          <Select.Trigger data-testid="trigger">
            <Select.Value placeholder="Pick one" />
          </Select.Trigger>
          <Select.Content className={contentClassName}>
            <Select.Item value="a">Apple</Select.Item>
          </Select.Content>
        </Select.Root>,
      );
      await user.click(screen.getByTestId("trigger"));
      await waitFor(() => {
        expect(screen.getByText("Apple")).toBeDefined();
      });
      return document.querySelector<HTMLElement>('[data-slot="select-content"]')!;
    }

    it("caps the height to the available space and scrolls", async () => {
      const content = await openPopup();
      expect(content.className).toContain("astw:max-h-[min(var(--available-height),15rem)]");
      expect(content.className).toContain("astw:overflow-y-auto");
      expect(content.className).not.toContain("astw:overflow-hidden");
    });

    it("lets className replace the max height and overflow", async () => {
      const content = await openPopup("astw:max-h-96 astw:overflow-hidden");
      expect(content.className).toContain("astw:max-h-96");
      expect(content.className).toContain("astw:overflow-hidden");
      expect(content.className).not.toContain("astw:max-h-[min(var(--available-height),15rem)]");
      expect(content.className).not.toContain("astw:overflow-y-auto");
    });
  });
});
