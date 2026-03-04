import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Combobox } from "./combobox";

afterEach(() => {
  cleanup();
});

const fruits = ["Apple", "Banana", "Cherry", "Date", "Elderberry"];

function SimpleCombobox(props: {
  onValueChange?: (value: string | null, event: unknown) => void;
  defaultValue?: string;
  value?: string;
}) {
  return (
    <Combobox.Root {...props}>
      <Combobox.Input data-testid="input" placeholder="Search fruits..." />
      <Combobox.Content>
        <Combobox.List>
          {fruits.map((fruit) => (
            <Combobox.Item key={fruit} value={fruit}>
              {fruit}
            </Combobox.Item>
          ))}
          <Combobox.Empty>No results found</Combobox.Empty>
        </Combobox.List>
      </Combobox.Content>
    </Combobox.Root>
  );
}

describe("Combobox", () => {
  it("renders the input with placeholder", () => {
    render(<SimpleCombobox />);

    const input = screen.getByTestId("input");
    expect(input).toBeDefined();
    expect(input.getAttribute("placeholder")).toBe("Search fruits...");
  });

  it("opens popup when the input is focused and typed into", async () => {
    const user = userEvent.setup();

    render(<SimpleCombobox />);

    const input = screen.getByTestId("input");
    await user.click(input);
    await user.type(input, "A");

    await waitFor(() => {
      expect(screen.getByText("Apple")).toBeDefined();
    });
  });

  it("selects an item on click", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();

    render(<SimpleCombobox onValueChange={onValueChange} />);

    const input = screen.getByTestId("input");
    await user.click(input);
    await user.type(input, "B");

    await waitFor(() => {
      expect(screen.getByText("Banana")).toBeDefined();
    });

    await user.click(screen.getByText("Banana"));

    await waitFor(() => {
      expect(onValueChange).toHaveBeenCalled();
    });
  });

  it("applies custom className to input", () => {
    render(
      <Combobox.Root>
        <Combobox.Input data-testid="input" className="custom-class" />
        <Combobox.Content>
          <Combobox.List>
            <Combobox.Item value="a">Apple</Combobox.Item>
          </Combobox.List>
        </Combobox.Content>
      </Combobox.Root>,
    );

    expect(screen.getByTestId("input").classList.contains("custom-class")).toBe(
      true,
    );
  });

  it("renders groups with labels", async () => {
    const user = userEvent.setup();

    render(
      <Combobox.Root>
        <Combobox.Input data-testid="input" />
        <Combobox.Content>
          <Combobox.List>
            <Combobox.Group>
              <Combobox.GroupLabel>Fruits</Combobox.GroupLabel>
              <Combobox.Item value="apple">Apple</Combobox.Item>
            </Combobox.Group>
          </Combobox.List>
        </Combobox.Content>
      </Combobox.Root>,
    );

    const input = screen.getByTestId("input");
    await user.click(input);
    await user.type(input, "A");

    await waitFor(() => {
      expect(screen.getByText("Fruits")).toBeDefined();
      expect(screen.getByText("Apple")).toBeDefined();
    });
  });

  it("renders with a default value", () => {
    render(<SimpleCombobox defaultValue="Banana" />);

    const input = screen.getByTestId("input") as HTMLInputElement;
    expect(input.value).toBe("Banana");
  });

  it("renders the trigger with default icon", () => {
    render(
      <Combobox.Root>
        <div style={{ position: "relative" }}>
          <Combobox.Input data-testid="input" />
          <Combobox.Trigger data-testid="trigger" />
        </div>
        <Combobox.Content>
          <Combobox.List>
            <Combobox.Item value="a">Apple</Combobox.Item>
          </Combobox.List>
        </Combobox.Content>
      </Combobox.Root>,
    );

    expect(screen.getByTestId("trigger")).toBeDefined();
  });

  it("renders the clear button", () => {
    render(
      <Combobox.Root defaultValue="Apple">
        <div style={{ position: "relative" }}>
          <Combobox.Input data-testid="input" />
          <Combobox.Clear data-testid="clear" />
        </div>
        <Combobox.Content>
          <Combobox.List>
            <Combobox.Item value="Apple">Apple</Combobox.Item>
          </Combobox.List>
        </Combobox.Content>
      </Combobox.Root>,
    );

    expect(screen.getByTestId("clear")).toBeDefined();
  });
});
