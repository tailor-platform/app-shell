import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor, renderHook, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ComboboxParts } from "./combobox";

const Combobox = { Parts: ComboboxParts };

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
    <Combobox.Parts.Root {...props}>
      <Combobox.Parts.Input data-testid="input" placeholder="Search fruits..." />
      <Combobox.Parts.Content>
        <Combobox.Parts.List>
          {fruits.map((fruit) => (
            <Combobox.Parts.Item key={fruit} value={fruit}>
              {fruit}
            </Combobox.Parts.Item>
          ))}
          <Combobox.Parts.Empty>No results found</Combobox.Parts.Empty>
        </Combobox.Parts.List>
      </Combobox.Parts.Content>
    </Combobox.Parts.Root>
  );
}

describe("Combobox.Parts", () => {
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
      <Combobox.Parts.Root>
        <Combobox.Parts.Input data-testid="input" className="custom-class" />
        <Combobox.Parts.Content>
          <Combobox.Parts.List>
            <Combobox.Parts.Item value="a">Apple</Combobox.Parts.Item>
          </Combobox.Parts.List>
        </Combobox.Parts.Content>
      </Combobox.Parts.Root>,
    );

    expect(screen.getByTestId("input").classList.contains("custom-class")).toBe(true);
  });

  it("renders groups with labels", async () => {
    const user = userEvent.setup();

    render(
      <Combobox.Parts.Root>
        <Combobox.Parts.Input data-testid="input" />
        <Combobox.Parts.Content>
          <Combobox.Parts.List>
            <Combobox.Parts.Group>
              <Combobox.Parts.GroupLabel>Fruits</Combobox.Parts.GroupLabel>
              <Combobox.Parts.Item value="apple">Apple</Combobox.Parts.Item>
            </Combobox.Parts.Group>
          </Combobox.Parts.List>
        </Combobox.Parts.Content>
      </Combobox.Parts.Root>,
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
      <Combobox.Parts.Root>
        <div style={{ position: "relative" }}>
          <Combobox.Parts.Input data-testid="input" />
          <Combobox.Parts.Trigger data-testid="trigger" />
        </div>
        <Combobox.Parts.Content>
          <Combobox.Parts.List>
            <Combobox.Parts.Item value="a">Apple</Combobox.Parts.Item>
          </Combobox.Parts.List>
        </Combobox.Parts.Content>
      </Combobox.Parts.Root>,
    );

    expect(screen.getByTestId("trigger")).toBeDefined();
  });

  it("renders the clear button", () => {
    render(
      <Combobox.Parts.Root defaultValue="Apple">
        <div style={{ position: "relative" }}>
          <Combobox.Parts.Input data-testid="input" />
          <Combobox.Parts.Clear data-testid="clear" />
        </div>
        <Combobox.Parts.Content>
          <Combobox.Parts.List>
            <Combobox.Parts.Item value="Apple">Apple</Combobox.Parts.Item>
          </Combobox.Parts.List>
        </Combobox.Parts.Content>
      </Combobox.Parts.Root>,
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

describe("Combobox.Parts.useCreatable", () => {
  describe("multiple mode", () => {
    const defaultOptions = {
      items: initialTags,
      multiple: true as const,
      getLabel: (item: Tag) => item.name,
      createItem: createTag,
    };

    it("returns items unchanged when inputValue is empty", () => {
      const { result } = renderHook(() => Combobox.Parts.useCreatable(defaultOptions));
      expect(result.current.items).toBe(initialTags);
      expect(result.current.value).toEqual([]);
      expect(result.current.multiple).toBe(true);
    });

    it("appends a sentinel item when query has no exact match", () => {
      const { result } = renderHook(() => Combobox.Parts.useCreatable(defaultOptions));

      act(() => {
        result.current.onInputValueChange("Svelte");
      });

      expect(result.current.items).toHaveLength(4);
      expect(result.current.isCreateItem(result.current.items[3])).toBe(true);
      expect(result.current.getCreateLabel(result.current.items[3])).toBe("Svelte");
    });

    it("does not append sentinel when query exactly matches an item (case-insensitive)", () => {
      const { result } = renderHook(() => Combobox.Parts.useCreatable(defaultOptions));

      act(() => {
        result.current.onInputValueChange("react");
      });

      expect(result.current.items).toHaveLength(3);
    });

    it("creates item immediately with sync onItemCreated", () => {
      const onItemCreated = vi.fn((_item: Tag, resolve: (accept?: boolean) => void) => resolve());
      const onValueChange = vi.fn();

      const { result } = renderHook(() =>
        Combobox.Parts.useCreatable({
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
        Combobox.Parts.useCreatable({
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
        Combobox.Parts.useCreatable({
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
        Combobox.Parts.useCreatable({
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
        Combobox.Parts.useCreatable({
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
        Combobox.Parts.useCreatable({
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
        Combobox.Parts.useCreatable({
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
        Combobox.Parts.useCreatable({
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
        Combobox.Parts.useCreatable({
          ...defaultOptions,
          defaultValue: [initialTags[0]],
        }),
      );

      expect(result.current.value).toEqual([initialTags[0]]);
    });

    it("uses custom formatCreateLabel", () => {
      const { result } = renderHook(() =>
        Combobox.Parts.useCreatable({
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
      const { result } = renderHook(() => Combobox.Parts.useCreatable(defaultOptions));

      expect(result.current.value).toBeNull();
      expect(result.current.multiple).toBe(false);
    });

    it("creates and selects item for single select", () => {
      const onItemCreated = vi.fn((_item: Tag, resolve: (accept?: boolean) => void) => resolve());
      const onValueChange = vi.fn();

      const { result } = renderHook(() =>
        Combobox.Parts.useCreatable({
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
        Combobox.Parts.useCreatable({
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
        Combobox.Parts.useCreatable({
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
        Combobox.Parts.useCreatable({
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
        Combobox.Parts.useCreatable({
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
        Combobox.Parts.useCreatable({
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
        Combobox.Parts.useCreatable({
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

  // =========================================================================
  // Edge cases — whitespace & trimming
  // =========================================================================

  describe("whitespace and trimming", () => {
    const defaultOptions = {
      items: initialTags,
      multiple: true as const,
      getLabel: (item: Tag) => item.name,
      createItem: createTag,
    };

    it("trims leading/trailing whitespace for sentinel check", () => {
      const { result } = renderHook(() => Combobox.Parts.useCreatable(defaultOptions));

      act(() => {
        result.current.onInputValueChange("  Svelte  ");
      });

      // Sentinel should appear with trimmed label
      const sentinel = result.current.items.find((item) => result.current.isCreateItem(item));
      expect(sentinel).toBeDefined();
      expect(result.current.getCreateLabel(sentinel!)).toBe("Svelte");
    });

    it("does not append sentinel for whitespace-only input", () => {
      const { result } = renderHook(() => Combobox.Parts.useCreatable(defaultOptions));

      act(() => {
        result.current.onInputValueChange("   ");
      });

      expect(result.current.items).toHaveLength(3); // unchanged
    });

    it("matches exact item even with leading/trailing spaces in query", () => {
      const { result } = renderHook(() => Combobox.Parts.useCreatable(defaultOptions));

      act(() => {
        result.current.onInputValueChange("  React  ");
      });

      // No sentinel — exact match exists
      expect(result.current.items).toHaveLength(3);
    });
  });

  // =========================================================================
  // Edge cases — resolve idempotency
  // =========================================================================

  describe("resolve idempotency", () => {
    it("ignores duplicate resolve() calls", () => {
      let savedResolve!: (accept?: boolean) => void;
      const onValueChange = vi.fn();

      const { result } = renderHook(() =>
        Combobox.Parts.useCreatable({
          items: initialTags,
          multiple: true as const,
          getLabel: (item: Tag) => item.name,
          createItem: createTag,
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

      // First resolve → accept
      act(() => {
        savedResolve();
      });
      expect(onValueChange).toHaveBeenCalledTimes(1);

      // Second resolve → ignored
      act(() => {
        savedResolve();
      });
      expect(onValueChange).toHaveBeenCalledTimes(1);
    });

    it("ignores resolve(false) after resolve(true)", () => {
      let savedResolve!: (accept?: boolean) => void;
      const onValueChange = vi.fn();

      const { result } = renderHook(() =>
        Combobox.Parts.useCreatable({
          items: initialTags,
          getLabel: (item: Tag) => item.name,
          createItem: createTag,
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
        result.current.onValueChange(sentinel);
      });

      act(() => {
        savedResolve(true);
      });
      expect(result.current.value).toEqual(expect.objectContaining({ name: "Svelte" }));

      // Second call with false is ignored
      act(() => {
        savedResolve(false);
      });
      expect(result.current.value).toEqual(expect.objectContaining({ name: "Svelte" }));
    });
  });

  // =========================================================================
  // Edge cases — pendingCreateLabelRef (input preserved during async)
  // =========================================================================

  describe("pendingCreateLabelRef (single mode async)", () => {
    it("preserves input value during deferred creation in single mode", () => {
      let savedResolve!: (accept?: boolean) => void;

      const { result } = renderHook(() =>
        Combobox.Parts.useCreatable({
          items: initialTags,
          getLabel: (item: Tag) => item.name,
          createItem: createTag,
          onItemCreated: (_item, resolve) => {
            savedResolve = resolve;
          },
        }),
      );

      act(() => {
        result.current.onInputValueChange("Svelte");
      });

      const sentinel = result.current.items.find((item) => result.current.isCreateItem(item))!;

      act(() => {
        result.current.onValueChange(sentinel);
      });

      // Input should show "Svelte" while pending
      expect(result.current.inputValue).toBe("Svelte");

      // Trying to clear input while pending should be ignored
      act(() => {
        result.current.onInputValueChange("");
      });
      expect(result.current.inputValue).toBe("Svelte");

      // Resolve → clears pending flag
      act(() => {
        savedResolve();
      });

      expect(result.current.value).toEqual(expect.objectContaining({ name: "Svelte" }));
    });

    it("clears input when deferred creation is cancelled in single mode", () => {
      let savedResolve!: (accept?: boolean) => void;

      const { result } = renderHook(() =>
        Combobox.Parts.useCreatable({
          items: initialTags,
          getLabel: (item: Tag) => item.name,
          createItem: createTag,
          onItemCreated: (_item, resolve) => {
            savedResolve = resolve;
          },
        }),
      );

      act(() => {
        result.current.onInputValueChange("Svelte");
      });

      const sentinel = result.current.items.find((item) => result.current.isCreateItem(item))!;

      act(() => {
        result.current.onValueChange(sentinel);
      });

      act(() => {
        savedResolve(false);
      });

      expect(result.current.inputValue).toBe("");
      expect(result.current.value).toBeNull();
    });
  });

  // =========================================================================
  // Edge cases — itemToStringLabel / itemToStringValue
  // =========================================================================

  describe("itemToStringLabel / itemToStringValue", () => {
    const defaultOptions = {
      items: initialTags,
      getLabel: (item: Tag) => item.name,
      createItem: createTag,
    };

    it("returns formatted create label for sentinel item", () => {
      const { result } = renderHook(() => Combobox.Parts.useCreatable(defaultOptions));

      act(() => {
        result.current.onInputValueChange("Svelte");
      });

      const sentinel = result.current.items.find((item) => result.current.isCreateItem(item))!;
      expect(result.current.itemToStringLabel(sentinel)).toBe('Create "Svelte"');
    });

    it("returns getLabel for regular items", () => {
      const { result } = renderHook(() => Combobox.Parts.useCreatable(defaultOptions));

      expect(result.current.itemToStringLabel(initialTags[0])).toBe("React");
    });

    it("returns empty string for sentinel itemToStringValue", () => {
      const { result } = renderHook(() => Combobox.Parts.useCreatable(defaultOptions));

      act(() => {
        result.current.onInputValueChange("Svelte");
      });

      const sentinel = result.current.items.find((item) => result.current.isCreateItem(item))!;
      expect(result.current.itemToStringValue(sentinel)).toBe("");
    });

    it("returns getLabel for regular items in itemToStringValue", () => {
      const { result } = renderHook(() => Combobox.Parts.useCreatable(defaultOptions));

      expect(result.current.itemToStringValue(initialTags[0])).toBe("React");
    });
  });

  // =========================================================================
  // Edge cases — mixed workflow (multiple mode)
  // =========================================================================

  describe("mixed workflow (multiple mode)", () => {
    it("select normal items then create a new one", () => {
      const onItemCreated = vi.fn((_item: Tag, resolve: (accept?: boolean) => void) => resolve());
      const onValueChange = vi.fn();

      const { result } = renderHook(() =>
        Combobox.Parts.useCreatable({
          items: initialTags,
          multiple: true as const,
          getLabel: (item: Tag) => item.name,
          createItem: createTag,
          onItemCreated,
          onValueChange,
        }),
      );

      // Select existing items first
      act(() => {
        result.current.onValueChange([initialTags[0], initialTags[1]]);
      });

      expect(result.current.value).toEqual([initialTags[0], initialTags[1]]);

      // Now type and create
      act(() => {
        result.current.onInputValueChange("Svelte");
      });

      const sentinel = result.current.items.find((item) => result.current.isCreateItem(item))!;

      // Select sentinel along with existing selections
      act(() => {
        result.current.onValueChange([initialTags[0], initialTags[1], sentinel]);
      });

      expect(onItemCreated).toHaveBeenCalledWith(
        expect.objectContaining({ name: "Svelte" }),
        expect.any(Function),
      );
      // After create, value includes existing + new
      expect(result.current.value).toHaveLength(3);
    });

    it("clears input after creating in multiple mode", () => {
      const { result } = renderHook(() =>
        Combobox.Parts.useCreatable({
          items: initialTags,
          multiple: true as const,
          getLabel: (item: Tag) => item.name,
          createItem: createTag,
          onItemCreated: (_item, resolve) => resolve(),
        }),
      );

      act(() => {
        result.current.onInputValueChange("Svelte");
      });

      const sentinel = result.current.items.find((item) => result.current.isCreateItem(item))!;

      act(() => {
        result.current.onValueChange([sentinel]);
      });

      expect(result.current.inputValue).toBe("");
    });
  });

  // =========================================================================
  // Edge cases — no onItemCreated (immediate creation)
  // =========================================================================

  describe("no onItemCreated (immediate creation)", () => {
    it("creates item immediately without onItemCreated callback in single mode", () => {
      const onValueChange = vi.fn();

      const { result } = renderHook(() =>
        Combobox.Parts.useCreatable({
          items: initialTags,
          getLabel: (item: Tag) => item.name,
          createItem: createTag,
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

      expect(onValueChange).toHaveBeenCalledWith(expect.objectContaining({ name: "Svelte" }));
      expect(result.current.value).toEqual(expect.objectContaining({ name: "Svelte" }));
    });

    it("creates item immediately without onItemCreated callback in multiple mode", () => {
      const onValueChange = vi.fn();

      const { result } = renderHook(() =>
        Combobox.Parts.useCreatable({
          items: initialTags,
          multiple: true as const,
          getLabel: (item: Tag) => item.name,
          createItem: createTag,
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

      expect(onValueChange).toHaveBeenCalledWith([expect.objectContaining({ name: "Svelte" })]);
      expect(result.current.value).toHaveLength(1);
    });
  });
});

// ============================================================================
// Combobox.Parts.useAsync tests
// ============================================================================

describe("Combobox.Parts.useAsync", () => {
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

  it("returns correct shape", () => {
    const fetcher = vi.fn(async () => []);
    const { result } = renderHook(() => Combobox.Parts.useAsync({ fetcher }));

    expect(result.current).toHaveProperty("items");
    expect(result.current).toHaveProperty("loading");
    expect(result.current).toHaveProperty("query");
    expect(result.current).toHaveProperty("error");
    expect(result.current).toHaveProperty("onInputValueChange");
  });

  it("fetches items after debounce", async () => {
    const items = [{ id: 1, name: "React" }];
    const fetcher = vi.fn(async () => items);

    const { result } = renderHook(() => Combobox.Parts.useAsync({ fetcher }));

    act(() => {
      result.current.onInputValueChange("react");
    });

    expect(fetcher).not.toHaveBeenCalled();
    expect(result.current.loading).toBe(true);

    await advanceAndFlush(300);

    expect(fetcher).toHaveBeenCalledWith(
      "react",
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
    expect(result.current.items).toEqual(items);
    expect(result.current.loading).toBe(false);
  });

  it("updates query on input change", () => {
    const fetcher = vi.fn(async () => []);
    const { result } = renderHook(() => Combobox.Parts.useAsync({ fetcher }));

    act(() => {
      result.current.onInputValueChange("hello");
    });

    expect(result.current.query).toBe("hello");
  });

  it("respects custom debounceMs", async () => {
    const fetcher = vi.fn(async () => ["a"]);
    const { result } = renderHook(() => Combobox.Parts.useAsync({ fetcher, debounceMs: 100 }));

    act(() => {
      result.current.onInputValueChange("test");
    });

    await advanceAndFlush(50);
    expect(fetcher).not.toHaveBeenCalled();

    await advanceAndFlush(50);
    expect(fetcher).toHaveBeenCalledOnce();
  });

  it("clears items when input is empty", async () => {
    const fetcher = vi.fn(async () => ["a", "b"]);
    const { result } = renderHook(() => Combobox.Parts.useAsync({ fetcher }));

    act(() => {
      result.current.onInputValueChange("test");
    });
    await advanceAndFlush(300);
    expect(result.current.items).toEqual(["a", "b"]);

    act(() => {
      result.current.onInputValueChange("");
    });
    expect(result.current.items).toEqual([]);
  });

  it("captures fetcher errors", async () => {
    const error = new Error("API error");
    const fetcher = vi.fn(async () => {
      throw error;
    });
    const { result } = renderHook(() => Combobox.Parts.useAsync({ fetcher }));

    act(() => {
      result.current.onInputValueChange("test");
    });
    await advanceAndFlush(300);

    expect(result.current.error).toBe(error);
    expect(result.current.items).toEqual([]);
  });

  it("cancels previous request on new input", async () => {
    let capturedSignals: AbortSignal[] = [];
    const fetcher = vi.fn(async (_q: string, opts: { signal: AbortSignal }) => {
      capturedSignals.push(opts.signal);
      return new Promise<string[]>((resolve) => {
        setTimeout(() => resolve([_q]), 200);
      });
    });

    const { result } = renderHook(() => Combobox.Parts.useAsync({ fetcher }));

    act(() => {
      result.current.onInputValueChange("first");
    });
    await advanceAndFlush(300);

    act(() => {
      result.current.onInputValueChange("second");
    });
    await advanceAndFlush(300);

    expect(capturedSignals[0].aborted).toBe(true);
  });
});
