import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor, renderHook, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AutocompleteParts } from "./autocomplete";

const Autocomplete = { Parts: AutocompleteParts };

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
    <Autocomplete.Parts.Root {...props}>
      <Autocomplete.Parts.InputGroup>
        <Autocomplete.Parts.Input data-testid="input" placeholder="Type a fruit..." />
        <Autocomplete.Parts.Clear />
        <Autocomplete.Parts.Trigger />
      </Autocomplete.Parts.InputGroup>
      <Autocomplete.Parts.Content>
        <Autocomplete.Parts.List>
          {suggestions.map((s) => (
            <Autocomplete.Parts.Item key={s} value={s}>
              {s}
            </Autocomplete.Parts.Item>
          ))}
          <Autocomplete.Parts.Empty>No suggestions</Autocomplete.Parts.Empty>
        </Autocomplete.Parts.List>
      </Autocomplete.Parts.Content>
    </Autocomplete.Parts.Root>
  );
}

describe("Autocomplete.Parts", () => {
  // ==========================================================================
  // Snapshots — verify full DOM structure for autocomplete variations
  // ==========================================================================

  describe("snapshots", () => {
    it("closed autocomplete with placeholder", () => {
      const { container } = render(<SimpleAutocomplete />);
      expect(container.innerHTML).toMatchSnapshot();
    });

    it("open autocomplete", async () => {
      const user = userEvent.setup();
      const { baseElement } = render(<SimpleAutocomplete />);
      const input = screen.getByTestId("input");
      await user.click(input);
      await user.type(input, "a");
      await waitFor(() => {
        expect(screen.getByText("Apple")).toBeDefined();
      });
      expect(baseElement.innerHTML).toMatchSnapshot();
    });

    it("with groups", () => {
      const { container } = render(
        <Autocomplete.Parts.Root>
          <Autocomplete.Parts.Input placeholder="Search..." />
          <Autocomplete.Parts.Content>
            <Autocomplete.Parts.List>
              <Autocomplete.Parts.Group>
                <Autocomplete.Parts.GroupLabel>Fruits</Autocomplete.Parts.GroupLabel>
                <Autocomplete.Parts.Item value="apple">Apple</Autocomplete.Parts.Item>
              </Autocomplete.Parts.Group>
            </Autocomplete.Parts.List>
          </Autocomplete.Parts.Content>
        </Autocomplete.Parts.Root>,
      );
      expect(container.innerHTML).toMatchSnapshot();
    });
  });

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
      <Autocomplete.Parts.Root>
        <Autocomplete.Parts.Input data-testid="input" className="custom-class" />
        <Autocomplete.Parts.Content>
          <Autocomplete.Parts.List>
            <Autocomplete.Parts.Item value="a">Apple</Autocomplete.Parts.Item>
          </Autocomplete.Parts.List>
        </Autocomplete.Parts.Content>
      </Autocomplete.Parts.Root>,
    );

    expect(screen.getByTestId("input").classList.contains("custom-class")).toBe(true);
  });

  it("renders the trigger with default icon", () => {
    render(
      <Autocomplete.Parts.Root>
        <div style={{ position: "relative" }}>
          <Autocomplete.Parts.Input data-testid="input" />
          <Autocomplete.Parts.Trigger data-testid="trigger" />
        </div>
        <Autocomplete.Parts.Content>
          <Autocomplete.Parts.List>
            <Autocomplete.Parts.Item value="a">Apple</Autocomplete.Parts.Item>
          </Autocomplete.Parts.List>
        </Autocomplete.Parts.Content>
      </Autocomplete.Parts.Root>,
    );

    expect(screen.getByTestId("trigger")).toBeDefined();
  });

  it("renders the clear button", () => {
    render(
      <Autocomplete.Parts.Root defaultValue="Apple">
        <div style={{ position: "relative" }}>
          <Autocomplete.Parts.Input data-testid="input" />
          <Autocomplete.Parts.Clear data-testid="clear" />
        </div>
        <Autocomplete.Parts.Content>
          <Autocomplete.Parts.List>
            <Autocomplete.Parts.Item value="Apple">Apple</Autocomplete.Parts.Item>
          </Autocomplete.Parts.List>
        </Autocomplete.Parts.Content>
      </Autocomplete.Parts.Root>,
    );

    expect(screen.getByTestId("clear")).toBeDefined();
  });

  it("renders with a default value", () => {
    render(<SimpleAutocomplete defaultValue="Cherry" />);

    const input = screen.getByTestId("input") as HTMLInputElement;
    expect(input.value).toBe("Cherry");
  });
});

// ============================================================================
// Autocomplete.Parts.useAsync tests
// ============================================================================

describe("Autocomplete.Parts.useAsync", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  /** Advance timers and flush microtasks. */
  async function advanceAndFlush(ms: number) {
    await act(async () => {
      vi.advanceTimersByTime(ms);
    });
  }

  it("returns correct shape with mapped property names", () => {
    const fetcher = vi.fn(async () => []);
    const { result } = renderHook(() => Autocomplete.Parts.useAsync({ fetcher }));

    // Should use `value` (not `query`) and `onValueChange` (not `onInputValueChange`)
    expect(result.current).toHaveProperty("items");
    expect(result.current).toHaveProperty("loading");
    expect(result.current).toHaveProperty("value");
    expect(result.current).toHaveProperty("error");
    expect(result.current).toHaveProperty("onValueChange");
    expect(result.current).not.toHaveProperty("query");
    expect(result.current).not.toHaveProperty("onInputValueChange");
  });

  it("maps value from internal query state", () => {
    const fetcher = vi.fn(async () => []);
    const { result } = renderHook(() => Autocomplete.Parts.useAsync({ fetcher }));

    act(() => {
      result.current.onValueChange("hello");
    });

    expect(result.current.value).toBe("hello");
  });

  it("fetches items after debounce", async () => {
    const items = ["Apple", "Apricot"];
    const fetcher = vi.fn(async () => items);
    const { result } = renderHook(() => Autocomplete.Parts.useAsync({ fetcher }));

    act(() => {
      result.current.onValueChange("ap");
    });

    expect(result.current.loading).toBe(true);

    await advanceAndFlush(300);

    expect(fetcher).toHaveBeenCalledWith(
      "ap",
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
    expect(result.current.items).toEqual(items);
    expect(result.current.loading).toBe(false);
  });

  it("respects custom debounceMs via object fetcher", async () => {
    const fetcher = vi.fn(async () => ["a"]);
    const { result } = renderHook(() =>
      Autocomplete.Parts.useAsync({
        fetcher: { fn: fetcher, debounceMs: 500 },
      }),
    );

    act(() => {
      result.current.onValueChange("test");
    });

    await advanceAndFlush(300);
    expect(fetcher).not.toHaveBeenCalled();

    await advanceAndFlush(200);
    expect(fetcher).toHaveBeenCalledOnce();
  });

  it("calls fetcher with null when value is empty", async () => {
    const fetcher = vi.fn(async (_q: string | null) => (_q === null ? [] : ["a", "b"]));
    const { result } = renderHook(() => Autocomplete.Parts.useAsync({ fetcher }));

    act(() => {
      result.current.onValueChange("test");
    });
    await advanceAndFlush(300);
    expect(result.current.items).toEqual(["a", "b"]);

    act(() => {
      result.current.onValueChange("");
    });
    await advanceAndFlush(0);
    expect(fetcher).toHaveBeenLastCalledWith(null, expect.anything());
  });

  it("captures fetcher errors", async () => {
    const error = new Error("Network error");
    const fetcher = vi.fn(async () => {
      throw error;
    });
    const { result } = renderHook(() => Autocomplete.Parts.useAsync({ fetcher }));

    act(() => {
      result.current.onValueChange("test");
    });
    await advanceAndFlush(300);

    expect(result.current.error).toBe(error);
    expect(result.current.items).toEqual([]);
  });

  it("cancels previous request on new input", async () => {
    let capturedSignals: AbortSignal[] = [];
    const fetcher = vi.fn(async (_q: string | null, opts: { signal: AbortSignal }) => {
      capturedSignals.push(opts.signal);
      return new Promise<string[]>((resolve) => {
        setTimeout(() => resolve([_q ?? ""]), 200);
      });
    });

    const { result } = renderHook(() => Autocomplete.Parts.useAsync({ fetcher }));

    act(() => {
      result.current.onValueChange("first");
    });
    await advanceAndFlush(300);

    act(() => {
      result.current.onValueChange("second");
    });
    await advanceAndFlush(300);

    expect(capturedSignals[0].aborted).toBe(true);
  });

  it("calls fetcher with null for whitespace-only input", async () => {
    const fetcher = vi.fn(async () => []);
    const { result } = renderHook(() => Autocomplete.Parts.useAsync({ fetcher }));

    act(() => {
      result.current.onValueChange("   ");
    });
    await advanceAndFlush(0);

    expect(fetcher).toHaveBeenCalledWith(null, expect.anything());
  });
});
