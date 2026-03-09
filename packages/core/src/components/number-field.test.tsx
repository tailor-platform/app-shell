import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NumberField } from "./number-field";

afterEach(() => {
  cleanup();
});

describe("NumberField", () => {
  it("renders the input", () => {
    render(
      <NumberField.Root>
        <NumberField.Group>
          <NumberField.Input data-testid="input" />
        </NumberField.Group>
      </NumberField.Root>,
    );

    expect(screen.getByTestId("input")).toBeDefined();
  });

  it("renders with a default value", () => {
    render(
      <NumberField.Root defaultValue={42}>
        <NumberField.Group>
          <NumberField.Input data-testid="input" />
        </NumberField.Group>
      </NumberField.Root>,
    );

    const input = screen.getByTestId("input") as HTMLInputElement;
    expect(input.value).toBe("42");
  });

  it("increments value when increment button is clicked", async () => {
    const user = userEvent.setup();

    render(
      <NumberField.Root defaultValue={5}>
        <NumberField.Group>
          <NumberField.Input data-testid="input" />
          <NumberField.Increment data-testid="increment" />
        </NumberField.Group>
      </NumberField.Root>,
    );

    const input = screen.getByTestId("input") as HTMLInputElement;
    expect(input.value).toBe("5");

    await user.click(screen.getByTestId("increment"));

    await waitFor(() => {
      expect(input.value).toBe("6");
    });
  });

  it("decrements value when decrement button is clicked", async () => {
    const user = userEvent.setup();

    render(
      <NumberField.Root defaultValue={5}>
        <NumberField.Group>
          <NumberField.Input data-testid="input" />
          <NumberField.Decrement data-testid="decrement" />
        </NumberField.Group>
      </NumberField.Root>,
    );

    const input = screen.getByTestId("input") as HTMLInputElement;
    expect(input.value).toBe("5");

    await user.click(screen.getByTestId("decrement"));

    await waitFor(() => {
      expect(input.value).toBe("4");
    });
  });

  it("calls onValueChange when value changes", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();

    render(
      <NumberField.Root defaultValue={0} onValueChange={onValueChange}>
        <NumberField.Group>
          <NumberField.Input data-testid="input" />
          <NumberField.Increment data-testid="increment" />
        </NumberField.Group>
      </NumberField.Root>,
    );

    await user.click(screen.getByTestId("increment"));

    await waitFor(() => {
      expect(onValueChange).toHaveBeenCalled();
    });
  });

  it("respects min and max constraints", async () => {
    const user = userEvent.setup();

    render(
      <NumberField.Root defaultValue={10} max={10}>
        <NumberField.Group>
          <NumberField.Input data-testid="input" />
          <NumberField.Increment data-testid="increment" />
        </NumberField.Group>
      </NumberField.Root>,
    );

    const input = screen.getByTestId("input") as HTMLInputElement;
    expect(input.value).toBe("10");

    await user.click(screen.getByTestId("increment"));

    await waitFor(() => {
      expect(input.value).toBe("10");
    });
  });

  it("applies custom className to root", () => {
    render(
      <NumberField.Root data-testid="root" className="custom-class">
        <NumberField.Group>
          <NumberField.Input />
        </NumberField.Group>
      </NumberField.Root>,
    );

    expect(screen.getByTestId("root").classList.contains("custom-class")).toBe(true);
  });
});
