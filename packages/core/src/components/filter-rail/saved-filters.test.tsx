import { useMemo, useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { CollectionControl, Filter } from "@/types/collection";
import { Root, Sections } from "./filter-rail";
import { SaveFilter, SavedFilters } from "./saved-filters";
import type { FilterRailSection, SavedFilter, SavedFiltersBinding } from "./types";

afterEach(() => {
  cleanup();
});

const makeControl = (filters: Filter[], setFilters: (next: Filter[]) => void) =>
  ({
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
  }) satisfies CollectionControl;

// 🧪 Dummy Data: sections, saved filters and a page-level filter the rail does not own
const sections: FilterRailSection[] = [
  {
    id: "category",
    label: "Category",
    control: "checkbox",
    field: "category",
    options: [
      { value: "Electronics", label: "Electronics" },
      { value: "Furniture", label: "Furniture" },
    ],
  },
  {
    id: "status",
    label: "Status",
    control: "radio",
    field: "status",
    options: [{ value: "Active", label: "Active" }],
  },
];
const pageSearch: Filter = { field: "name", operator: "contains", value: "desk" };
const lowStock: SavedFilter = {
  id: "low",
  name: "Active electronics",
  filters: [
    { field: "status", operator: "eq", value: "Active" },
    { field: "category", operator: "in", value: ["Electronics"] },
  ],
  createdAt: "2026-10-15T00:00:00.000Z",
};

const binding = (overrides: Partial<SavedFiltersBinding> = {}): SavedFiltersBinding => ({
  items: [lowStock],
  loading: false,
  error: null,
  save: vi.fn(),
  remove: vi.fn(),
  ...overrides,
});

function Harness({ initial = [], saved }: { initial?: Filter[]; saved: SavedFiltersBinding }) {
  const [filters, setFilters] = useState<Filter[]>(initial);
  const control = useMemo(() => makeControl(filters, setFilters), [filters]);
  return (
    <>
      <Root control={control} sections={sections}>
        <SavedFilters {...saved} />
        <Sections />
        <SaveFilter {...saved} />
      </Root>
      <pre data-testid="filters">{JSON.stringify(filters)}</pre>
    </>
  );
}

const currentFilters = (): Filter[] =>
  JSON.parse(screen.getByTestId("filters").textContent ?? "[]") as Filter[];

describe("FilterRail.SavedFilters", () => {
  it("applies a saved filter, replacing only the rail's own filters", async () => {
    const user = userEvent.setup();
    render(
      <Harness
        saved={binding()}
        initial={[pageSearch, { field: "category", operator: "in", value: ["Furniture"] }]}
      />,
    );
    await user.click(screen.getByRole("button", { name: /Saved filters/ }));
    await user.click(await screen.findByRole("menuitem", { name: "Active electronics" }));
    expect(currentFilters()).toEqual([pageSearch, ...lowStock.filters]);
  });

  it("names the matching saved filter on the trigger, regardless of filter order", () => {
    render(
      <Harness
        saved={binding()}
        initial={[
          { field: "category", operator: "in", value: ["Electronics"] },
          { field: "status", operator: "eq", value: "Active" },
        ]}
      />,
    );
    expect(screen.getByRole("button", { name: /Active electronics/ })).toBeTruthy();
  });

  it("shows loading and empty states", async () => {
    const user = userEvent.setup();
    const { unmount } = render(<Harness saved={binding({ items: [], loading: true })} />);
    await user.click(screen.getByRole("button", { name: /Saved filters/ }));
    expect(await screen.findByText("Loading…")).toBeTruthy();
    unmount();
    render(<Harness saved={binding({ items: [] })} />);
    await user.click(screen.getByRole("button", { name: /Saved filters/ }));
    expect(await screen.findByText("No saved filters yet")).toBeTruthy();
  });

  it("reports an error", () => {
    render(<Harness saved={binding({ error: new Error("offline") })} />);
    expect(screen.getByRole("alert").textContent).toContain("Couldn't load or save");
  });

  it('offers "No filter" first, which clears only the rail\'s filters', async () => {
    const user = userEvent.setup();
    render(<Harness saved={binding()} initial={[pageSearch, ...lowStock.filters]} />);
    await user.click(screen.getByRole("button", { name: /Active electronics/ }));
    const items = await screen.findAllByRole("menuitem");
    expect(items[0]!.textContent).toBe("No filter");
    await user.click(items[0]!);
    expect(currentFilters()).toEqual([pageSearch]);
    expect(screen.getByRole("button", { name: /Saved filters/ })).toBeTruthy();
  });

  it('labels the trigger "Saved filters" when the rail has none applied', () => {
    render(<Harness saved={binding()} initial={[pageSearch]} />);
    expect(screen.getByRole("button", { name: /Saved filters/ })).toBeTruthy();
  });

  it("asks for confirmation before deleting, and deletes only on confirm", async () => {
    const user = userEvent.setup();
    const saved = binding();
    render(<Harness saved={saved} />);
    await user.click(screen.getByRole("button", { name: /Saved filters/ }));
    await user.click(await screen.findByRole("button", { name: "Delete Active electronics" }));
    // Clicking the icon deletes, it does not apply.
    expect(currentFilters()).toEqual([]);
    let dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText('Delete saved filter "Active electronics"?')).toBeTruthy();
    await user.click(within(dialog).getByRole("button", { name: "Cancel" }));
    expect(saved.remove).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: /Saved filters/ }));
    await user.click(await screen.findByRole("button", { name: "Delete Active electronics" }));
    dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "Delete" }));
    expect(saved.remove).toHaveBeenCalledWith("low");
  });

  it("opens the same confirmation from the keyboard with Delete on an item", async () => {
    const user = userEvent.setup();
    render(<Harness saved={binding()} />);
    await user.click(screen.getByRole("button", { name: /Saved filters/ }));
    const item = await screen.findByRole("menuitem", { name: /Active electronics/ });
    item.focus();
    await user.keyboard("{Delete}");
    expect(await screen.findByText('Delete saved filter "Active electronics"?')).toBeTruthy();
  });
});

describe("FilterRail.SaveFilter", () => {
  it("is hidden with no rail filters, and when they already match a saved filter", () => {
    const { unmount } = render(<Harness saved={binding()} initial={[pageSearch]} />);
    expect(screen.queryByRole("button", { name: "Save filters" })).toBeNull();
    unmount();
    render(<Harness saved={binding()} initial={lowStock.filters} />);
    expect(screen.queryByRole("button", { name: "Save filters" })).toBeNull();
  });

  it("saves only the rail's own filters under the typed name", async () => {
    const user = userEvent.setup();
    const saved = binding();
    const furniture: Filter = { field: "category", operator: "in", value: ["Furniture"] };
    render(<Harness saved={saved} initial={[pageSearch, furniture]} />);
    await user.click(screen.getByRole("button", { name: "Save filters" }));
    const dialog = await screen.findByRole("dialog");
    const save = within(dialog).getByRole("button", { name: "Save" }) as HTMLButtonElement;
    expect(save.disabled).toBe(true);
    await user.type(within(dialog).getByRole("textbox", { name: "Name" }), "  Furniture  {Enter}");
    expect(saved.save).toHaveBeenCalledWith("Furniture", [furniture]);
  });

  it("warns and relabels the button when the name replaces an existing one", async () => {
    const user = userEvent.setup();
    render(
      <Harness
        saved={binding()}
        initial={[{ field: "category", operator: "in", value: ["Furniture"] }]}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Save filters" }));
    const dialog = await screen.findByRole("dialog");
    await user.type(within(dialog).getByRole("textbox", { name: "Name" }), "active electronics");
    expect(within(dialog).getByText('Replaces the existing "Active electronics".')).toBeTruthy();
    expect(within(dialog).getByRole("button", { name: "Replace" })).toBeTruthy();
  });

  it("is a footer after the sections", () => {
    const { container } = render(
      <Harness
        saved={binding()}
        initial={[{ field: "category", operator: "in", value: ["Furniture"] }]}
      />,
    );
    const rail = container.querySelector('[data-slot="filter-rail"]')!;
    expect(rail.lastElementChild?.getAttribute("data-slot")).toBe("filter-rail-save-filter");
  });
});
