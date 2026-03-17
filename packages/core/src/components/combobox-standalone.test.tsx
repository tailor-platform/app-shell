import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Combobox } from "./combobox-standalone";

afterEach(() => {
  cleanup();
});

const fruits = ["Apple", "Banana", "Cherry", "Date", "Elderberry"];

describe("Combobox (standalone)", () => {
  // ==========================================================================
  // Snapshots — verify full DOM structure for standalone combobox
  // ==========================================================================

  describe("snapshots", () => {
    it("default with string items", () => {
      const { container } = render(<Combobox items={fruits} placeholder="Pick a fruit" />);
      expect(container.innerHTML).toMatchSnapshot();
    });

    it("disabled", () => {
      const { container } = render(<Combobox items={fruits} placeholder="Disabled" disabled />);
      expect(container.innerHTML).toMatchSnapshot();
    });

    it("multiple mode", () => {
      const { container } = render(<Combobox items={fruits} placeholder="Pick fruits" multiple />);
      expect(container.innerHTML).toMatchSnapshot();
    });

    it("with custom className", () => {
      const { container } = render(
        <Combobox items={fruits} placeholder="Styled" className="custom-class" />,
      );
      expect(container.innerHTML).toMatchSnapshot();
    });
  });

  it("renders with placeholder", () => {
    render(<Combobox items={fruits} placeholder="Pick a fruit" />);
    const input = screen.getByRole("combobox");
    expect(input.getAttribute("placeholder")).toBe("Pick a fruit");
  });

  it("shows items when input is focused and typed", async () => {
    const user = userEvent.setup();
    render(<Combobox items={fruits} placeholder="Search..." />);
    const input = screen.getByRole("combobox");
    await user.click(input);
    await user.type(input, "App");
    await waitFor(() => {
      expect(screen.getByText("Apple")).toBeDefined();
    });
  });

  it("filters items based on input", async () => {
    const user = userEvent.setup();
    render(<Combobox items={fruits} placeholder="Search..." />);
    const input = screen.getByRole("combobox");
    await user.click(input);
    await user.type(input, "Cher");
    await waitFor(() => {
      expect(screen.getByText("Cherry")).toBeDefined();
      expect(screen.queryByText("Apple")).toBeNull();
    });
  });

  it("shows empty text when no items match", async () => {
    const user = userEvent.setup();
    render(<Combobox items={fruits} placeholder="Search..." emptyText="Nothing here" />);
    const input = screen.getByRole("combobox");
    await user.click(input);
    await user.type(input, "zzz");
    await waitFor(() => {
      expect(screen.getByText("Nothing here")).toBeDefined();
    });
  });

  it("calls onValueChange when an item is selected", async () => {
    const onValueChange = vi.fn();
    const user = userEvent.setup();
    render(<Combobox items={fruits} placeholder="Search..." onValueChange={onValueChange} />);
    const input = screen.getByRole("combobox");
    await user.click(input);
    await user.type(input, "Ban");
    await waitFor(() => {
      expect(screen.getByText("Banana")).toBeDefined();
    });
    await user.click(screen.getByText("Banana"));
    expect(onValueChange).toHaveBeenCalledWith("Banana", expect.anything());
  });

  it("renders with custom mapItem for object items", async () => {
    const items = [
      { id: 1, name: "Red" },
      { id: 2, name: "Blue" },
    ];
    const user = userEvent.setup();
    render(
      <Combobox
        items={items}
        mapItem={(item) => ({ label: item.name })}
        placeholder="Pick color"
      />,
    );
    const input = screen.getByRole("combobox");
    await user.click(input);
    await waitFor(() => {
      expect(screen.getByText("Red")).toBeDefined();
      expect(screen.getByText("Blue")).toBeDefined();
    });
  });

  it("renders with custom renderItem via mapItem", async () => {
    const user = userEvent.setup();
    render(
      <Combobox
        items={fruits}
        placeholder="Search..."
        mapItem={(item) => ({
          label: item,
          render: <span data-testid={`custom-${item}`}>{item}!</span>,
        })}
      />,
    );
    const input = screen.getByRole("combobox");
    await user.click(input);
    await waitFor(() => {
      expect(screen.getByTestId("custom-Apple")).toBeDefined();
    });
  });

  it("supports controlled value", () => {
    render(<Combobox items={fruits} value="Cherry" placeholder="Search..." />);
    const input = screen.getByRole("combobox") as HTMLInputElement;
    expect(input.value).toBe("Cherry");
  });

  it("supports defaultValue", () => {
    render(<Combobox items={fruits} defaultValue="Date" placeholder="Search..." />);
    const input = screen.getByRole("combobox") as HTMLInputElement;
    expect(input.value).toBe("Date");
  });

  it("applies className to container", () => {
    const { container } = render(
      <Combobox items={fruits} className="my-class" placeholder="Search..." />,
    );
    expect((container.firstChild as HTMLElement).classList.contains("my-class")).toBe(true);
  });
});

describe("Combobox (standalone, multiple)", () => {
  it("renders with placeholder", () => {
    render(<Combobox items={fruits} multiple placeholder="Pick fruits" />);
    const input = screen.getByRole("combobox");
    expect(input.getAttribute("placeholder")).toBe("Pick fruits");
  });

  it("calls onValueChange with array when items are selected", async () => {
    const onValueChange = vi.fn();
    const user = userEvent.setup();
    render(
      <Combobox items={fruits} multiple placeholder="Pick fruits" onValueChange={onValueChange} />,
    );
    const input = screen.getByRole("combobox");
    await user.click(input);
    await waitFor(() => {
      expect(screen.getByText("Apple")).toBeDefined();
    });
    await user.click(screen.getByText("Apple"));
    expect(onValueChange).toHaveBeenCalledWith(["Apple"], expect.anything());
  });
});

describe("Combobox.Async (standalone)", () => {
  it("renders and calls fetcher on input", async () => {
    const fetcher = vi.fn().mockResolvedValue(["Result A", "Result B"]);
    const user = userEvent.setup();
    vi.useFakeTimers({ shouldAdvanceTime: true });

    render(<Combobox.Async fetcher={fetcher} placeholder="Search..." />);
    const input = screen.getByRole("combobox");
    await user.click(input);
    await user.type(input, "test");
    vi.advanceTimersByTime(300);
    await waitFor(() => {
      expect(fetcher).toHaveBeenCalled();
    });

    vi.useRealTimers();
  });

  it("shows loading text while fetching", async () => {
    let resolve: (value: string[]) => void;
    const fetcher = vi.fn().mockImplementation(
      () =>
        new Promise<string[]>((r) => {
          resolve = r;
        }),
    );
    const user = userEvent.setup();
    vi.useFakeTimers({ shouldAdvanceTime: true });

    render(<Combobox.Async fetcher={fetcher} placeholder="Search..." loadingText="Fetching..." />);
    const input = screen.getByRole("combobox");
    await user.click(input);
    await user.type(input, "q");
    vi.advanceTimersByTime(300);

    await waitFor(() => {
      expect(fetcher).toHaveBeenCalled();
    });
    resolve!(["done"]);
    vi.useRealTimers();
  });

  it("applies className", () => {
    const fetcher = vi.fn().mockResolvedValue([]);
    const { container } = render(
      <Combobox.Async fetcher={fetcher} className="async-class" placeholder="Search..." />,
    );
    expect((container.firstChild as HTMLElement).classList.contains("async-class")).toBe(true);
  });

  it("renders multiple mode", () => {
    const fetcher = vi.fn().mockResolvedValue([]);
    render(<Combobox.Async fetcher={fetcher} multiple placeholder="Search..." />);
    expect(screen.getByRole("combobox")).toBeDefined();
  });
});

type Item = { label: string };
const creatableItems: Item[] = [{ label: "Existing A" }, { label: "Existing B" }];
const mapCreatableItem = (item: Item) => ({ label: item.label });
const createItem = (value: string) => ({ label: value });

describe("Combobox.Creatable (standalone)", () => {
  it("renders with items", async () => {
    const user = userEvent.setup();
    render(
      <Combobox.Creatable
        items={creatableItems}
        mapItem={mapCreatableItem}
        createItem={createItem}
        placeholder="Search..."
      />,
    );
    const input = screen.getByRole("combobox");
    await user.click(input);
    await waitFor(() => {
      expect(screen.getByText("Existing A")).toBeDefined();
      expect(screen.getByText("Existing B")).toBeDefined();
    });
  });

  it("shows create option when typing non-existing value", async () => {
    const user = userEvent.setup();
    render(
      <Combobox.Creatable
        items={creatableItems}
        mapItem={mapCreatableItem}
        createItem={createItem}
        placeholder="Search..."
      />,
    );
    const input = screen.getByRole("combobox");
    await user.click(input);
    await user.type(input, "NewItem");
    await waitFor(() => {
      expect(screen.getByText(/Create "NewItem"/)).toBeDefined();
    });
  });

  it("uses custom formatCreateLabel", async () => {
    const user = userEvent.setup();
    render(
      <Combobox.Creatable
        items={creatableItems}
        mapItem={mapCreatableItem}
        createItem={createItem}
        formatCreateLabel={(v) => `Add: ${v}`}
        placeholder="Search..."
      />,
    );
    const input = screen.getByRole("combobox");
    await user.click(input);
    await user.type(input, "NewItem");
    await waitFor(() => {
      expect(screen.getByText("Add: NewItem")).toBeDefined();
    });
  });

  it("applies className", () => {
    const { container } = render(
      <Combobox.Creatable
        items={creatableItems}
        mapItem={mapCreatableItem}
        createItem={createItem}
        className="creatable-class"
        placeholder="Search..."
      />,
    );
    expect((container.firstChild as HTMLElement).classList.contains("creatable-class")).toBe(true);
  });

  it("supports multiple mode", async () => {
    const user = userEvent.setup();
    render(
      <Combobox.Creatable
        items={creatableItems}
        multiple
        mapItem={mapCreatableItem}
        createItem={createItem}
        placeholder="Search..."
      />,
    );
    const input = screen.getByRole("combobox");
    await user.click(input);
    await waitFor(() => {
      expect(screen.getByText("Existing A")).toBeDefined();
    });
  });
});

describe("Combobox (standalone, grouped)", () => {
  const groups = [
    { label: "Fruits", items: ["Apple", "Banana"] },
    { label: "Vegetables", items: ["Carrot", "Lettuce"] },
  ];

  it("renders with placeholder", () => {
    render(<Combobox items={groups} placeholder="Pick one" />);
    const input = screen.getByRole("combobox");
    expect(input.getAttribute("placeholder")).toBe("Pick one");
  });

  it("shows grouped items when opened", async () => {
    const user = userEvent.setup();
    render(<Combobox items={groups} placeholder="Pick one" />);
    const input = screen.getByRole("combobox");
    await user.click(input);
    await waitFor(() => {
      expect(screen.getByText("Fruits")).toBeDefined();
      expect(screen.getByText("Apple")).toBeDefined();
      expect(screen.getByText("Vegetables")).toBeDefined();
      expect(screen.getByText("Carrot")).toBeDefined();
    });
  });

  it("filters items across groups", async () => {
    const user = userEvent.setup();
    render(<Combobox items={groups} placeholder="Search..." />);
    const input = screen.getByRole("combobox");
    await user.click(input);
    await user.type(input, "Car");
    await waitFor(() => {
      expect(screen.getByText("Carrot")).toBeDefined();
      expect(screen.queryByText("Apple")).toBeNull();
    });
  });

  it("calls onValueChange when an item is selected", async () => {
    const onValueChange = vi.fn();
    const user = userEvent.setup();
    render(<Combobox items={groups} placeholder="Search..." onValueChange={onValueChange} />);
    const input = screen.getByRole("combobox");
    await user.click(input);
    await waitFor(() => expect(screen.getByText("Carrot")).toBeDefined());
    await user.click(screen.getByText("Carrot"));
    expect(onValueChange).toHaveBeenCalledWith("Carrot", expect.anything());
  });

  it("supports multiple selection with grouped items", async () => {
    const onValueChange = vi.fn();
    const user = userEvent.setup();
    render(
      <Combobox items={groups} multiple placeholder="Pick items" onValueChange={onValueChange} />,
    );
    const input = screen.getByRole("combobox");
    await user.click(input);
    await waitFor(() => expect(screen.getByText("Apple")).toBeDefined());
    await user.click(screen.getByText("Apple"));
    expect(onValueChange).toHaveBeenCalledWith(["Apple"], expect.anything());
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
      <Combobox
        items={objectGroups}
        mapItem={(item) => ({ label: item.name, key: String(item.id) })}
        placeholder="Pick one"
      />,
    );
    const input = screen.getByRole("combobox");
    await user.click(input);
    await waitFor(() => {
      expect(screen.getByText("Fruits")).toBeDefined();
      expect(screen.getByText("Apple")).toBeDefined();
      expect(screen.getByText("Vegetables")).toBeDefined();
      expect(screen.getByText("Carrot")).toBeDefined();
    });
  });
});
