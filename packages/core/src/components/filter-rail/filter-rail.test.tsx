import { useMemo, useState, type ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { CollectionControl, Filter } from "@/types/collection";
import { ClearAll, Header, Provider, Root, Sections } from "./filter-rail";
import { Trigger } from "./responsive";
import { Settings } from "./settings";
import type { FilterRailConfig, FilterRailSection, RailLayout } from "./types";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

// ─── Harness ─────────────────────────────────────────────────────────────────

const makeControl = (
  filters: Filter[],
  setFilters: (next: Filter[]) => void,
): CollectionControl => ({
  filters,
  setFilters,
  addFilter: vi.fn(),
  removeFilter: vi.fn(),
  clearFilters: vi.fn(),
  sortStates: [],
  setSort: vi.fn(),
  clearSort: vi.fn(),
  pageSize: 20,
  setPageSize: vi.fn(),
  goToNextPage: vi.fn(),
  goToPrevPage: vi.fn(),
  resetPage: vi.fn(),
  goToFirstPage: vi.fn(),
  goToLastPage: vi.fn(),
  getHasPrevPage: vi.fn(() => false),
  getHasNextPage: vi.fn(() => false),
  resetCount: 0,
});

type HarnessProps = Omit<FilterRailConfig, "control" | "layout"> & {
  "aria-label"?: string;
  className?: string;
  initial?: Filter[];
  initialLayout?: RailLayout;
  onLayoutChange?: (next: RailLayout) => void;
  children?: ReactNode;
};

function Harness({
  initial = [],
  initialLayout,
  onLayoutChange,
  children,
  ...rootProps
}: HarnessProps) {
  const [filters, setFilters] = useState<Filter[]>(initial);
  const [layoutValue, setLayoutValue] = useState<RailLayout | undefined>(initialLayout);
  const control = useMemo(() => makeControl(filters, setFilters), [filters]);
  const layout = layoutValue
    ? {
        value: layoutValue,
        onChange: (next: RailLayout) => {
          onLayoutChange?.(next);
          setLayoutValue(next);
        },
      }
    : undefined;
  return (
    <>
      <Root control={control} layout={layout} {...rootProps}>
        {children ?? <Sections />}
      </Root>
      <pre data-testid="filters">{JSON.stringify(filters)}</pre>
    </>
  );
}

/**
 * The option's checkbox. Queried by row rather than accessible name: Base UI
 * adds `aria-labelledby` pointing at the wrapping <label>, which folds the
 * box's own `aria-label` in a second time (see the report on OptionRow).
 */
const option = (label: string): HTMLElement => {
  const row = Array.from(
    document.querySelectorAll<HTMLElement>('[data-slot="filter-rail-option"]'),
  ).find((candidate) => candidate.querySelector(".astw\\:truncate")?.textContent === label);
  if (!row) throw new Error(`No option row "${label}"`);
  return row.querySelector<HTMLElement>('[role="checkbox"]')!;
};
const hasOption = (label: string) => {
  try {
    option(label);
    return true;
  } catch {
    return false;
  }
};

const currentFilters = (): Filter[] =>
  JSON.parse(screen.getByTestId("filters").textContent ?? "[]") as Filter[];

// ─── Fixtures ────────────────────────────────────────────────────────────────

// 🧪 Dummy Data: sample sections for the rail
const categorySection: FilterRailSection = {
  id: "category",
  label: "Category",
  control: "checkbox",
  field: "category",
  options: [
    { value: "apparel", label: "Apparel" },
    { value: "shoes", label: "Shoes" },
    { value: "bags", label: "Bags" },
  ],
};

const statusSection: FilterRailSection = {
  id: "status",
  label: "Status",
  control: "radio",
  field: "status",
  options: [
    { value: "active", label: "Active" },
    { value: "archived", label: "Archived" },
  ],
};

const inStockSection: FilterRailSection = {
  id: "inStock",
  label: "In stock",
  control: "boolean",
  field: "inStock",
};

const searchSection: FilterRailSection = {
  id: "search",
  label: "Search",
  control: "text",
  field: "name",
  operator: "contains",
  placeholder: "Name…",
  debounceMs: 300,
  minLength: 3,
};

const priceSection: FilterRailSection = {
  id: "price",
  label: "Price",
  control: "numberRange",
  field: "price",
  min: 0,
  max: 1000,
  unit: "$",
};

// ─── Snapshots ───────────────────────────────────────────────────────────────

describe("FilterRail", () => {
  describe("snapshots", () => {
    it("checkbox section", () => {
      const { container } = render(<Harness sections={[categorySection]} />);
      expect(container.innerHTML).toMatchSnapshot();
    });

    it("radio and boolean sections", () => {
      const { container } = render(
        <Harness
          sections={[statusSection, inStockSection]}
          initial={[{ field: "status", operator: "eq", value: "active" }]}
        />,
      );
      expect(container.innerHTML).toMatchSnapshot();
    });

    it("text section", () => {
      const { container } = render(<Harness sections={[searchSection]} />);
      expect(container.innerHTML).toMatchSnapshot();
    });

    it("numberRange section", () => {
      const { container } = render(
        <Harness
          sections={[priceSection]}
          initial={[{ field: "price", operator: "between", value: { min: 10, max: 200 } }]}
        />,
      );
      expect(container.innerHTML).toMatchSnapshot();
    });

    it("compact density", () => {
      const { container } = render(<Harness sections={[categorySection]} density="compact" />);
      expect(container.innerHTML).toMatchSnapshot();
    });

    it("comfortable density", () => {
      const { container } = render(<Harness sections={[categorySection]} density="comfortable" />);
      expect(container.innerHTML).toMatchSnapshot();
    });

    it("with Header and ClearAll", () => {
      const { container } = render(
        <Harness
          sections={[categorySection]}
          initial={[{ field: "category", operator: "in", value: ["apparel"] }]}
        >
          <Header>
            <ClearAll />
          </Header>
          <Sections />
        </Harness>,
      );
      expect(container.innerHTML).toMatchSnapshot();
    });
  });

  // ─── Checkbox ──────────────────────────────────────────────────────────────

  describe("checkbox section", () => {
    it("commits an `in` filter and removes it when the last option is unticked", async () => {
      const user = userEvent.setup();
      const onFilterChange = vi.fn();
      render(<Harness sections={[categorySection]} onFilterChange={onFilterChange} />);

      await user.click(option("Apparel"));
      expect(currentFilters()).toEqual([{ field: "category", operator: "in", value: ["apparel"] }]);
      expect(onFilterChange).toHaveBeenLastCalledWith(
        [{ field: "category", operator: "in", value: ["apparel"] }],
        ["category"],
      );

      await user.click(option("Bags"));
      expect(currentFilters()).toEqual([
        { field: "category", operator: "in", value: ["apparel", "bags"] },
      ]);

      await user.click(option("Apparel"));
      await user.click(option("Bags"));
      expect(currentFilters()).toEqual([]);
    });

    it("respects the `nin` operator", async () => {
      const user = userEvent.setup();
      render(<Harness sections={[{ ...categorySection, operator: "nin" }]} />);
      await user.click(option("Shoes"));
      expect(currentFilters()).toEqual([{ field: "category", operator: "nin", value: ["shoes"] }]);
    });

    it("truncates to `Show N more` and keeps a selected option beyond the limit visible", async () => {
      const user = userEvent.setup();
      const section: FilterRailSection = {
        id: "size",
        label: "Size",
        control: "checkbox",
        field: "size",
        truncate: 2,
        options: ["XS", "S", "M", "L", "XL"].map((value) => ({ value, label: value })),
      };
      render(
        <Harness
          sections={[section]}
          initial={[{ field: "size", operator: "in", value: ["XL"] }]}
        />,
      );

      expect(option("XS")).toBeTruthy();
      expect(option("S")).toBeTruthy();
      expect(hasOption("M")).toBe(false);
      expect(option("XL")).toBeTruthy();
      const more = screen.getByRole("button", { name: "Show 2 more" });

      await user.click(more);
      expect(option("M")).toBeTruthy();
      expect(screen.getByRole("button", { name: "Show less" })).toBeTruthy();
    });

    it("shows `Show N more` with the hidden count", () => {
      const section: FilterRailSection = {
        id: "size",
        label: "Size",
        control: "checkbox",
        field: "size",
        truncate: 2,
        options: ["XS", "S", "M", "L", "XL"].map((value) => ({ value, label: value })),
      };
      render(<Harness sections={[section]} />);
      expect(screen.getByRole("button", { name: "Show 3 more" })).toBeTruthy();
    });

    const withDisabled: FilterRailSection = {
      ...categorySection,
      options: [
        { value: "apparel", label: "Apparel" },
        { value: "shoes", label: "Shoes", disabledReason: "Discontinued" },
      ],
    } as FilterRailSection;

    it("marks an option with a disabledReason aria-disabled and ignores clicks on it", async () => {
      const user = userEvent.setup();
      render(<Harness sections={[withDisabled]} />);
      const shoes = option("Shoes");
      expect(screen.getByRole("checkbox", { name: "Shoes" })).toBe(shoes);
      expect(shoes.getAttribute("aria-disabled")).toBe("true");
      await user.click(shoes);
      expect(currentFilters()).toEqual([]);
      expect(option("Apparel").getAttribute("aria-disabled")).toBeNull();
    });

    it("keeps a selected disabled option enabled so it can be unselected", async () => {
      const user = userEvent.setup();
      render(
        <Harness
          sections={[withDisabled]}
          initial={[{ field: "category", operator: "in", value: ["shoes"] }]}
        />,
      );
      const shoes = option("Shoes");
      expect(shoes.getAttribute("aria-disabled")).toBeNull();
      await user.click(shoes);
      expect(currentFilters()).toEqual([]);
    });

    it("warns when a list is too long for checkboxes (values that keep growing)", () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      const huge: FilterRailSection = {
        id: "product",
        label: "Product",
        control: "checkbox",
        field: "product",
        options: Array.from({ length: 51 }, (_, index) => ({
          value: `p${index}`,
          label: `Product ${index}`,
        })),
      };
      render(<Harness sections={[huge]} />);
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining('section "product" lists 51 options'),
      );
    });
  });

  // ─── Radio / boolean ───────────────────────────────────────────────────────

  describe("radio section", () => {
    it("commits eq and removes the filter on Any", async () => {
      const user = userEvent.setup();
      render(<Harness sections={[statusSection]} />);
      expect((screen.getByRole("radio", { name: "Any" }) as HTMLInputElement).checked).toBe(true);

      await user.click(screen.getByRole("radio", { name: "Archived" }));
      expect(currentFilters()).toEqual([{ field: "status", operator: "eq", value: "archived" }]);

      await user.click(screen.getByRole("radio", { name: "Any" }));
      expect(currentFilters()).toEqual([]);
    });
  });

  describe("boolean section", () => {
    it("commits true and false", async () => {
      const user = userEvent.setup();
      render(<Harness sections={[inStockSection]} />);
      await user.click(screen.getByRole("radio", { name: "Yes" }));
      expect(currentFilters()).toEqual([{ field: "inStock", operator: "eq", value: true }]);
      await user.click(screen.getByRole("radio", { name: "No" }));
      expect(currentFilters()).toEqual([{ field: "inStock", operator: "eq", value: false }]);
      await user.click(screen.getByRole("radio", { name: "Any" }));
      expect(currentFilters()).toEqual([]);
    });

    it('reads the string "true" as checked', () => {
      render(
        <Harness
          sections={[inStockSection]}
          initial={[{ field: "inStock", operator: "eq", value: "true" }]}
        />,
      );
      expect((screen.getByRole("radio", { name: "Yes" }) as HTMLInputElement).checked).toBe(true);
      expect((screen.getByRole("radio", { name: "Any" }) as HTMLInputElement).checked).toBe(false);
    });
  });

  // ─── Number range ──────────────────────────────────────────────────────────

  describe("numberRange section", () => {
    const minInput = () => screen.getByRole("spinbutton", { name: "Minimum Price" });
    const maxInput = () => screen.getByRole("spinbutton", { name: "Maximum Price" });

    it("commits between {min, max} on blur, not per keystroke", () => {
      render(<Harness sections={[priceSection]} />);
      fireEvent.change(minInput(), { target: { value: "10" } });
      fireEvent.change(maxInput(), { target: { value: "200" } });
      expect(currentFilters()).toEqual([]);
      fireEvent.blur(maxInput());
      expect(currentFilters()).toEqual([
        { field: "price", operator: "between", value: { min: 10, max: 200 } },
      ]);
    });

    it("commits only a maximum as lte on Enter", () => {
      render(<Harness sections={[priceSection]} />);
      fireEvent.change(maxInput(), { target: { value: "500" } });
      fireEvent.keyDown(maxInput(), { key: "Enter" });
      expect(currentFilters()).toEqual([{ field: "price", operator: "lte", value: 500 }]);
      expect((minInput() as HTMLInputElement).value).toBe("");
    });

    it("commits only a minimum as gte and leaves the other end empty", () => {
      render(<Harness sections={[priceSection]} />);
      fireEvent.change(minInput(), { target: { value: "10" } });
      fireEvent.blur(minInput());
      expect(currentFilters()).toEqual([{ field: "price", operator: "gte", value: 10 }]);
      expect((maxInput() as HTMLInputElement).value).toBe("");
    });

    it("clears when the ends are emptied one blur at a time", () => {
      render(
        <Harness
          sections={[priceSection]}
          initial={[{ field: "price", operator: "between", value: { min: 10, max: 200 } }]}
        />,
      );
      fireEvent.change(minInput(), { target: { value: "" } });
      fireEvent.blur(minInput());
      expect(currentFilters()).toEqual([{ field: "price", operator: "lte", value: 200 }]);
      fireEvent.change(maxInput(), { target: { value: "" } });
      fireEvent.blur(maxInput());
      expect(currentFilters()).toEqual([]);
    });

    it("removes the filter when both ends are emptied before a blur", () => {
      render(
        <Harness
          sections={[priceSection]}
          initial={[{ field: "price", operator: "between", value: { min: 10, max: 200 } }]}
        />,
      );
      expect((minInput() as HTMLInputElement).value).toBe("10");
      fireEvent.change(minInput(), { target: { value: "" } });
      fireEvent.change(maxInput(), { target: { value: "" } });
      fireEvent.blur(maxInput());
      expect(currentFilters()).toEqual([]);
    });
  });

  // ─── Text ──────────────────────────────────────────────────────────────────

  describe("text section", () => {
    it("debounces the commit by debounceMs", () => {
      vi.useFakeTimers();
      render(<Harness sections={[searchSection]} />);
      const input = screen.getByRole("searchbox", { name: "Search" });

      fireEvent.change(input, { target: { value: "shirt" } });
      act(() => {
        vi.advanceTimersByTime(299);
      });
      expect(currentFilters()).toEqual([]);
      act(() => {
        vi.advanceTimersByTime(1);
      });
      expect(currentFilters()).toEqual([{ field: "name", operator: "contains", value: "shirt" }]);
    });

    it("removes the filter below minLength", () => {
      vi.useFakeTimers();
      render(
        <Harness
          sections={[searchSection]}
          initial={[{ field: "name", operator: "contains", value: "shirt" }]}
        />,
      );
      const input = screen.getByRole("searchbox", { name: "Search" }) as HTMLInputElement;
      expect(input.value).toBe("shirt");

      fireEvent.change(input, { target: { value: "sh" } });
      act(() => {
        vi.advanceTimersByTime(300);
      });
      expect(currentFilters()).toEqual([]);
    });
  });

  // ─── Clear / ClearAll ──────────────────────────────────────────────────────

  describe("clearing", () => {
    const foreign: Filter = { field: "warehouse", operator: "eq", value: "tokyo" };

    it("per-section Clear removes only that section's filter", async () => {
      const user = userEvent.setup();
      render(
        <Harness
          sections={[categorySection, statusSection]}
          initial={[
            foreign,
            { field: "category", operator: "in", value: ["apparel"] },
            { field: "status", operator: "eq", value: "active" },
          ]}
        />,
      );
      const category = document.querySelector<HTMLElement>('[data-section="category"]')!;
      await user.click(within(category).getByRole("button", { name: "Clear" }));
      expect(currentFilters()).toEqual([
        foreign,
        { field: "status", operator: "eq", value: "active" },
      ]);
    });

    it("hides the per-section Clear when clearable is false", () => {
      render(
        <Harness
          sections={[{ ...categorySection, clearable: false }]}
          initial={[{ field: "category", operator: "in", value: ["apparel"] }]}
        />,
      );
      expect(screen.queryByRole("button", { name: "Clear" })).toBeNull();
    });

    it("ClearAll removes rail-owned filters only", async () => {
      const user = userEvent.setup();
      render(
        <Harness
          sections={[categorySection, statusSection]}
          initial={[
            foreign,
            { field: "category", operator: "in", value: ["apparel"] },
            { field: "status", operator: "eq", value: "active" },
          ]}
        >
          <Header>
            <ClearAll />
          </Header>
          <Sections />
        </Harness>,
      );
      await user.click(screen.getByRole("button", { name: "Clear all" }));
      expect(currentFilters()).toEqual([foreign]);
    });

    it("ClearAll renders nothing without an active rail filter", () => {
      render(
        <Harness sections={[categorySection]} initial={[foreign]}>
          <ClearAll />
        </Harness>,
      );
      expect(screen.queryByRole("button", { name: "Clear all" })).toBeNull();
    });
  });

  // ─── Custom ────────────────────────────────────────────────────────────────

  describe("custom section", () => {
    it("composes two setFilter calls made in one handler", async () => {
      const user = userEvent.setup();
      const custom: FilterRailSection = {
        id: "supplier",
        label: "Supplier",
        control: "custom",
        fields: ["supplierId", "supplierRegion"],
        render: ({ setFilter }) => (
          <button
            type="button"
            onClick={() => {
              setFilter("supplierId", { operator: "eq", value: "s-1" });
              setFilter("supplierRegion", { operator: "eq", value: "apac" });
            }}
          >
            Pick both
          </button>
        ),
      };
      render(<Harness sections={[custom]} />);
      await user.click(screen.getByRole("button", { name: "Pick both" }));
      expect(currentFilters()).toEqual([
        { field: "supplierId", operator: "eq", value: "s-1" },
        { field: "supplierRegion", operator: "eq", value: "apac" },
      ]);
    });

    it("passes setFilter / getFilter, and ClearAll clears its declared fields", async () => {
      const user = userEvent.setup();
      const renderSpy = vi.fn();
      const custom: FilterRailSection = {
        id: "supplier",
        label: "Supplier",
        control: "custom",
        fields: ["supplierId", "supplierRegion"],
        render: (context) => {
          renderSpy(context);
          const current = context.getFilter("supplierId");
          return (
            <>
              <span data-testid="custom-value">{String(current?.value ?? "none")}</span>
              <button
                type="button"
                onClick={() => context.setFilter("supplierId", { operator: "eq", value: "s-1" })}
              >
                Pick supplier
              </button>
            </>
          );
        },
      };
      render(
        <Harness
          sections={[custom]}
          initial={[{ field: "supplierRegion", operator: "eq", value: "apac" }]}
        >
          <ClearAll />
          <Sections />
        </Harness>,
      );

      const context = renderSpy.mock.calls[0]![0];
      expect(typeof context.setFilter).toBe("function");
      expect(typeof context.getFilter).toBe("function");
      expect(context.control).toBeTruthy();
      expect(screen.getByTestId("custom-value").textContent).toBe("none");

      await user.click(screen.getByRole("button", { name: "Pick supplier" }));
      expect(currentFilters()).toEqual([
        { field: "supplierRegion", operator: "eq", value: "apac" },
        { field: "supplierId", operator: "eq", value: "s-1" },
      ]);
      expect(screen.getByTestId("custom-value").textContent).toBe("s-1");

      await user.click(screen.getByRole("button", { name: "Clear all" }));
      expect(currentFilters()).toEqual([]);
    });
  });

  // ─── Layout ────────────────────────────────────────────────────────────────

  describe("layout", () => {
    it("hides a section but ClearAll still clears its field", async () => {
      const user = userEvent.setup();
      render(
        <Harness
          sections={[categorySection, statusSection]}
          initialLayout={{ order: [], hidden: ["category"], sort: {} }}
          initial={[{ field: "category", operator: "in", value: ["apparel"] }]}
        >
          <ClearAll />
          <Sections />
        </Harness>,
      );
      expect(document.querySelector('[data-section="category"]')).toBeNull();
      expect(document.querySelector('[data-section="status"]')).toBeTruthy();
      await user.click(screen.getByRole("button", { name: "Clear all" }));
      expect(currentFilters()).toEqual([]);
    });

    it("orders sections by layout.order", () => {
      render(
        <Harness
          sections={[categorySection, statusSection, inStockSection]}
          initialLayout={{ order: ["inStock", "category"], hidden: [], sort: {} }}
        />,
      );
      const ids = Array.from(document.querySelectorAll("[data-section]")).map((node) =>
        node.getAttribute("data-section"),
      );
      expect(ids).toEqual(["inStock", "category", "status"]);
    });
  });

  // ─── Guards ────────────────────────────────────────────────────────────────

  describe("guards", () => {
    it("throws a helpful error when a part renders outside Root", () => {
      vi.spyOn(console, "error").mockImplementation(() => {});
      expect(() => render(<Sections />)).toThrow(
        "<FilterRail.Sections> must be rendered inside <FilterRail.Root> or <FilterRail.Provider>.",
      );
      expect(() => render(<ClearAll />)).toThrow(
        "<FilterRail.ClearAll> must be rendered inside <FilterRail.Root> or <FilterRail.Provider>.",
      );
      expect(() => render(<Header />)).toThrow("<FilterRail.Header>");
      expect(() => render(<Settings />)).toThrow("<FilterRail.Settings>");
    });

    it("warns once about two sections on one field", () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      const duplicate: FilterRailSection = { ...statusSection, id: "status2", field: "category" };
      const { rerender } = render(<Harness sections={[categorySection, duplicate]} />);
      rerender(<Harness sections={[categorySection, { ...duplicate }]} />);
      expect(warn).toHaveBeenCalledTimes(1);
      expect(warn.mock.calls[0]![0]).toContain('both filter "category"');
    });
  });

  // ─── Settings ──────────────────────────────────────────────────────────────

  describe("Settings", () => {
    const emptyLayout: RailLayout = { order: [], hidden: [], sort: {} };

    it("renders nothing without a layout binding", () => {
      render(
        <Harness sections={[categorySection]}>
          <Settings />
        </Harness>,
      );
      expect(screen.queryByRole("button", { name: "Filter settings" })).toBeNull();
    });

    it("unchecking a section hides it", async () => {
      const user = userEvent.setup();
      const onLayoutChange = vi.fn();
      render(
        <Harness
          sections={[categorySection, statusSection]}
          initialLayout={emptyLayout}
          onLayoutChange={onLayoutChange}
        >
          <Settings />
          <Sections />
        </Harness>,
      );
      await user.click(screen.getByRole("button", { name: "Filter settings" }));
      await user.click(await screen.findByRole("checkbox", { name: "Hide Status" }));
      expect(onLayoutChange).toHaveBeenLastCalledWith({ ...emptyLayout, hidden: ["status"] });
      expect(document.querySelector('[data-section="status"]')).toBeNull();
      expect(await screen.findByRole("checkbox", { name: "Show Status" })).toBeTruthy();
    });

    it("hiding a filtered section also clears its filter", async () => {
      const user = userEvent.setup();
      const onLayoutChange = vi.fn();
      render(
        <Harness
          sections={[categorySection, statusSection]}
          initialLayout={emptyLayout}
          onLayoutChange={onLayoutChange}
          initial={[
            { field: "category", operator: "in", value: ["apparel"] },
            { field: "status", operator: "eq", value: "active" },
          ]}
        >
          <Settings />
          <Sections />
        </Harness>,
      );
      await user.click(screen.getByRole("button", { name: "Filter settings" }));
      await user.click(
        await screen.findByRole("checkbox", {
          name: "Hide Category, which also clears its filter",
        }),
      );
      expect(onLayoutChange).toHaveBeenLastCalledWith({ ...emptyLayout, hidden: ["category"] });
      expect(currentFilters()).toEqual([{ field: "status", operator: "eq", value: "active" }]);
    });

    it("ArrowDown on the reorder handle moves the section down", async () => {
      const user = userEvent.setup();
      const onLayoutChange = vi.fn();
      render(
        <Harness
          sections={[categorySection, statusSection, inStockSection]}
          initialLayout={emptyLayout}
          onLayoutChange={onLayoutChange}
        >
          <Settings />
          <Sections />
        </Harness>,
      );
      await user.click(screen.getByRole("button", { name: "Filter settings" }));
      const handle = await screen.findByRole("button", {
        name: "Reorder Category. Use arrow up and down.",
      });
      fireEvent.keyDown(handle, { key: "ArrowDown" });
      expect(onLayoutChange).toHaveBeenLastCalledWith({
        ...emptyLayout,
        order: ["status", "category", "inStock"],
      });
      const ids = Array.from(document.querySelectorAll("[data-section]")).map((node) =>
        node.getAttribute("data-section"),
      );
      expect(ids).toEqual(["status", "category", "inStock"]);
    });

    it("ArrowUp on the first row does nothing", async () => {
      const user = userEvent.setup();
      const onLayoutChange = vi.fn();
      render(
        <Harness
          sections={[categorySection, statusSection]}
          initialLayout={emptyLayout}
          onLayoutChange={onLayoutChange}
        >
          <Settings />
        </Harness>,
      );
      await user.click(screen.getByRole("button", { name: "Filter settings" }));
      const handle = await screen.findByRole("button", {
        name: "Reorder Category. Use arrow up and down.",
      });
      fireEvent.keyDown(handle, { key: "ArrowUp" });
      expect(onLayoutChange).not.toHaveBeenCalled();
    });
  });

  // ─── Narrow screens ────────────────────────────────────────────────────────

  describe("narrow screens", () => {
    /** Pretend the viewport is below `lg`. jsdom has no matchMedia of its own. */
    const narrow = () => {
      vi.stubGlobal(
        "matchMedia",
        vi.fn(() => ({
          matches: true,
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
        })),
      );
    };
    afterEach(() => vi.unstubAllGlobals());

    const active: Filter[] = [
      { field: "category", operator: "in", value: ["apparel"] },
      { field: "status", operator: "eq", value: "active" },
      { field: "warehouse", operator: "eq", value: "tokyo" },
    ];

    it("renders the rail inline and no button on wide screens", () => {
      render(<Harness sections={[categorySection]} />);
      expect(screen.getByRole("complementary", { name: "Filters" })).toBeTruthy();
      expect(screen.queryByRole("button", { name: /^Filters/ })).toBeNull();
    });

    it("collapses into a fallback button with the active count when no Trigger is placed", async () => {
      narrow();
      const user = userEvent.setup();
      render(<Harness sections={[categorySection, statusSection]} initial={active} />);
      expect(screen.queryByRole("complementary")).toBeNull();
      // Two of the three filters are the rail's own; "warehouse" is not counted.
      const button = screen.getByRole("button", { name: "Filters, 2 active" });
      await user.click(button);
      const dialog = await screen.findByRole("dialog");
      expect(within(dialog).getByRole("complementary", { name: "Filters" })).toBeTruthy();
    });

    function PlacedTrigger() {
      const [filters, setFilters] = useState<Filter[]>(active);
      const control = useMemo(() => makeControl(filters, setFilters), [filters]);
      return (
        <Provider control={control} sections={[categorySection, statusSection]}>
          <div data-testid="toolbar">
            <Trigger />
          </div>
          <Root>
            <Sections />
          </Root>
        </Provider>
      );
    }

    it("uses a Trigger placed elsewhere and skips the fallback", async () => {
      narrow();
      const user = userEvent.setup();
      render(<PlacedTrigger />);
      const buttons = screen.getAllByRole("button", { name: "Filters, 2 active" });
      expect(buttons).toHaveLength(1);
      expect(within(screen.getByTestId("toolbar")).getByRole("button")).toBe(buttons[0]);
      await user.click(buttons[0]!);
      expect(await screen.findByRole("dialog")).toBeTruthy();
    });

    it("renders the Trigger as nothing on wide screens", () => {
      render(<PlacedTrigger />);
      expect(within(screen.getByTestId("toolbar")).queryByRole("button")).toBeNull();
      expect(screen.getByRole("complementary", { name: "Filters" })).toBeTruthy();
    });

    it("throws a helpful error for a Trigger outside a Provider", () => {
      vi.spyOn(console, "error").mockImplementation(() => {});
      expect(() => render(<Trigger />)).toThrow(
        /inside <FilterRail.Root> or <FilterRail.Provider>/,
      );
    });

    it("throws a helpful error for a Root with no config and no Provider", () => {
      vi.spyOn(console, "error").mockImplementation(() => {});
      expect(() =>
        render(
          <Root>
            <Sections />
          </Root>,
        ),
      ).toThrow(/needs `control` and `sections`/);
    });
  });

  // ─── Review fixes ──────────────────────────────────────────────────────────

  describe("hardening", () => {
    it("keeps keys typed after its own debounced commit", () => {
      vi.useFakeTimers();
      render(<Harness sections={[searchSection]} />);
      const input = screen.getByRole("searchbox", { name: "Search" }) as HTMLInputElement;
      fireEvent.change(input, { target: { value: "boot" } });
      act(() => vi.advanceTimersByTime(300));
      expect(currentFilters()).toEqual([{ field: "name", operator: "contains", value: "boot" }]);
      fireEvent.change(input, { target: { value: "boots" } });
      expect(input.value).toBe("boots");
    });

    it("resets the text draft when the filter is cleared elsewhere", () => {
      vi.useFakeTimers();
      render(
        <Harness
          sections={[searchSection]}
          initial={[{ field: "name", operator: "contains", value: "boot" }]}
        >
          <ClearAll />
          <Sections />
        </Harness>,
      );
      const input = screen.getByRole("searchbox", { name: "Search" }) as HTMLInputElement;
      expect(input.value).toBe("boot");
      fireEvent.click(screen.getByRole("button", { name: "Clear all" }));
      expect(input.value).toBe("");
    });

    it("swaps a number range typed the wrong way round", () => {
      render(<Harness sections={[priceSection]} />);
      const min = screen.getByRole("spinbutton", { name: "Minimum Price" }) as HTMLInputElement;
      const max = screen.getByRole("spinbutton", { name: "Maximum Price" }) as HTMLInputElement;
      fireEvent.change(min, { target: { value: "500" } });
      fireEvent.change(max, { target: { value: "10" } });
      fireEvent.blur(max);
      expect(currentFilters()).toEqual([
        { field: "price", operator: "between", value: { min: 10, max: 500 } },
      ]);
      expect(min.value).toBe("10");
      expect(max.value).toBe("500");
    });

    it("offers value search as soon as a list is long enough to truncate", () => {
      const section: FilterRailSection = {
        id: "color",
        label: "Color",
        control: "checkbox",
        field: "color",
        options: ["Black", "White", "Navy", "Olive", "Sand", "Grey", "Red", "Blue", "Green"].map(
          (value) => ({ value, label: value }),
        ),
      };
      render(<Harness sections={[section]} />);
      expect(screen.getByRole("searchbox", { name: "Filter Color options" })).toBeTruthy();
    });
  });

  // ─── Collapsing sections ───────────────────────────────────────────────────

  describe("collapsing sections", () => {
    const toggle = (name: string) => screen.getByRole("button", { name });

    it("expands by default and collapses from the title", async () => {
      const user = userEvent.setup();
      render(<Harness sections={[categorySection]} />);
      const button = toggle("Category");
      expect(button.getAttribute("aria-expanded")).toBe("true");
      expect(screen.getByRole("checkbox", { name: "Apparel" })).toBeTruthy();
      await user.click(button);
      expect(button.getAttribute("aria-expanded")).toBe("false");
      expect(screen.queryByRole("checkbox", { name: "Apparel" })).toBeNull();
      await user.click(button);
      expect(screen.getByRole("checkbox", { name: "Apparel" })).toBeTruthy();
    });

    it("starts collapsed with defaultCollapsed", () => {
      render(<Harness sections={[{ ...categorySection, defaultCollapsed: true }]} />);
      expect(toggle("Category").getAttribute("aria-expanded")).toBe("false");
      expect(screen.queryByRole("checkbox", { name: "Apparel" })).toBeNull();
    });

    it("shows the selected count and keeps Clear while collapsed, so no filter is hidden", async () => {
      const user = userEvent.setup();
      render(
        <Harness
          sections={[categorySection]}
          initial={[{ field: "category", operator: "in", value: ["apparel", "bags"] }]}
        />,
      );
      // Expanded: the selection is visible in the list, so no badge.
      expect(document.querySelector('[data-slot="filter-rail-section-badge"]')).toBeNull();
      await user.click(toggle("Category"));
      const badge = document.querySelector('[data-slot="filter-rail-section-badge"]')!;
      expect(badge.textContent).toContain("2");
      expect(within(badge as HTMLElement).getByText("2 selected")).toBeTruthy();
      await user.click(screen.getByRole("button", { name: "Clear" }));
      expect(currentFilters()).toEqual([]);
      expect(document.querySelector('[data-slot="filter-rail-section-badge"]')).toBeNull();
    });

    it("keeps a section's search text across collapse and expand", async () => {
      const user = userEvent.setup();
      const color: FilterRailSection = {
        id: "color",
        label: "Color",
        control: "checkbox",
        field: "color",
        options: ["Black", "White", "Navy", "Olive", "Sand", "Grey", "Red", "Blue", "Green"].map(
          (value) => ({ value, label: value }),
        ),
      };
      render(<Harness sections={[color]} />);
      await user.type(screen.getByRole("searchbox", { name: "Filter Color options" }), "bl");
      await user.click(toggle("Color"));
      await user.click(toggle("Color"));
      expect(
        (screen.getByRole("searchbox", { name: "Filter Color options" }) as HTMLInputElement).value,
      ).toBe("bl");
    });
  });
});
