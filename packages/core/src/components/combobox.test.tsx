import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor, renderHook, act } from "@testing-library/react";
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

    expect(screen.getByTestId("input").classList.contains("custom-class")).toBe(true);
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

// ============================================================================
// useCreatable tests
// ============================================================================

interface Tag {
  id: string;
  name: string;
}

const initialTags: Tag[] = [
  { id: "1", name: "React" },
  { id: "2", name: "Vue" },
  { id: "3", name: "Angular" },
];

const createTag = (value: string): Tag => ({
  id: value.toLowerCase().replace(/\s+/g, "-"),
  name: value,
});

describe("Combobox.useCreatable", () => {
  describe("multiple mode", () => {
    const defaultOptions = {
      items: initialTags,
      multiple: true as const,
      getLabel: (item: Tag) => item.name,
      createItem: createTag,
    };

    it("returns items unchanged when inputValue is empty", () => {
      const { result } = renderHook(() => Combobox.useCreatable(defaultOptions));
      expect(result.current.items).toBe(initialTags);
      expect(result.current.value).toEqual([]);
      expect(result.current.multiple).toBe(true);
    });

    it("appends a sentinel item when query has no exact match", () => {
      const { result } = renderHook(() => Combobox.useCreatable(defaultOptions));

      act(() => {
        result.current.onInputValueChange("Svelte");
      });

      expect(result.current.items).toHaveLength(4);
      expect(result.current.isCreateItem(result.current.items[3])).toBe(true);
      expect(result.current.getCreateLabel(result.current.items[3])).toBe("Svelte");
    });

    it("does not append sentinel when query exactly matches an item (case-insensitive)", () => {
      const { result } = renderHook(() => Combobox.useCreatable(defaultOptions));

      act(() => {
        result.current.onInputValueChange("react");
      });

      expect(result.current.items).toHaveLength(3);
    });

    it("creates item immediately with sync onItemCreated", () => {
      const onItemCreated = vi.fn((_item: Tag, resolve: (accept?: boolean) => void) => resolve());
      const onValueChange = vi.fn();

      const { result } = renderHook(() =>
        Combobox.useCreatable({
          ...defaultOptions,
          onItemCreated,
          onValueChange,
        }),
      );

      // Type a new value
      act(() => {
        result.current.onInputValueChange("Svelte");
      });

      // Find and select the sentinel
      const sentinel = result.current.items.find((item) => result.current.isCreateItem(item))!;

      // Simulate selecting it
      act(() => {
        result.current.onValueChange([sentinel]);
      });

      expect(onItemCreated).toHaveBeenCalledWith(
        expect.objectContaining({ name: "Svelte" }),
        expect.any(Function),
      );
      expect(onValueChange).toHaveBeenCalledWith([expect.objectContaining({ name: "Svelte" })]);
      expect(result.current.value).toHaveLength(1);
      expect(result.current.inputValue).toBe("");
    });

    it("cancels creation when resolve is called with false", () => {
      const onValueChange = vi.fn();

      const { result } = renderHook(() =>
        Combobox.useCreatable({
          ...defaultOptions,
          onItemCreated: (_item, resolve) => resolve(false),
          onValueChange,
        }),
      );

      act(() => {
        result.current.onInputValueChange("Svelte");
      });

      const sentinel = result.current.items.find((item) => result.current.isCreateItem(item))!;

      act(() => {
        result.current.onValueChange([sentinel]);
      });

      expect(onValueChange).not.toHaveBeenCalled();
      expect(result.current.value).toEqual([]);
    });

    it("defers creation until resolve callback is called", () => {
      let savedResolve!: (accept?: boolean) => void;
      const onItemCreated = vi.fn((_item: Tag, resolve: (accept?: boolean) => void) => {
        savedResolve = resolve;
      });
      const onValueChange = vi.fn();

      const { result } = renderHook(() =>
        Combobox.useCreatable({
          ...defaultOptions,
          onItemCreated,
          onValueChange,
        }),
      );

      act(() => {
        result.current.onInputValueChange("Svelte");
      });

      const sentinel = result.current.items.find((item) => result.current.isCreateItem(item))!;

      act(() => {
        result.current.onValueChange([sentinel]);
      });

      // Not yet resolved — value should still be empty
      expect(result.current.value).toEqual([]);
      expect(onValueChange).not.toHaveBeenCalled();

      // Call the resolve callback
      act(() => {
        savedResolve();
      });

      expect(onValueChange).toHaveBeenCalledWith([expect.objectContaining({ name: "Svelte" })]);
      expect(result.current.value).toHaveLength(1);
    });

    it("cancels deferred creation when resolve is called with false", () => {
      let savedResolve!: (accept?: boolean) => void;
      const onValueChange = vi.fn();

      const { result } = renderHook(() =>
        Combobox.useCreatable({
          ...defaultOptions,
          onItemCreated: (_item, resolve) => {
            savedResolve = resolve;
          },
          onValueChange,
        }),
      );

      act(() => {
        result.current.onInputValueChange("Svelte");
      });

      const sentinel = result.current.items.find((item) => result.current.isCreateItem(item))!;

      act(() => {
        result.current.onValueChange([sentinel]);
      });

      // Cancel via resolve(false)
      act(() => {
        savedResolve(false);
      });

      expect(onValueChange).not.toHaveBeenCalled();
      expect(result.current.value).toEqual([]);
    });

    it("creates item via async onItemCreated (Promise pattern)", async () => {
      const onValueChange = vi.fn();

      const { result } = renderHook(() =>
        Combobox.useCreatable({
          ...defaultOptions,
          onItemCreated: async (_item: Tag) => {
            // Simulate API call
          },
          onValueChange,
        }),
      );

      act(() => {
        result.current.onInputValueChange("Svelte");
      });

      const sentinel = result.current.items.find((item) => result.current.isCreateItem(item))!;

      await act(async () => {
        result.current.onValueChange([sentinel]);
      });

      expect(onValueChange).toHaveBeenCalledWith([expect.objectContaining({ name: "Svelte" })]);
      expect(result.current.value).toHaveLength(1);
    });

    it("cancels creation when async onItemCreated returns false", async () => {
      const onValueChange = vi.fn();

      const { result } = renderHook(() =>
        Combobox.useCreatable({
          ...defaultOptions,
          onItemCreated: async (_item: Tag) => {
            return false;
          },
          onValueChange,
        }),
      );

      act(() => {
        result.current.onInputValueChange("Svelte");
      });

      const sentinel = result.current.items.find((item) => result.current.isCreateItem(item))!;

      await act(async () => {
        result.current.onValueChange([sentinel]);
      });

      expect(onValueChange).not.toHaveBeenCalled();
      expect(result.current.value).toEqual([]);
    });

    it("cancels creation when async onItemCreated rejects", async () => {
      const onValueChange = vi.fn();

      const { result } = renderHook(() =>
        Combobox.useCreatable({
          ...defaultOptions,
          onItemCreated: async (_item: Tag) => {
            throw new Error("API error");
          },
          onValueChange,
        }),
      );

      act(() => {
        result.current.onInputValueChange("Svelte");
      });

      const sentinel = result.current.items.find((item) => result.current.isCreateItem(item))!;

      await act(async () => {
        result.current.onValueChange([sentinel]);
      });

      expect(onValueChange).not.toHaveBeenCalled();
      expect(result.current.value).toEqual([]);
    });

    it("passes through normal selections without interception", () => {
      const onValueChange = vi.fn();

      const { result } = renderHook(() =>
        Combobox.useCreatable({
          ...defaultOptions,
          onValueChange,
        }),
      );

      act(() => {
        result.current.onValueChange([initialTags[0], initialTags[1]]);
      });

      expect(result.current.value).toEqual([initialTags[0], initialTags[1]]);
      expect(onValueChange).toHaveBeenCalledWith([initialTags[0], initialTags[1]]);
    });

    it("respects defaultValue", () => {
      const { result } = renderHook(() =>
        Combobox.useCreatable({
          ...defaultOptions,
          defaultValue: [initialTags[0]],
        }),
      );

      expect(result.current.value).toEqual([initialTags[0]]);
    });

    it("uses custom formatCreateLabel", () => {
      const { result } = renderHook(() =>
        Combobox.useCreatable({
          ...defaultOptions,
          formatCreateLabel: (v) => `「${v}」を作成`,
        }),
      );

      expect(result.current.formatCreateLabel("テスト")).toBe("「テスト」を作成");
    });
  });

  describe("single mode", () => {
    const defaultOptions = {
      items: initialTags,
      getLabel: (item: Tag) => item.name,
      createItem: createTag,
    };

    it("returns value as null initially", () => {
      const { result } = renderHook(() => Combobox.useCreatable(defaultOptions));

      expect(result.current.value).toBeNull();
      expect(result.current.multiple).toBe(false);
    });

    it("creates and selects item for single select", () => {
      const onItemCreated = vi.fn((_item: Tag, resolve: (accept?: boolean) => void) => resolve());
      const onValueChange = vi.fn();

      const { result } = renderHook(() =>
        Combobox.useCreatable({
          ...defaultOptions,
          onItemCreated,
          onValueChange,
        }),
      );

      act(() => {
        result.current.onInputValueChange("Svelte");
      });

      const sentinel = result.current.items.find((item) => result.current.isCreateItem(item))!;

      act(() => {
        result.current.onValueChange(sentinel);
      });

      expect(onItemCreated).toHaveBeenCalledWith(
        expect.objectContaining({ name: "Svelte" }),
        expect.any(Function),
      );
      expect(onValueChange).toHaveBeenCalledWith(expect.objectContaining({ name: "Svelte" }));
      expect(result.current.value).toEqual(expect.objectContaining({ name: "Svelte" }));
    });

    it("passes through normal selection in single mode", () => {
      const onValueChange = vi.fn();

      const { result } = renderHook(() =>
        Combobox.useCreatable({
          ...defaultOptions,
          onValueChange,
        }),
      );

      act(() => {
        result.current.onValueChange(initialTags[0]);
      });

      expect(result.current.value).toBe(initialTags[0]);
      expect(onValueChange).toHaveBeenCalledWith(initialTags[0]);
    });

    it("handles null selection (clear) in single mode", () => {
      const onValueChange = vi.fn();

      const { result } = renderHook(() =>
        Combobox.useCreatable({
          ...defaultOptions,
          defaultValue: initialTags[0],
          onValueChange,
        }),
      );

      act(() => {
        result.current.onValueChange(null);
      });

      expect(result.current.value).toBeNull();
      expect(onValueChange).toHaveBeenCalledWith(null);
    });

    it("defers creation in single mode until resolve is called", () => {
      let savedResolve!: (accept?: boolean) => void;
      const onItemCreated = vi.fn((_item: Tag, resolve: (accept?: boolean) => void) => {
        savedResolve = resolve;
      });
      const onValueChange = vi.fn();

      const { result } = renderHook(() =>
        Combobox.useCreatable({
          ...defaultOptions,
          onItemCreated,
          onValueChange,
        }),
      );

      act(() => {
        result.current.onInputValueChange("Svelte");
      });

      const sentinel = result.current.items.find((item) => result.current.isCreateItem(item))!;

      act(() => {
        result.current.onValueChange(sentinel);
      });

      expect(result.current.value).toBeNull();

      act(() => {
        savedResolve();
      });

      expect(onItemCreated).toHaveBeenCalled();
      expect(result.current.value).toEqual(expect.objectContaining({ name: "Svelte" }));
    });

    it("cancels single creation when resolve is called with false", () => {
      const onValueChange = vi.fn();

      const { result } = renderHook(() =>
        Combobox.useCreatable({
          ...defaultOptions,
          onItemCreated: (_item, resolve) => resolve(false),
          onValueChange,
        }),
      );

      act(() => {
        result.current.onInputValueChange("Svelte");
      });

      const sentinel = result.current.items.find((item) => result.current.isCreateItem(item))!;

      act(() => {
        result.current.onValueChange(sentinel);
      });

      expect(onValueChange).not.toHaveBeenCalled();
      expect(result.current.value).toBeNull();
    });

    it("respects defaultValue in single mode", () => {
      const { result } = renderHook(() =>
        Combobox.useCreatable({
          ...defaultOptions,
          defaultValue: initialTags[1],
        }),
      );

      expect(result.current.value).toBe(initialTags[1]);
    });
  });

  describe("isCreateItem / getCreateLabel", () => {
    it("correctly identifies sentinel vs regular items", () => {
      const { result } = renderHook(() =>
        Combobox.useCreatable({
          items: initialTags,
          multiple: true,
          getLabel: (item: Tag) => item.name,
          createItem: createTag,
        }),
      );

      // No sentinel when query is empty
      for (const item of result.current.items) {
        expect(result.current.isCreateItem(item)).toBe(false);
        expect(result.current.getCreateLabel(item)).toBeUndefined();
      }

      // After typing
      act(() => {
        result.current.onInputValueChange("New");
      });

      const lastItem = result.current.items[result.current.items.length - 1];
      expect(result.current.isCreateItem(lastItem)).toBe(true);
      expect(result.current.getCreateLabel(lastItem)).toBe("New");

      // Regular items still return false
      expect(result.current.isCreateItem(result.current.items[0])).toBe(false);
    });
  });
});
