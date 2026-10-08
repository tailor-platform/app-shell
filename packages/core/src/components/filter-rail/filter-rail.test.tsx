import { useMemo, useState, type ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { CollectionControl, Filter } from "@/types/collection";
import { ClearAll, Header, Root, Sections } from "./filter-rail";
import { Trigger } from "./responsive";
import { SavedViews } from "./saved-views";
import { Settings } from "./settings";
import type {
  FacetCounts,
  FilterRailRootProps,
  FilterRailSection,
  RailLayout,
  SavedView,
} from "./types";

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

type HarnessProps = Omit<FilterRailRootProps, "control" | "children" | "layout"> & {
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

const categoryCounts: FacetCounts = {
  live: { category: { apparel: 1380, shoes: 0, bags: 12 } },
};

// 🧪 Dummy Data: saved views
const view = (id: string, name: string): SavedView => ({
  id,
  name,
  createdAt: "2026-09-30T00:00:00.000Z",
  state: { filters: [], sort: [], pageSize: 20, columnOrder: [], hidden: [], pinned: {} },
});

// ─── Snapshots ───────────────────────────────────────────────────────────────

describe("FilterRail", () => {
  describe("snapshots", () => {
    it("checkbox section with counts", () => {
      const { container } = render(
        <Harness sections={[categorySection]} counts={categoryCounts} />,
      );
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

    it("marks a zero-count option aria-disabled and ignores clicks on it", async () => {
      const user = userEvent.setup();
      render(<Harness sections={[categorySection]} counts={categoryCounts} />);
      const shoes = option("Shoes");
      // The label is the name, announced once; the count is the description.
      expect(screen.getByRole("checkbox", { name: "Shoes", description: "0 items" })).toBe(shoes);
      expect(screen.getByRole("checkbox", { name: "Apparel", description: "1,380 items" })).toBe(
        option("Apparel"),
      );
      expect(shoes.getAttribute("aria-disabled")).toBe("true");
      await user.click(shoes);
      expect(currentFilters()).toEqual([]);
      expect(option("Apparel").getAttribute("aria-disabled")).toBeNull();
    });

    it("keeps a selected zero-count option enabled so it can be unselected", async () => {
      const user = userEvent.setup();
      render(
        <Harness
          sections={[categorySection]}
          counts={categoryCounts}
          initial={[{ field: "category", operator: "in", value: ["shoes"] }]}
        />,
      );
      const shoes = option("Shoes");
      expect(shoes.getAttribute("aria-disabled")).toBeNull();
      await user.click(shoes);
      expect(currentFilters()).toEqual([]);
    });

    it('keeps zero-count options enabled with zeroBehavior "show"', async () => {
      const user = userEvent.setup();
      render(<Harness sections={[categorySection]} counts={categoryCounts} zeroBehavior="show" />);
      const shoes = option("Shoes");
      expect(shoes.getAttribute("aria-disabled")).toBeNull();
      await user.click(shoes);
      expect(currentFilters()).toEqual([{ field: "category", operator: "in", value: ["shoes"] }]);
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

  // ─── Recovery ──────────────────────────────────────────────────────────────

  describe("empty-result recovery", () => {
    it("suggests clearing a section when total is 0", async () => {
      const user = userEvent.setup();
      render(
        <Harness
          sections={[categorySection, statusSection]}
          counts={{ live: {}, total: 0, withoutSection: { category: 42, status: 0 } }}
          initial={[
            { field: "category", operator: "in", value: ["apparel"] },
            { field: "status", operator: "eq", value: "archived" },
          ]}
        />,
      );
      const status = screen.getByRole("status");
      expect(status.textContent).toContain("Nothing matches these filters.");
      expect(within(status).queryByRole("button", { name: /Status/ })).toBeNull();
      await user.click(within(status).getByRole("button", { name: "Clear Category to see 42" }));
      expect(currentFilters()).toEqual([{ field: "status", operator: "eq", value: "archived" }]);
    });

    it("renders nothing when rows remain", () => {
      render(
        <Harness
          sections={[categorySection]}
          counts={{ live: {}, total: 3, withoutSection: { category: 42 } }}
          initial={[{ field: "category", operator: "in", value: ["apparel"] }]}
        />,
      );
      expect(screen.queryByRole("status")).toBeNull();
    });
  });

  // ─── Guards ────────────────────────────────────────────────────────────────

  describe("guards", () => {
    it("throws a helpful error when a part renders outside Root", () => {
      vi.spyOn(console, "error").mockImplementation(() => {});
      expect(() => render(<Sections />)).toThrow(
        "<FilterRail.Sections> must be rendered inside <FilterRail.Root>.",
      );
      expect(() => render(<ClearAll />)).toThrow(
        "<FilterRail.ClearAll> must be rendered inside <FilterRail.Root>.",
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

  // ─── SavedViews ────────────────────────────────────────────────────────────

  describe("SavedViews", () => {
    const binding = (overrides: Partial<Parameters<typeof SavedViews>[0]> = {}) => ({
      items: [view("v1", "Low stock"), view("v2", "Wide view")],
      activeId: null,
      dirty: false,
      onSave: vi.fn(),
      onApply: vi.fn(),
      onDelete: vi.fn(),
      ...overrides,
    });

    it("renders the Saved views trigger and hides Save while clean", () => {
      const { container } = render(<SavedViews {...binding()} />);
      expect(container.innerHTML).toMatchSnapshot();
      expect(screen.getByRole("button", { name: /Saved views/ })).toBeTruthy();
      expect(screen.queryByRole("button", { name: "Save view" })).toBeNull();
    });

    it("shows the active view's name on the trigger", () => {
      render(<SavedViews {...binding({ activeId: "v2" })} />);
      expect(screen.getByRole("button", { name: /Wide view/ })).toBeTruthy();
    });

    it("dirty shows Save view, and the dialog saves via onSave(name)", async () => {
      const user = userEvent.setup();
      const props = binding({ dirty: true });
      render(<SavedViews {...props} />);
      await user.click(screen.getByRole("button", { name: "Save view" }));
      const input = await screen.findByRole("textbox", { name: "Save this view" });
      const dialog = screen.getByRole("dialog");
      const save = within(dialog).getByRole("button", { name: "Save" }) as HTMLButtonElement;
      expect(save.disabled).toBe(true);
      await user.type(input, "  My view  ");
      await user.click(save);
      expect(props.onSave).toHaveBeenCalledWith("My view");
    });

    it("Enter in the name input saves", async () => {
      const user = userEvent.setup();
      const props = binding({ dirty: true });
      render(<SavedViews {...props} />);
      await user.click(screen.getByRole("button", { name: "Save view" }));
      const input = await screen.findByRole("textbox", { name: "Save this view" });
      await user.type(input, "Quick{Enter}");
      expect(props.onSave).toHaveBeenCalledWith("Quick");
    });

    it("clicking an item calls onApply", async () => {
      const user = userEvent.setup();
      const props = binding();
      render(<SavedViews {...props} />);
      await user.click(screen.getByRole("button", { name: /Saved views/ }));
      const item = await screen.findByRole("menuitem", { name: /Wide view/ });
      await user.click(item);
      expect(props.onApply).toHaveBeenCalledWith(props.items[1]);
      expect(props.onDelete).not.toHaveBeenCalled();
    });

    it("delete calls onDelete and not onApply", async () => {
      const user = userEvent.setup();
      const props = binding();
      render(<SavedViews {...props} />);
      await user.click(screen.getByRole("button", { name: /Saved views/ }));
      const remove = await screen.findByRole("button", { name: "Delete Low stock" });
      await user.click(remove);
      expect(props.onDelete).toHaveBeenCalledWith(props.items[0]);
      expect(props.onApply).not.toHaveBeenCalled();
    });

    it("shows an empty state", async () => {
      const user = userEvent.setup();
      render(<SavedViews {...binding({ items: [] })} />);
      await user.click(screen.getByRole("button", { name: /Saved views/ }));
      expect(await screen.findByText("No saved views yet")).toBeTruthy();
    });
  });

  // ─── Trigger ───────────────────────────────────────────────────────────────

  describe("Trigger", () => {
    it("shows the active rail filter count", async () => {
      const user = userEvent.setup();
      const onClick = vi.fn();
      const control = makeControl(
        [
          { field: "category", operator: "in", value: ["apparel"] },
          { field: "status", operator: "eq", value: "active" },
          { field: "warehouse", operator: "eq", value: "tokyo" },
        ],
        vi.fn(),
      );
      const { container } = render(
        <Trigger control={control} sections={[categorySection, statusSection]} onClick={onClick} />,
      );
      expect(container.innerHTML).toMatchSnapshot();
      const button = screen.getByRole("button", { name: "Filters, 2 active" });
      expect(button.textContent).toContain("2");
      await user.click(button);
      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it("has a plain label without active filters", () => {
      const control = makeControl([], vi.fn());
      render(<Trigger control={control} sections={[categorySection]} onClick={vi.fn()} />);
      expect(screen.getByRole("button", { name: "Filters" })).toBeTruthy();
    });
  });
});
