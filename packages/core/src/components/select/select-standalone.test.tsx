import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderRHFForm } from "../../../tests/rhf-test-utils";
import { Field } from "../field";
import { Select } from "./select-standalone";
import { Form } from "../form";

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

describe("Select (standalone, RHF integration)", () => {
  it("submits the selected item and resets to the placeholder", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    renderRHFForm({
      defaultValues: { fruit: null as string | null },
      name: "fruit",
      onSubmit,
      render: ({ field, fieldState }) => (
        <Field.Root name={field.name} {...fieldState}>
          <Field.Label>Fruit</Field.Label>
          <Select
            items={["Apple", "Banana", "Cherry"]}
            value={field.value}
            onValueChange={field.onChange}
            aria-label="Fruit"
            placeholder="Pick one"
          />
          <Field.Error match={fieldState.invalid}>{fieldState.error?.message}</Field.Error>
        </Field.Root>
      ),
    });

    await user.click(screen.getByText("Pick one"));
    await waitFor(() => expect(screen.getByText("Banana")).toBeDefined());
    await user.click(screen.getByText("Banana"));
    await user.click(screen.getByRole("button", { name: "Submit" }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({ fruit: "Banana" });
    });

    await user.click(screen.getByRole("button", { name: "Reset" }));
    expect(screen.getByText("Pick one")).toBeDefined();
  });

  it("surfaces required errors on submit", async () => {
    const user = userEvent.setup();

    renderRHFForm({
      defaultValues: { fruit: null as string | null },
      name: "fruit",
      rules: { required: "Fruit is required" },
      render: ({ field, fieldState }) => (
        <Field.Root name={field.name} {...fieldState}>
          <Field.Label>Fruit</Field.Label>
          <Select
            items={["Apple", "Banana", "Cherry"]}
            value={field.value}
            onValueChange={field.onChange}
            aria-label="Fruit"
            placeholder="Pick one"
          />
          <Field.Error match={fieldState.invalid}>{fieldState.error?.message}</Field.Error>
        </Field.Root>
      ),
    });

    await user.click(screen.getByRole("button", { name: "Submit" }));
    expect(await screen.findByText("Fruit is required")).toBeDefined();
  });
});

describe("Select.Async (standalone)", () => {
  it("does not enter modal mode when opened", async () => {
    const user = userEvent.setup();
    const fetcher = vi.fn().mockResolvedValue(["Apple", "Banana"]);

    render(<Select.Async fetcher={fetcher} placeholder="Pick one" />);

    await user.click(screen.getByText("Pick one"));

    await waitFor(() => {
      expect(screen.getByText("Apple")).toBeDefined();
    });

    expect(document.body.style.overflow).toBe("");
    expect(document.documentElement.style.overflow).toBe("");
    expect(document.querySelector("[data-base-ui-portal] [role='presentation'][inert]")).toBeNull();
  });

  it("shows loading text then items after fetch", async () => {
    const user = userEvent.setup();
    let resolve: (value: string[]) => void;
    const fetcher = vi.fn().mockImplementation(
      () =>
        new Promise<string[]>((r) => {
          resolve = r;
        }),
    );

    render(<Select.Async fetcher={fetcher} placeholder="Pick one" />);
    expect(fetcher).not.toHaveBeenCalled();

    // Open popup — fetcher is called on open
    await user.click(screen.getByText("Pick one"));
    expect(fetcher).toHaveBeenCalled();
    await waitFor(() => {
      expect(screen.getByText("Loading...")).toBeDefined();
    });

    // Resolve
    resolve!(["Apple", "Banana"]);
    await waitFor(() => {
      expect(screen.getByText("Apple")).toBeDefined();
      expect(screen.getByText("Banana")).toBeDefined();
    });
  });

  it("uses custom loadingText", async () => {
    const user = userEvent.setup();
    const fetcher = vi.fn().mockImplementation(
      () => new Promise<string[]>(() => {}), // never resolves
    );

    render(<Select.Async fetcher={fetcher} placeholder="Pick" loadingText="Fetching..." />);
    await user.click(screen.getByText("Pick"));
    await waitFor(() => {
      expect(screen.getByText("Fetching...")).toBeDefined();
    });
  });

  it("shows the inline error state (with Retry) when the fetcher throws", async () => {
    const user = userEvent.setup();
    const fetcher = vi.fn().mockRejectedValue(new Error("API error"));

    render(
      <Select.Async fetcher={fetcher} placeholder="Pick one" errorText="Couldn't load results." />,
    );
    await user.click(screen.getByText("Pick one"));

    await waitFor(() => {
      expect(screen.getByText("Couldn't load results.")).toBeDefined();
    });
    expect(screen.getByRole("button", { name: /retry/i })).toBeDefined();
  });

  it("re-runs the fetch when Retry is clicked", async () => {
    const user = userEvent.setup();
    let shouldFail = true;
    const fetcher = vi.fn().mockImplementation(async () => {
      if (shouldFail) throw new Error("API error");
      return ["Recovered"];
    });

    render(<Select.Async fetcher={fetcher} placeholder="Pick one" />);
    await user.click(screen.getByText("Pick one"));

    const retry = await screen.findByRole("button", { name: /retry/i });
    shouldFail = false;
    await user.click(retry);

    await waitFor(() => {
      expect(screen.getByText("Recovered")).toBeDefined();
    });
  });

  it("calls onFetchError once per outage across reopens", async () => {
    const user = userEvent.setup();
    const fetcher = vi.fn().mockRejectedValue(new Error("API error"));
    const onFetchError = vi.fn();

    render(<Select.Async fetcher={fetcher} placeholder="Pick one" onFetchError={onFetchError} />);

    await user.click(screen.getByText("Pick one"));
    await waitFor(() => {
      expect(onFetchError).toHaveBeenCalledTimes(1);
    });

    // Close and reopen while still broken — no re-announce during the same outage.
    await user.keyboard("{Escape}");
    await user.click(screen.getByText("Pick one"));
    await waitFor(() => {
      expect(fetcher).toHaveBeenCalledTimes(2);
    });
    expect(onFetchError).toHaveBeenCalledTimes(1);
  });

  it("can reopen after closing while the fetch is still in flight", async () => {
    const user = userEvent.setup();
    const pendingRequests: Array<{
      resolve: (value: string[]) => void;
      reject: (reason?: unknown) => void;
      signal: AbortSignal;
    }> = [];

    const fetcher = vi.fn().mockImplementation(({ signal }: { signal: AbortSignal }) => {
      return new Promise<string[]>((resolve, reject) => {
        signal.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")), {
          once: true,
        });
        pendingRequests.push({ resolve, reject, signal });
      });
    });

    render(<Select.Async fetcher={fetcher} placeholder="Pick one" />);

    await user.click(screen.getByText("Pick one"));
    await waitFor(() => {
      expect(screen.getByText("Loading...")).toBeDefined();
    });

    await user.keyboard("{Escape}");

    await waitFor(() => {
      expect(pendingRequests[0]?.signal.aborted).toBe(true);
    });

    await user.click(screen.getByText("Pick one"));
    await waitFor(() => {
      expect(fetcher).toHaveBeenCalledTimes(2);
      expect(screen.getByText("Loading...")).toBeDefined();
    });

    pendingRequests[0]?.resolve(["Stale"]);
    pendingRequests[1]?.resolve(["Apple", "Banana"]);

    await waitFor(() => {
      expect(screen.getByText("Apple")).toBeDefined();
      expect(screen.getByText("Banana")).toBeDefined();
      expect(screen.queryByText("Stale")).toBeNull();
    });
  });

  it("can reopen after closing once items have loaded", async () => {
    const user = userEvent.setup();
    const fetcher = vi
      .fn<() => Promise<string[]>>()
      .mockResolvedValueOnce(["Apple", "Banana"])
      .mockResolvedValueOnce(["Cherry", "Durian"]);

    render(<Select.Async fetcher={fetcher} placeholder="Pick one" />);

    const trigger = screen.getByRole("combobox");

    await user.click(trigger);
    await waitFor(() => {
      expect(screen.getByText("Apple")).toBeDefined();
      expect(screen.getByText("Banana")).toBeDefined();
    });

    await user.click(trigger);

    await waitFor(() => {
      expect(trigger.getAttribute("aria-expanded")).toBe("false");
    });

    await user.click(trigger);

    await waitFor(() => {
      expect(fetcher).toHaveBeenCalledTimes(2);
      expect(trigger.getAttribute("aria-expanded")).toBe("true");
      expect(screen.getByText("Cherry")).toBeDefined();
      expect(screen.getByText("Durian")).toBeDefined();
    });
  });

  it("calls onValueChange when an item is selected", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    const fetcher = vi.fn().mockResolvedValue(["Apple", "Banana"]);

    render(<Select.Async fetcher={fetcher} placeholder="Pick one" onValueChange={onValueChange} />);

    const trigger = screen.getByRole("combobox");

    await waitFor(() => expect(screen.getByText("Pick one")).toBeDefined());
    await user.click(trigger);
    await waitFor(() => expect(screen.getByText("Banana")).toBeDefined());
    await user.click(screen.getByText("Banana"));

    await waitFor(() => {
      expect(onValueChange).toHaveBeenCalledWith("Banana");
      expect(trigger.getAttribute("aria-expanded")).toBe("false");
      expect(screen.queryByRole("listbox")).toBeNull();
    });

    expect(document.body.style.overflow).toBe("");
    expect(document.documentElement.style.overflow).toBe("");
  });

  it("supports mapItem for object items", async () => {
    const user = userEvent.setup();
    type Item = { id: number; name: string };
    const items: Item[] = [
      { id: 1, name: "Apple" },
      { id: 2, name: "Banana" },
    ];
    const fetcher = vi.fn<() => Promise<Item[]>>().mockResolvedValue(items);

    render(
      <Select.Async
        fetcher={fetcher}
        mapItem={(item) => ({ label: item.name, key: String(item.id) })}
        placeholder="Pick one"
      />,
    );

    await waitFor(() => expect(screen.getByText("Pick one")).toBeDefined());
    await user.click(screen.getByText("Pick one"));

    await waitFor(() => {
      expect(screen.getByText("Apple")).toBeDefined();
      expect(screen.getByText("Banana")).toBeDefined();
    });
  });

  it("applies className", () => {
    const fetcher = vi.fn().mockResolvedValue([]);
    const { container } = render(
      <Select.Async fetcher={fetcher} className="async-class" placeholder="Pick" />,
    );
    expect((container.firstChild as HTMLElement).classList.contains("async-class")).toBe(true);
  });

  it("renders multiple mode", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    const fetcher = vi.fn().mockResolvedValue(["Apple", "Banana", "Cherry"]);

    render(
      <Select.Async
        fetcher={fetcher}
        multiple
        placeholder="Pick fruits"
        onValueChange={onValueChange}
      />,
    );

    await waitFor(() => expect(screen.getByText("Pick fruits")).toBeDefined());
    await user.click(screen.getByText("Pick fruits"));
    await waitFor(() => expect(screen.getByText("Apple")).toBeDefined());
    await user.click(screen.getByText("Apple"));

    await waitFor(() => {
      expect(onValueChange).toHaveBeenCalledWith(["Apple"]);
    });
  });

  // ==========================================================================
  // Accessibility — the trigger can be given an accessible name outside a form
  // ==========================================================================

  describe("accessible name", () => {
    const items = ["Apple", "Banana"];

    it("forwards aria-label to the trigger", () => {
      render(<Select items={items} aria-label="Direction filter" />);
      expect(screen.getByRole("combobox", { name: "Direction filter" })).toBeDefined();
    });

    it("forwards aria-labelledby to the trigger", () => {
      render(
        <>
          <span id="dir-label">From</span>
          <Select items={items} aria-labelledby="dir-label" />
        </>,
      );
      expect(screen.getByRole("combobox", { name: "From" })).toBeDefined();
    });

    it("forwards id to the trigger", () => {
      render(<Select items={items} id="direction-select" aria-label="Direction" />);
      expect(screen.getByRole("combobox").getAttribute("id")).toBe("direction-select");
    });

    it("forwards aria-label to the trigger in multiple mode", () => {
      render(<Select items={items} multiple aria-label="Tag filter" />);
      expect(screen.getByRole("combobox", { name: "Tag filter" })).toBeDefined();
    });

    it("forwards aria-label to the Async trigger", () => {
      const fetcher = vi.fn().mockResolvedValue(items);
      render(<Select.Async fetcher={fetcher} aria-label="Async filter" />);
      expect(screen.getByRole("combobox", { name: "Async filter" })).toBeDefined();
    });
  });
});

// ============================================================================
// Form participation
//
// Two distinct mechanisms are at play, and they are worth keeping straight:
//
//  1. `Form`'s `onFormSubmit` collects values from registered `Field.Root`s,
//     keyed by the *Field's* name — not from the DOM. That path already works
//     without `name` on the control.
//  2. `name` puts a hidden input in the DOM, which is what native submission
//     reads: `new FormData(form)`, a plain uncontrolled `<form>`, and server
//     actions. That is what these props add.
// ============================================================================

describe("Select — form participation", () => {
  const items = ["Up", "Down"];

  const objectItems = [
    { value: "jp", label: "Japan" },
    { value: "us", label: "United States" },
  ];

  it("renders a hidden input carrying name and value", () => {
    const { container } = render(
      <Select items={items} name="direction" defaultValue="Up" aria-label="Direction" />,
    );
    const input = container.querySelector('input[name="direction"]') as HTMLInputElement;
    expect(input).not.toBeNull();
    expect(input.value).toBe("Up");
  });

  it("is picked up by native FormData", () => {
    const { container } = render(
      <form>
        <Select items={items} name="direction" defaultValue="Down" aria-label="Direction" />
      </form>,
    );
    const form = container.querySelector("form") as HTMLFormElement;
    expect(new FormData(form).get("direction")).toBe("Down");
  });

  it("serialises `{ value, label }` items using `value`", () => {
    const { container } = render(
      <form>
        <Select
          items={objectItems}
          name="country"
          defaultValue={objectItems[0]}
          mapItem={(item) => ({ label: item.label, key: item.value })}
          aria-label="Country"
        />
      </form>,
    );
    const form = container.querySelector("form") as HTMLFormElement;
    expect(new FormData(form).get("country")).toBe("jp");
  });

  it("serialises arbitrary object items via itemToStringValue", () => {
    const warehouses = [
      { id: 7, name: "Warehouse A" },
      { id: 9, name: "Warehouse B" },
    ];
    const { container } = render(
      <form>
        <Select
          items={warehouses}
          name="warehouse"
          defaultValue={warehouses[1]}
          mapItem={(item) => ({ label: item.name, key: String(item.id) })}
          itemToStringValue={(item) => String(item.id)}
          aria-label="Warehouse"
        />
      </form>,
    );
    const form = container.querySelector("form") as HTMLFormElement;
    expect(new FormData(form).get("warehouse")).toBe("9");
  });

  it("associates the hidden input with an outer form via `form`", () => {
    const { container } = render(
      <div>
        <form id="outer" />
        <Select
          items={items}
          name="direction"
          form="outer"
          defaultValue="Up"
          aria-label="Direction"
        />
      </div>,
    );
    const input = container.querySelector('input[name="direction"]') as HTMLInputElement;
    expect(input.getAttribute("form")).toBe("outer");
  });

  it("exposes the hidden input through inputRef", () => {
    const ref = { current: null } as React.RefObject<HTMLInputElement | null>;
    render(<Select items={items} name="direction" inputRef={ref} aria-label="Direction" />);
    expect(ref.current).toBeInstanceOf(HTMLInputElement);
    expect(ref.current?.name).toBe("direction");
  });

  it("required blocks submission and surfaces the field error", async () => {
    const user = userEvent.setup();
    const onFormSubmit = vi.fn();
    render(
      <Form noValidate onFormSubmit={onFormSubmit}>
        <Field.Root name="direction">
          <Field.Label>Direction</Field.Label>
          <Select items={items} required />
          <Field.Error match="valueMissing">Direction is required.</Field.Error>
        </Field.Root>
        <button type="submit">Save</button>
      </Form>,
    );

    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(onFormSubmit).not.toHaveBeenCalled();
    expect(screen.getByText("Direction is required.")).not.toBeNull();
  });

  it("reflects the value chosen by the user", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <form>
        <Select items={items} name="direction" aria-label="Direction" />
      </form>,
    );

    await user.click(screen.getByRole("combobox", { name: "Direction" }));
    await user.click(await screen.findByRole("option", { name: "Down" }));

    const form = container.querySelector("form") as HTMLFormElement;
    expect(new FormData(form).get("direction")).toBe("Down");
  });

  it("Select.Async also renders the hidden input", async () => {
    const fetcher = vi.fn().mockResolvedValue(items);
    const { container } = render(
      <Select.Async fetcher={fetcher} name="direction" aria-label="Direction" />,
    );
    await waitFor(() => {
      expect(container.querySelector('input[name="direction"]')).not.toBeNull();
    });
  });

  it("defers to the Field's name when nested in a Field.Root", async () => {
    const user = userEvent.setup();
    const onFormSubmit = vi.fn();
    const { container } = render(
      <Form noValidate onFormSubmit={onFormSubmit}>
        <Field.Root name="fieldName">
          <Field.Label>Direction</Field.Label>
          {/* The control's own `name` is deliberately different — the Field's
              name must win, so this one never reaches the DOM or the payload. */}
          <Select items={items} name="controlName" defaultValue="Up" />
        </Field.Root>
        <button type="submit">Save</button>
      </Form>,
    );

    expect(container.querySelector('input[name="fieldName"]')).not.toBeNull();
    expect(container.querySelector('input[name="controlName"]')).toBeNull();

    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(onFormSubmit.mock.calls[0][0]).toMatchObject({ fieldName: "Up" });
    expect(onFormSubmit.mock.calls[0][0]).not.toHaveProperty("controlName");
  });

  it("keeps working with Form + Field.Root, which reads registered fields", async () => {
    const user = userEvent.setup();
    const onFormSubmit = vi.fn();
    render(
      <Form noValidate onFormSubmit={onFormSubmit}>
        <Field.Root name="direction">
          <Field.Label>Direction</Field.Label>
          <Select items={items} name="direction" defaultValue="Up" />
        </Field.Root>
        <button type="submit">Save</button>
      </Form>,
    );

    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(onFormSubmit.mock.calls[0][0]).toMatchObject({ direction: "Up" });
  });
});
