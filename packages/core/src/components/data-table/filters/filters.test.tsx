import { afterEach, describe, it, expect, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Column } from "../types";
import {
  TestFilters,
  type TestRow,
  makeControl,
  numberColumn,
  openValueEditor,
  stringColumn,
  timeColumn,
  uuidColumn,
  wrapper,
} from "./test-utils";

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
});

describe.each([
  { isComposing: true, keyCode: 13 },
  { isComposing: false, keyCode: 229 },
])("filter IME handling ($isComposing, $keyCode)", (compositionEvent) => {
  describe.each(["panel", "chip"] as const)("%s", (surface) => {
    it.each([
      { column: stringColumn, initial: "Alice", draft: "株式会社", final: "株式会社東京" },
      { column: uuidColumn, initial: "uuid-1", draft: "uuid-2", final: "uuid-3" },
      { column: numberColumn, initial: 1, draft: "2", final: 3 },
      { column: timeColumn, initial: "09:30", draft: "10:30", final: "11:30" },
    ])(
      "does not commit $column.id until Enter outside composition",
      async ({ column, initial, draft, final }) => {
        const user = userEvent.setup();
        const field = column.id!;
        const operator = column === stringColumn ? "contains" : "eq";
        const control = makeControl({ filters: [{ field, operator, value: initial }] });
        render(<TestFilters control={control} columns={[column]} />, { wrapper });

        if (surface === "panel") {
          await user.click(screen.getByRole("button", { name: "Add filter" }));
        } else {
          await openValueEditor(user);
        }

        const input = await screen.findByDisplayValue(String(initial));
        await user.click(input);
        fireEvent.change(input, { target: { value: draft } });
        fireEvent.keyDown(input, { key: "Enter", ...compositionEvent });

        expect(control.addFilter).not.toHaveBeenCalled();
        expect(control.removeFilter).not.toHaveBeenCalled();
        expect(document.activeElement).toBe(input);
        expect(screen.getByDisplayValue(draft)).toBe(input);

        fireEvent.change(input, { target: { value: String(final) } });
        fireEvent.keyDown(input, { key: "Enter", ...compositionEvent });
        expect(control.addFilter).not.toHaveBeenCalled();
        expect(control.removeFilter).not.toHaveBeenCalled();

        fireEvent.keyDown(input, { key: "Enter", isComposing: false, keyCode: 13 });
        expect(control.addFilter).toHaveBeenCalledTimes(1);
        expect(vi.mocked(control.addFilter).mock.calls[0].slice(0, 3)).toEqual([
          field,
          operator,
          final,
        ]);
        if (surface === "chip") {
          await vi.waitFor(() => expect(screen.queryByDisplayValue(String(final))).toBeNull());
        } else {
          expect(screen.getByDisplayValue(String(final))).toBe(input);
        }
      },
    );

    it.each(["Min", "Max"])("does not commit a range from %s during composition", async (bound) => {
      const user = userEvent.setup();
      const control = makeControl({
        filters: [{ field: "count", operator: "between", value: { min: 1, max: 10 } }],
      });
      render(<TestFilters control={control} columns={[numberColumn]} />, { wrapper });
      if (surface === "panel") {
        await user.click(screen.getByRole("button", { name: "Add filter" }));
      } else {
        await openValueEditor(user);
      }

      const input = await screen.findByRole("spinbutton", { name: bound });
      fireEvent.change(input, { target: { value: bound === "Min" ? "2" : "20" } });
      fireEvent.keyDown(input, { key: "Enter", ...compositionEvent });
      expect(control.addFilter).not.toHaveBeenCalled();
      expect(control.removeFilter).not.toHaveBeenCalled();
      expect(screen.getByRole("spinbutton", { name: bound })).toBe(input);

      fireEvent.keyDown(input, { key: "Enter", isComposing: false, keyCode: 13 });
      expect(control.addFilter).toHaveBeenCalledTimes(1);
      expect(control.addFilter).toHaveBeenCalledWith("count", "between", {
        min: bound === "Min" ? 2 : 1,
        max: bound === "Max" ? 20 : 10,
      });
    });
  });
});

describe("DataTable.Filters", () => {
  it("renders no filter chips when no active filters", () => {
    const control = makeControl({ filters: [] });
    const { container } = render(<TestFilters control={control} columns={[stringColumn]} />, {
      wrapper,
    });
    expect(container.querySelector('[data-slot="data-table-filter-chip"]')).toBeNull();
  });

  it("renders a segmented filter chip (field / operator / value) for each active filter", () => {
    const control = makeControl({
      filters: [{ field: "name", operator: "contains", value: "Alice" }],
    });
    const { container } = render(<TestFilters control={control} columns={[stringColumn]} />, {
      wrapper,
    });
    expect(container.querySelector('[data-slot="data-table-filter-chip"]')).not.toBeNull();
    // The chip is segmented: the field, operator, and value each render in their
    // own element rather than a single combined label.
    expect(screen.getByText("Name")).toBeDefined();
    expect(screen.getByText("contains")).toBeDefined();
    expect(screen.getByText("Alice")).toBeDefined();
  });

  it("renders the add filter button when there are unfiltered filterable columns", () => {
    const control = makeControl({ filters: [] });
    render(<TestFilters control={control} columns={[stringColumn]} />, {
      wrapper,
    });
    expect(screen.getByRole("button", { name: "Add filter" })).toBeDefined();
  });

  it("still renders the add filter button when all filterable columns are active", () => {
    // The add-filter trigger is always available now (it re-opens the editor for
    // active fields too), so it must remain present even when every filterable
    // column already has a chip.
    const control = makeControl({
      filters: [{ field: "name", operator: "contains", value: "Alice" }],
    });
    render(<TestFilters control={control} columns={[stringColumn]} />, {
      wrapper,
    });
    expect(screen.getByRole("button", { name: "Add filter" })).toBeDefined();
  });

  it("returns null when there are no filterable columns", () => {
    const control = makeControl({ filters: [] });
    const nonFilterableColumn: Column<TestRow> = {
      id: "name",
      label: "Name",
      render: (r) => String(r.name ?? ""),
    };
    const { container } = render(
      <TestFilters control={control} columns={[nonFilterableColumn]} />,
      { wrapper },
    );
    expect(container.querySelector('[data-slot="data-table-filters"]')).toBeNull();
  });

  it("slot='add' renders only the Add filter trigger (no chips)", () => {
    const control = makeControl({
      filters: [{ field: "name", operator: "contains", value: "Alice" }],
    });
    render(<TestFilters control={control} columns={[stringColumn]} slot="add" />, { wrapper });
    expect(screen.getByRole("button", { name: "Add filter" })).toBeDefined();
    expect(document.querySelector('[data-slot="data-table-filter-chip"]')).toBeNull();
  });

  it("slot='chips' renders only active chips (no Add filter trigger)", () => {
    const control = makeControl({
      filters: [{ field: "name", operator: "contains", value: "Alice" }],
    });
    render(<TestFilters control={control} columns={[stringColumn]} slot="chips" />, { wrapper });
    expect(document.querySelector('[data-slot="data-table-filter-chip"]')).not.toBeNull();
    expect(screen.queryByRole("button", { name: "Add filter" })).toBeNull();
  });

  it("slot='chips' renders nothing when there are no active filters", () => {
    const control = makeControl({ filters: [] });
    const { container } = render(
      <TestFilters control={control} columns={[stringColumn]} slot="chips" />,
      { wrapper },
    );
    expect(container.querySelector('[data-slot="data-table-filters"]')).toBeNull();
  });

  it("renders an icon-only trigger by default (label kept as aria-label)", () => {
    const control = makeControl({ filters: [] });
    render(<TestFilters control={control} columns={[stringColumn]} slot="add" />, {
      wrapper,
    });
    // Reachable by its accessible name, but the label text is not rendered.
    const trigger = screen.getByRole("button", { name: "Add filter" });
    expect(trigger.textContent).toBe("");
  });

  it("addIconOnly={false} renders the visible 'Add filter' text label", () => {
    const control = makeControl({ filters: [] });
    render(
      <TestFilters control={control} columns={[stringColumn]} slot="add" addIconOnly={false} />,
      { wrapper },
    );
    const trigger = screen.getByRole("button", { name: "Add filter" });
    expect(trigger.textContent).toContain("Add filter");
  });
});
