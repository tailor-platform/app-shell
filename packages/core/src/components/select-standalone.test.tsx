import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Select } from "./select-standalone";

afterEach(() => {
  cleanup();
});

describe("Select (standalone)", () => {
  // ==========================================================================
  // Snapshots — verify full DOM structure for standalone select
  // ==========================================================================

  describe("snapshots", () => {
    it("default with string items", () => {
      const { container } = render(
        <Select items={["Apple", "Banana", "Cherry"]} placeholder="Pick a fruit" />,
      );
      expect(container.innerHTML).toMatchSnapshot();
    });

    it("disabled", () => {
      const { container } = render(
        <Select items={["Apple", "Banana"]} placeholder="Disabled" disabled />,
      );
      expect(container.innerHTML).toMatchSnapshot();
    });

    it("with custom mapItem", () => {
      const items = [
        { id: "1", name: "Apple" },
        { id: "2", name: "Banana" },
      ];
      const { container } = render(
        <Select
          items={items}
          mapItem={(item) => ({ label: item.name, key: item.id })}
          placeholder="Pick"
        />,
      );
      expect(container.innerHTML).toMatchSnapshot();
    });

    it("multiple mode", () => {
      const { container } = render(
        <Select items={["Apple", "Banana"]} placeholder="Pick fruits" multiple />,
      );
      expect(container.innerHTML).toMatchSnapshot();
    });
  });

  it("renders with placeholder", () => {
    render(<Select items={["Apple", "Banana"]} placeholder="Pick one" />);
    expect(screen.getByText("Pick one")).toBeDefined();
  });

  it("shows items when trigger is clicked", async () => {
    const user = userEvent.setup();
    render(<Select items={["Apple", "Banana"]} placeholder="Pick one" />);

    await user.click(screen.getByText("Pick one"));

    await waitFor(() => {
      expect(screen.getByText("Apple")).toBeDefined();
      expect(screen.getByText("Banana")).toBeDefined();
    });
  });

  it("calls onValueChange when an item is selected", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();

    render(
      <Select items={["Apple", "Banana"]} placeholder="Pick one" onValueChange={onValueChange} />,
    );

    await user.click(screen.getByText("Pick one"));
    await waitFor(() => expect(screen.getByText("Banana")).toBeDefined());
    await user.click(screen.getByText("Banana"));

    await waitFor(() => {
      expect(onValueChange).toHaveBeenCalledWith("Banana");
    });
  });

  it("renders with custom mapItem for object items", async () => {
    const user = userEvent.setup();
    const items = [
      { id: 1, name: "Apple" },
      { id: 2, name: "Banana" },
    ];

    render(
      <Select
        items={items}
        mapItem={(item) => ({ label: item.name, key: String(item.id) })}
        placeholder="Pick one"
      />,
    );

    await user.click(screen.getByText("Pick one"));

    await waitFor(() => {
      expect(screen.getByText("Apple")).toBeDefined();
      expect(screen.getByText("Banana")).toBeDefined();
    });
  });

  it("renders with custom renderItem via mapItem", async () => {
    const user = userEvent.setup();
    render(
      <Select
        items={["Apple", "Banana"]}
        mapItem={(item) => ({
          label: item,
          render: <span data-testid={`item-${item}`}>{item}!</span>,
        })}
        placeholder="Pick one"
      />,
    );

    await user.click(screen.getByText("Pick one"));

    await waitFor(() => {
      expect(screen.getByTestId("item-Apple")).toBeDefined();
    });
  });

  it("applies className to container", () => {
    const { container } = render(
      <Select items={["Apple"]} className="my-class" placeholder="Pick" />,
    );
    expect(container.querySelector(".my-class")).toBeDefined();
  });
});

describe("Select (standalone, multiple)", () => {
  it("renders with placeholder", () => {
    render(<Select items={["Apple", "Banana", "Cherry"]} multiple placeholder="Pick fruits" />);
    expect(screen.getByText("Pick fruits")).toBeDefined();
  });

  it("calls onValueChange with array when items are selected", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();

    render(
      <Select
        items={["Apple", "Banana", "Cherry"]}
        multiple
        placeholder="Pick fruits"
        onValueChange={onValueChange}
      />,
    );

    await user.click(screen.getByText("Pick fruits"));
    await waitFor(() => expect(screen.getByText("Apple")).toBeDefined());
    await user.click(screen.getByText("Apple"));

    await waitFor(() => {
      expect(onValueChange).toHaveBeenCalledWith(["Apple"]);
    });
  });

  it("renders with custom renderValue", async () => {
    render(
      <Select
        items={["Apple", "Banana", "Cherry"]}
        multiple
        defaultValue={["Apple", "Banana"]}
        renderValue={(values) => {
          const arr = values as string[];
          return <span data-testid="custom-value">{arr.length} selected</span>;
        }}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId("custom-value")).toBeDefined();
      expect(screen.getByTestId("custom-value").textContent).toBe("2 selected");
    });
  });
});

describe("Select (standalone, grouped)", () => {
  const groups = [
    { label: "Fruits", items: ["Apple", "Banana"] },
    { label: "Vegetables", items: ["Carrot", "Lettuce"] },
  ];

  it("renders with placeholder", () => {
    render(<Select items={groups} placeholder="Pick one" />);
    expect(screen.getByText("Pick one")).toBeDefined();
  });

  it("shows grouped items when trigger is clicked", async () => {
    const user = userEvent.setup();
    render(<Select items={groups} placeholder="Pick one" />);

    await user.click(screen.getByText("Pick one"));

    await waitFor(() => {
      expect(screen.getByText("Fruits")).toBeDefined();
      expect(screen.getByText("Apple")).toBeDefined();
      expect(screen.getByText("Vegetables")).toBeDefined();
      expect(screen.getByText("Carrot")).toBeDefined();
    });
  });

  it("calls onValueChange when an item is selected", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();

    render(<Select items={groups} placeholder="Pick one" onValueChange={onValueChange} />);

    await user.click(screen.getByText("Pick one"));
    await waitFor(() => expect(screen.getByText("Carrot")).toBeDefined());
    await user.click(screen.getByText("Carrot"));

    await waitFor(() => {
      expect(onValueChange).toHaveBeenCalledWith("Carrot");
    });
  });

  it("supports multiple selection", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();

    render(
      <Select items={groups} multiple placeholder="Pick items" onValueChange={onValueChange} />,
    );

    await user.click(screen.getByText("Pick items"));
    await waitFor(() => expect(screen.getByText("Apple")).toBeDefined());
    await user.click(screen.getByText("Apple"));

    await waitFor(() => {
      expect(onValueChange).toHaveBeenCalledWith(["Apple"]);
    });
  });

  it("renders with object items and mapItem", async () => {
    const user = userEvent.setup();
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

    render(
      <Select
        items={objectGroups}
        mapItem={(item) => ({ label: item.name, key: String(item.id) })}
        placeholder="Pick one"
      />,
    );

    await user.click(screen.getByText("Pick one"));

    await waitFor(() => {
      expect(screen.getByText("Fruits")).toBeDefined();
      expect(screen.getByText("Apple")).toBeDefined();
      expect(screen.getByText("Vegetables")).toBeDefined();
      expect(screen.getByText("Carrot")).toBeDefined();
    });
  });
});
