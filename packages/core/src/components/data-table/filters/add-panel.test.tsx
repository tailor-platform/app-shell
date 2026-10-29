import { afterEach, describe, it, expect, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Column } from "../types";
import {
  TestFilters,
  type TestRow,
  dateColumn,
  datetimeColumn,
  makeControl,
  numberColumn,
  stringColumn,
  timeColumn,
  timeZoneWrapper,
  wrapper,
} from "./test-utils";

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
});

const stringContainsOnlyColumn: Column<TestRow> = {
  ...stringColumn,
  filter: { type: "string", field: "name", operators: ["contains"] },
};

const stringEqOnlyColumn: Column<TestRow> = {
  ...stringColumn,
  filter: { type: "string", field: "name", operators: ["eq"] },
};

const stringInvalidOperatorColumn: Column<TestRow> = {
  ...stringColumn,
  filter: {
    type: "string",
    field: "name",
    operators: ["gt"] as unknown as ["contains"],
  },
};

describe("AddFilterPanel", () => {
  it("opens a panel listing every filterable field", async () => {
    // The add-filter surface is a single popover with three columns
    // (field ▸ condition ▸ value); the first column lists each filterable field
    // as a button.
    const user = userEvent.setup();
    const control = makeControl({ filters: [] });
    render(<TestFilters control={control} columns={[stringColumn, numberColumn]} />, {
      wrapper,
    });

    await user.click(screen.getByRole("button", { name: /Add filter/ }));

    expect(await screen.findByRole("button", { name: /^Name$/ })).toBeDefined();
    expect(screen.getByRole("button", { name: /^Count$/ })).toBeDefined();
  });

  it("the field search filters the field list and shows an empty state", async () => {
    const user = userEvent.setup();
    const control = makeControl({ filters: [] });
    render(<TestFilters control={control} columns={[stringColumn, numberColumn]} />, {
      wrapper,
    });

    await user.click(screen.getByRole("button", { name: /Add filter/ }));
    const search = await screen.findByPlaceholderText("Search fields");

    fireEvent.change(search, { target: { value: "coun" } });
    expect(screen.getByRole("button", { name: /^Count$/ })).toBeDefined();
    expect(screen.queryByRole("button", { name: /^Name$/ })).toBeNull();

    fireEvent.change(search, { target: { value: "zzz" } });
    expect(screen.getByText(/no fields match/i)).toBeDefined();

    fireEvent.change(search, { target: { value: "" } });
    expect(screen.getByRole("button", { name: /^Name$/ })).toBeDefined();
    expect(screen.getByRole("button", { name: /^Count$/ })).toBeDefined();
  });

  it("advances the selection when the search filters out the active field", async () => {
    const user = userEvent.setup();
    const control = makeControl({ filters: [] });
    render(<TestFilters control={control} columns={[stringColumn, numberColumn]} />, { wrapper });

    await user.click(screen.getByRole("button", { name: /Add filter/ }));
    // Select the numeric "Count" field — its editor has no "contains" operator.
    await user.click(await screen.findByRole("button", { name: /^Count$/ }));
    expect(screen.queryByRole("button", { name: "contains" })).toBeNull();

    // Searching "na" filters the list to "Name" only, filtering out the active
    // "Count" field. Selection must advance to "Name" so the list and the editor
    // stay in sync — the string editor's "contains" operator now appears.
    fireEvent.change(screen.getByPlaceholderText("Search fields"), { target: { value: "na" } });
    expect(await screen.findByRole("button", { name: "contains" })).toBeDefined();
  });

  it("selecting a field shows the value editor with an Apply button", async () => {
    const user = userEvent.setup();
    const control = makeControl({ filters: [] });
    render(<TestFilters control={control} columns={[stringColumn, numberColumn]} />, {
      wrapper,
    });

    await user.click(screen.getByRole("button", { name: /Add filter/ }));
    await user.click(await screen.findByRole("button", { name: /^Count$/ }));

    // Amount/Count is numeric → condition column + a value input + Apply.
    expect(await screen.findByRole("button", { name: /^Apply$/ })).toBeDefined();
  });

  it("uses contains as the default operator for an unconfigured string column", async () => {
    const user = userEvent.setup();
    const control = makeControl({ filters: [] });
    render(<TestFilters control={control} columns={[stringColumn]} />, { wrapper });

    await user.click(screen.getByRole("button", { name: /Add filter/ }));

    const panel = document.querySelector(
      '[data-slot="data-table-filter-panel"]',
    ) as HTMLElement | null;
    expect(panel).not.toBeNull();

    const textboxes = within(panel as HTMLElement).getAllByRole("textbox");
    await user.type(textboxes[textboxes.length - 1] as HTMLInputElement, "Bob");
    await user.click(screen.getByRole("button", { name: /^Apply$/ }));

    expect(control.addFilter).toHaveBeenCalledWith("name", "contains", "Bob", {
      caseSensitive: false,
    });
  });

  it("does not widen an invalid runtime string allowlist back to every operator", async () => {
    const user = userEvent.setup();
    const control = makeControl({ filters: [] });
    render(<TestFilters control={control} columns={[stringInvalidOperatorColumn]} />, { wrapper });

    await user.click(screen.getByRole("button", { name: /Add filter/ }));

    expect(screen.queryByRole("button", { name: /^contains$/ })).toBeNull();

    const panel = document.querySelector(
      '[data-slot="data-table-filter-panel"]',
    ) as HTMLElement | null;
    expect(panel).not.toBeNull();

    const textboxes = within(panel as HTMLElement).getAllByRole("textbox");
    await user.type(textboxes[textboxes.length - 1] as HTMLInputElement, "Bob");
    await user.click(screen.getByRole("button", { name: /^Apply$/ }));

    expect(control.addFilter).toHaveBeenCalledWith("name", "contains", "Bob", {
      caseSensitive: false,
    });
  });

  it("hides the condition column when a column restricts filters to one operator", async () => {
    const user = userEvent.setup();
    const control = makeControl({ filters: [] });
    render(<TestFilters control={control} columns={[stringContainsOnlyColumn]} />, { wrapper });

    await user.click(screen.getByRole("button", { name: /Add filter/ }));

    expect(screen.queryByRole("button", { name: /^contains$/ })).toBeNull();
    expect(await screen.findByRole("button", { name: /^Apply$/ })).toBeDefined();
  });

  it("seeds an already-filtered field's operator/value so the panel preserves them", async () => {
    // Re-opening the panel on a field that already has a non-default filter
    // (here a number "between") must keep that operator and value rather than
    // resetting to the type default — otherwise applying would silently overwrite.
    const user = userEvent.setup();
    const control = makeControl({
      filters: [{ field: "count", operator: "between", value: { min: 5, max: 10 } }],
    });
    render(<TestFilters control={control} columns={[numberColumn]} />, { wrapper });

    await user.click(screen.getByRole("button", { name: /Add filter/ }));
    // The commit button reads "Update" (not "Add"/"Apply") for an active field.
    await user.click(await screen.findByRole("button", { name: /^Update$/ }));

    expect(control.addFilter).toHaveBeenCalledWith("count", "between", { min: 5, max: 10 });
  });

  it("preserves case-sensitivity when re-applying a string filter from the panel", async () => {
    // The panel has no case-sensitive toggle; re-applying must carry the active
    // filter's caseSensitive flag through rather than clearing it.
    const user = userEvent.setup();
    const control = makeControl({
      filters: [{ field: "name", operator: "contains", value: "Alice", caseSensitive: true }],
    });
    render(<TestFilters control={control} columns={[stringColumn]} />, { wrapper });

    await user.click(screen.getByRole("button", { name: /Add filter/ }));
    await user.click(await screen.findByRole("button", { name: /^Update$/ }));

    expect(control.addFilter).toHaveBeenCalledWith("name", "contains", "Alice", {
      caseSensitive: true,
    });
  });

  it("normalizes a legacy local datetime when re-applying it from the panel", async () => {
    const user = userEvent.setup();
    vi.stubEnv("TZ", "UTC");
    const control = makeControl({
      filters: [{ field: "publishedAt", operator: "eq", value: "2025-01-01T10:30:00" }],
    });
    render(<TestFilters control={control} columns={[datetimeColumn]} />, {
      wrapper: timeZoneWrapper,
    });

    await user.click(screen.getByRole("button", { name: /Add filter/ }));
    await user.click(await screen.findByRole("button", { name: /^Update$/ }));

    expect(control.addFilter).toHaveBeenCalledWith(
      "publishedAt",
      "eq",
      "2025-01-01T18:30:00.000Z",
      undefined,
    );
  });

  it("preserves an active operator even when the column now restricts the allowlist", async () => {
    const user = userEvent.setup();
    const control = makeControl({
      filters: [{ field: "name", operator: "contains", value: "Alice" }],
    });
    render(<TestFilters control={control} columns={[stringEqOnlyColumn]} />, { wrapper });

    expect(screen.getByRole("button", { name: "contains" })).toBeDefined();

    await user.click(screen.getByRole("button", { name: /Add filter/ }));
    await user.click(await screen.findByRole("button", { name: /^Update$/ }));

    expect(control.addFilter).toHaveBeenCalledWith("name", "contains", "Alice", {
      caseSensitive: false,
    });
  });

  it("does not surface legacy numeric-only operators in the date condition list", async () => {
    const user = userEvent.setup();
    const control = makeControl({
      filters: [{ field: "createdAt", operator: "gt", value: "2025-01-01" }],
    });
    render(<TestFilters control={control} columns={[dateColumn]} />, { wrapper });

    await user.click(screen.getByRole("button", { name: /Add filter/ }));

    const panel = document.querySelector(
      '[data-slot="data-table-filter-panel"]',
    ) as HTMLElement | null;
    expect(panel).not.toBeNull();

    const panelQueries = within(panel as HTMLElement);
    expect(panelQueries.queryByRole("button", { name: "greater than" })).toBeNull();
    expect(panelQueries.getByRole("button", { name: "exact date" })).toBeDefined();
    expect(panelQueries.getByRole("button", { name: "after" })).toBeDefined();
    expect(panelQueries.getByRole("button", { name: "before" })).toBeDefined();
  });

  it("disables the commit button when the between range is reversed (min > max)", async () => {
    const user = userEvent.setup();
    const control = makeControl({ filters: [] });
    render(<TestFilters control={control} columns={[numberColumn]} />, { wrapper });

    await user.click(screen.getByRole("button", { name: /Add filter/ }));
    // Choose "is between", then enter a reversed range.
    await user.click(await screen.findByRole("button", { name: /is between/i }));
    await user.type(screen.getByRole("spinbutton", { name: "Min" }), "10");
    await user.type(screen.getByRole("spinbutton", { name: "Max" }), "5");

    const commit = screen.getByRole("button", { name: /^(Apply|Update)$/ });
    expect((commit as HTMLButtonElement).disabled).toBe(true);
    // ...and an inline error explains why.
    expect(screen.getByText(/must be greater than or equal to/i)).toBeDefined();
  });

  it("renders a native time input for a single-value time filter", async () => {
    const user = userEvent.setup();
    const control = makeControl({ filters: [] });
    render(<TestFilters control={control} columns={[timeColumn]} />, { wrapper });

    await user.click(screen.getByRole("button", { name: /Add filter/ }));
    // `time` defaults to a single-value operator → native time input (not a
    // plain text box).
    const input = await screen.findByLabelText("Opens At");
    expect(input.getAttribute("type")).toBe("time");
  });
});
