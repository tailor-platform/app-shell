import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Autocomplete } from "./autocomplete";

afterEach(() => {
  cleanup();
});

const suggestions = ["Apple", "Banana", "Cherry", "Date", "Elderberry"];

function SimpleAutocomplete(props: {
  onValueChange?: (value: string, event: unknown) => void;
  defaultValue?: string;
  value?: string;
}) {
  return (
    <Autocomplete.Root {...props}>
      <Autocomplete.Input data-testid="input" placeholder="Type a fruit..." />
      <Autocomplete.Content>
        <Autocomplete.List>
          {suggestions.map((s) => (
            <Autocomplete.Item key={s} value={s}>
              {s}
            </Autocomplete.Item>
          ))}
          <Autocomplete.Empty>No suggestions</Autocomplete.Empty>
        </Autocomplete.List>
      </Autocomplete.Content>
    </Autocomplete.Root>
  );
}

describe("Autocomplete", () => {
  it("renders the input with placeholder", () => {
    render(<SimpleAutocomplete />);

    const input = screen.getByTestId("input");
    expect(input).toBeDefined();
    expect(input.getAttribute("placeholder")).toBe("Type a fruit...");
  });

  it("opens suggestions when the input is typed into", async () => {
    const user = userEvent.setup();

    render(<SimpleAutocomplete />);

    const input = screen.getByTestId("input");
    await user.click(input);
    await user.type(input, "A");

    await waitFor(() => {
      expect(screen.getByText("Apple")).toBeDefined();
    });
  });

  it("selects a suggestion on click", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();

    render(<SimpleAutocomplete onValueChange={onValueChange} />);

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

  it("allows free-form text input", async () => {
    const user = userEvent.setup();

    render(<SimpleAutocomplete />);

    const input = screen.getByTestId("input") as HTMLInputElement;
    await user.click(input);
    await user.type(input, "Custom value");

    expect(input.value).toBe("Custom value");
  });

  it("applies custom className to input", () => {
    render(
      <Autocomplete.Root>
        <Autocomplete.Input data-testid="input" className="custom-class" />
        <Autocomplete.Content>
          <Autocomplete.List>
            <Autocomplete.Item value="a">Apple</Autocomplete.Item>
          </Autocomplete.List>
        </Autocomplete.Content>
      </Autocomplete.Root>,
    );

    expect(screen.getByTestId("input").classList.contains("custom-class")).toBe(
      true,
    );
  });

  it("renders the trigger with default icon", () => {
    render(
      <Autocomplete.Root>
        <div style={{ position: "relative" }}>
          <Autocomplete.Input data-testid="input" />
          <Autocomplete.Trigger data-testid="trigger" />
        </div>
        <Autocomplete.Content>
          <Autocomplete.List>
            <Autocomplete.Item value="a">Apple</Autocomplete.Item>
          </Autocomplete.List>
        </Autocomplete.Content>
      </Autocomplete.Root>,
    );

    expect(screen.getByTestId("trigger")).toBeDefined();
  });

  it("renders the clear button", () => {
    render(
      <Autocomplete.Root defaultValue="Apple">
        <div style={{ position: "relative" }}>
          <Autocomplete.Input data-testid="input" />
          <Autocomplete.Clear data-testid="clear" />
        </div>
        <Autocomplete.Content>
          <Autocomplete.List>
            <Autocomplete.Item value="Apple">Apple</Autocomplete.Item>
          </Autocomplete.List>
        </Autocomplete.Content>
      </Autocomplete.Root>,
    );

    expect(screen.getByTestId("clear")).toBeDefined();
  });

  it("renders with a default value", () => {
    render(<SimpleAutocomplete defaultValue="Cherry" />);

    const input = screen.getByTestId("input") as HTMLInputElement;
    expect(input.value).toBe("Cherry");
  });
});
