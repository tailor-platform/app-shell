import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Autocomplete } from "./autocomplete-standalone";

afterEach(() => {
  cleanup();
});

const suggestions = ["Apple", "Banana", "Cherry", "Date", "Elderberry"];

describe("Autocomplete (standalone)", () => {
  // ==========================================================================
  // Snapshots — verify full DOM structure for standalone autocomplete
  // ==========================================================================

  describe("snapshots", () => {
    it("default with string items", () => {
      const { container } = render(<Autocomplete items={suggestions} placeholder="Type a fruit" />);
      expect(container.innerHTML).toMatchSnapshot();
    });

    it("with custom className", () => {
      const { container } = render(
        <Autocomplete items={suggestions} placeholder="Styled" className="custom-class" />,
      );
      expect(container.innerHTML).toMatchSnapshot();
    });

    it("with custom mapItem", () => {
      const items = [
        { id: "1", name: "Apple" },
        { id: "2", name: "Banana" },
      ];
      const { container } = render(
        <Autocomplete
          items={items}
          mapItem={(item) => ({ label: item.name, key: item.id })}
          placeholder="Pick"
        />,
      );
      expect(container.innerHTML).toMatchSnapshot();
    });
  });

  it("renders with placeholder", () => {
    render(<Autocomplete items={suggestions} placeholder="Type a fruit" />);
    const input = screen.getByRole("combobox");
    expect(input.getAttribute("placeholder")).toBe("Type a fruit");
  });

  it("shows suggestions when typing", async () => {
    const user = userEvent.setup();
    render(<Autocomplete items={suggestions} placeholder="Type..." />);
    const input = screen.getByRole("combobox");
    await user.click(input);
    await user.type(input, "App");
    await waitFor(() => {
      expect(screen.getByText("Apple")).toBeDefined();
    });
  });

  it("shows empty text when no items match", async () => {
    const user = userEvent.setup();
    render(<Autocomplete items={suggestions} placeholder="Type..." emptyText="Nothing found" />);
    const input = screen.getByRole("combobox");
    await user.click(input);
    await user.type(input, "zzz");
    await waitFor(() => {
      expect(screen.getByText("Nothing found")).toBeDefined();
    });
  });

  it("calls onValueChange when user types", async () => {
    const onValueChange = vi.fn();
    const user = userEvent.setup();
    render(
      <Autocomplete items={suggestions} placeholder="Type..." onValueChange={onValueChange} />,
    );
    const input = screen.getByRole("combobox");
    await user.click(input);
    await user.type(input, "B");
    await waitFor(() => {
      expect(onValueChange).toHaveBeenCalled();
    });
  });

  it("renders with custom mapItem for object items", async () => {
    const items = [
      { id: 1, name: "Red" },
      { id: 2, name: "Blue" },
    ];
    const user = userEvent.setup();
    render(
      <Autocomplete
        items={items}
        mapItem={(item) => ({ label: item.name })}
        placeholder="Pick color"
      />,
    );
    const input = screen.getByRole("combobox");
    await user.click(input);
    await user.type(input, "R");
    await waitFor(() => {
      expect(screen.getByText("Red")).toBeDefined();
    });
  });

  it("renders with custom renderItem via mapItem", async () => {
    const user = userEvent.setup();
    render(
      <Autocomplete
        items={suggestions}
        placeholder="Type..."
        mapItem={(item) => ({
          label: item,
          render: <span data-testid={`custom-${item}`}>{item}!</span>,
        })}
      />,
    );
    const input = screen.getByRole("combobox");
    await user.click(input);
    await user.type(input, "App");
    await waitFor(() => {
      expect(screen.getByTestId("custom-Apple")).toBeDefined();
    });
  });

  it("supports controlled value", () => {
    render(<Autocomplete items={suggestions} value="Cherry" placeholder="Type..." />);
    const input = screen.getByRole("combobox") as HTMLInputElement;
    expect(input.value).toBe("Cherry");
  });

  it("supports defaultValue", () => {
    render(<Autocomplete items={suggestions} defaultValue="Date" placeholder="Type..." />);
    const input = screen.getByRole("combobox") as HTMLInputElement;
    expect(input.value).toBe("Date");
  });

  it("applies className to container", () => {
    const { container } = render(
      <Autocomplete items={suggestions} className="my-class" placeholder="Type..." />,
    );
    expect((container.firstChild as HTMLElement).classList.contains("my-class")).toBe(true);
  });
});

describe("Autocomplete.Async (standalone)", () => {
  it("renders and calls fetcher on input", async () => {
    const fetcher = vi.fn().mockResolvedValue(["Result A", "Result B"]);
    const user = userEvent.setup();
    vi.useFakeTimers({ shouldAdvanceTime: true });

    render(<Autocomplete.Async fetcher={fetcher} placeholder="Search..." />);
    const input = screen.getByRole("combobox");
    await user.click(input);
    await user.type(input, "test");
    vi.advanceTimersByTime(300);
    await waitFor(() => {
      expect(fetcher).toHaveBeenCalled();
    });

    vi.useRealTimers();
  });

  it("applies className", () => {
    const fetcher = vi.fn().mockResolvedValue([]);
    const { container } = render(
      <Autocomplete.Async fetcher={fetcher} className="async-class" placeholder="Search..." />,
    );
    expect((container.firstChild as HTMLElement).classList.contains("async-class")).toBe(true);
  });

  it("calls onValueChange when input changes", async () => {
    const fetcher = vi.fn().mockResolvedValue([]);
    const onValueChange = vi.fn();
    const user = userEvent.setup();
    vi.useFakeTimers({ shouldAdvanceTime: true });

    render(
      <Autocomplete.Async
        fetcher={fetcher}
        onValueChange={onValueChange}
        placeholder="Search..."
      />,
    );
    const input = screen.getByRole("combobox");
    await user.click(input);
    await user.type(input, "a");
    vi.advanceTimersByTime(300);

    await waitFor(() => {
      expect(onValueChange).toHaveBeenCalled();
    });

    vi.useRealTimers();
  });
});

describe("Autocomplete (standalone, grouped)", () => {
  const groups = [
    { label: "Fruits", items: ["Apple", "Banana"] },
    { label: "Vegetables", items: ["Carrot", "Lettuce"] },
  ];

  it("renders with placeholder", () => {
    render(<Autocomplete items={groups} placeholder="Type..." />);
    const input = screen.getByRole("combobox");
    expect(input.getAttribute("placeholder")).toBe("Type...");
  });

  it("shows grouped items when typing", async () => {
    const user = userEvent.setup();
    render(<Autocomplete items={groups} placeholder="Type..." />);
    const input = screen.getByRole("combobox");
    await user.click(input);
    await user.type(input, "a");
    await waitFor(() => {
      expect(screen.getByText("Fruits")).toBeDefined();
      expect(screen.getByText("Apple")).toBeDefined();
      expect(screen.getByText("Banana")).toBeDefined();
    });
  });

  it("filters items across groups", async () => {
    const user = userEvent.setup();
    render(<Autocomplete items={groups} placeholder="Type..." />);
    const input = screen.getByRole("combobox");
    await user.click(input);
    await user.type(input, "Car");
    await waitFor(() => {
      expect(screen.getByText("Carrot")).toBeDefined();
      expect(screen.queryByText("Apple")).toBeNull();
    });
  });

  it("renders with object items and mapItem", async () => {
    const objectGroups = [
      {
        label: "Fruits",
        items: [
          { id: 1, name: "Apple" },
          { id: 2, name: "Banana" },
        ],
      },
      {
        label: "Vegetables",
        items: [
          { id: 3, name: "Carrot" },
          { id: 4, name: "Lettuce" },
        ],
      },
    ];
    const user = userEvent.setup();
    render(
      <Autocomplete
        items={objectGroups}
        mapItem={(item) => ({ label: item.name, key: String(item.id) })}
        placeholder="Type..."
      />,
    );
    const input = screen.getByRole("combobox");
    await user.click(input);
    await user.type(input, "a");
    await waitFor(() => {
      expect(screen.getByText("Apple")).toBeDefined();
      expect(screen.getByText("Banana")).toBeDefined();
    });
  });
});
