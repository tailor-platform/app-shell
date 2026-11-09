import { afterEach, describe, it, expect, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Column } from "../types";
import {
  TestFilters,
  type TestRow,
  makeControl,
  openValueEditor,
  stringColumn,
  uuidColumn,
  wrapper,
} from "./test-utils";

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
});

const enumColumn: Column<TestRow> = {
  id: "status",
  label: "Status",
  render: (r) => String(r.status ?? ""),
  filter: {
    type: "enum",
    field: "status",
    options: [
      { value: "active", label: "Active" },
      { value: "inactive", label: "Inactive" },
    ],
  },
};

const booleanColumn: Column<TestRow> = {
  id: "enabled",
  label: "Enabled",
  render: (r) => String(r.enabled ?? ""),
  filter: { type: "boolean", field: "enabled" },
};

describe("StringFilterEditor", () => {
  it("shows an Apply button after opening the chip value popover", async () => {
    const user = userEvent.setup();
    const control = makeControl({
      filters: [{ field: "name", operator: "contains", value: "Alice" }],
    });
    render(<TestFilters control={control} columns={[stringColumn]} />, {
      wrapper,
    });

    await openValueEditor(user);

    expect(await screen.findByRole("button", { name: "Apply" })).toBeDefined();
  });

  it("Apply button calls addFilter with the updated value and closes the popover", async () => {
    const user = userEvent.setup();
    const control = makeControl({
      filters: [{ field: "name", operator: "contains", value: "Alice" }],
    });
    render(<TestFilters control={control} columns={[stringColumn]} />, {
      wrapper,
    });

    await openValueEditor(user);

    const input = await screen.findByRole("textbox");
    await user.clear(input);
    await user.type(input, "Bob");
    await user.click(screen.getByRole("button", { name: "Apply" }));

    // The operator comes from the chip's own operator segment (the editor is
    // rendered with hideOperator), so it stays "contains".
    expect(control.addFilter).toHaveBeenCalledWith("name", "contains", "Bob", {
      caseSensitive: false,
    });
  });

  it("Enter key calls addFilter with the updated value", async () => {
    const user = userEvent.setup();
    const control = makeControl({
      filters: [{ field: "name", operator: "contains", value: "Alice" }],
    });
    render(<TestFilters control={control} columns={[stringColumn]} />, {
      wrapper,
    });

    await openValueEditor(user);

    const input = await screen.findByRole("textbox");
    await user.clear(input);
    await user.type(input, "Charlie");
    await user.keyboard("{Enter}");

    expect(control.addFilter).toHaveBeenCalledWith("name", "contains", "Charlie", {
      caseSensitive: false,
    });
  });

  it("Apply button calls removeFilter when the value is cleared", async () => {
    const user = userEvent.setup();
    const control = makeControl({
      filters: [{ field: "name", operator: "contains", value: "Alice" }],
    });
    render(<TestFilters control={control} columns={[stringColumn]} />, {
      wrapper,
    });

    await openValueEditor(user);

    const input = await screen.findByRole("textbox");
    await user.clear(input);
    await user.click(screen.getByRole("button", { name: "Apply" }));

    expect(control.removeFilter).toHaveBeenCalledWith("name");
  });

  it("shows a Case sensitive checkbox", async () => {
    const user = userEvent.setup();
    const control = makeControl({
      filters: [{ field: "name", operator: "contains", value: "Alice" }],
    });
    render(<TestFilters control={control} columns={[stringColumn]} />, {
      wrapper,
    });

    await openValueEditor(user);

    expect(await screen.findByText("Case sensitive")).toBeDefined();
  });

  it("Apply with case-sensitive checked calls addFilter with caseSensitive option", async () => {
    const user = userEvent.setup();
    const control = makeControl({
      filters: [{ field: "name", operator: "contains", value: "Alice" }],
    });
    render(<TestFilters control={control} columns={[stringColumn]} />, {
      wrapper,
    });

    await openValueEditor(user);

    const checkbox = await screen.findByRole("checkbox");
    await user.click(checkbox);

    await user.click(screen.getByRole("button", { name: "Apply" }));

    expect(control.addFilter).toHaveBeenCalledWith("name", "contains", "Alice", {
      caseSensitive: true,
    });
  });

  it("restores case-sensitive state from existing filter", async () => {
    const user = userEvent.setup();
    const control = makeControl({
      filters: [
        {
          field: "name",
          operator: "contains",
          value: "Alice",
          caseSensitive: true,
        },
      ],
    });
    render(<TestFilters control={control} columns={[stringColumn]} />, {
      wrapper,
    });

    await openValueEditor(user);

    const checkbox = await screen.findByRole("checkbox");
    expect((checkbox as HTMLElement).dataset.checked).toBeDefined();
  });
});

describe("UuidFilterEditor", () => {
  it("shows an Apply button after opening the chip value popover", async () => {
    const user = userEvent.setup();
    const control = makeControl({
      filters: [{ field: "id", operator: "eq", value: "uuid-123" }],
    });
    render(<TestFilters control={control} columns={[uuidColumn]} />, {
      wrapper,
    });

    await openValueEditor(user);

    expect(await screen.findByRole("button", { name: "Apply" })).toBeDefined();
  });

  it("Apply button calls addFilter with the updated value", async () => {
    const user = userEvent.setup();
    const control = makeControl({
      filters: [{ field: "id", operator: "eq", value: "uuid-123" }],
    });
    render(<TestFilters control={control} columns={[uuidColumn]} />, {
      wrapper,
    });

    await openValueEditor(user);

    const input = await screen.findByRole("textbox");
    await user.clear(input);
    await user.type(input, "uuid-456");
    await user.click(screen.getByRole("button", { name: "Apply" }));

    expect(control.addFilter).toHaveBeenCalledWith("id", "eq", "uuid-456");
  });

  it("Enter key calls addFilter with the updated value", async () => {
    const user = userEvent.setup();
    const control = makeControl({
      filters: [{ field: "id", operator: "eq", value: "uuid-123" }],
    });
    render(<TestFilters control={control} columns={[uuidColumn]} />, {
      wrapper,
    });

    await openValueEditor(user);

    const input = await screen.findByRole("textbox");
    await user.clear(input);
    await user.type(input, "uuid-789");
    await user.keyboard("{Enter}");

    expect(control.addFilter).toHaveBeenCalledWith("id", "eq", "uuid-789");
  });
});

describe("EnumFilterEditor", () => {
  it("shows the operator segment as 'is any of' and summarizes multiple selections", () => {
    const control = makeControl({
      filters: [{ field: "status", operator: "in", value: ["active", "inactive"] }],
    });
    render(<TestFilters control={control} columns={[enumColumn]} />, { wrapper });

    // enum has a single operator, so it renders as plain text, not a button.
    expect(screen.getByText("is any of")).toBeDefined();
    // >1 option selected is summarized as "N <label>(s)".
    expect(screen.getByText("2 Status(s)")).toBeDefined();
  });

  it("toggling a checkbox calls addFilter immediately without an Apply button", async () => {
    const user = userEvent.setup();
    const control = makeControl({
      filters: [{ field: "status", operator: "in", value: ["active"] }],
    });
    render(<TestFilters control={control} columns={[enumColumn]} />, {
      wrapper,
    });

    await openValueEditor(user);

    // Click the "Inactive" option (only appears in the opened value list).
    await user.click(await screen.findByText("Inactive"));

    expect(control.addFilter).toHaveBeenCalledWith("status", "in", ["active", "inactive"]);
    // No Apply button for enum
    expect(screen.queryByRole("button", { name: "Apply" })).toBeNull();
  });

  it("unchecking the only selected option calls removeFilter", async () => {
    const user = userEvent.setup();
    const control = makeControl({
      filters: [{ field: "status", operator: "in", value: ["active"] }],
    });
    render(<TestFilters control={control} columns={[enumColumn]} />, {
      wrapper,
    });

    await openValueEditor(user);

    // Wait for the value list to open, then uncheck "Active" from within it.
    // ("Active" also appears in the chip's value segment, so scope to the list.)
    await screen.findByText("Inactive");
    const list = document.querySelector('[data-slot="data-table-filter-enum"]') as HTMLElement;
    await user.click(within(list).getByText("Active"));

    expect(control.removeFilter).toHaveBeenCalledWith("status");
  });
});

describe("BooleanFilterEditor", () => {
  it("shows an Apply button after opening the chip value popover", async () => {
    const user = userEvent.setup();
    const control = makeControl({
      filters: [{ field: "enabled", operator: "eq", value: true }],
    });
    render(<TestFilters control={control} columns={[booleanColumn]} />, {
      wrapper,
    });

    // Operator segment reflects the "is" (eq) operator; value segment shows "True".
    expect(screen.getByText("is")).toBeDefined();
    expect(screen.getByText("True")).toBeDefined();

    await openValueEditor(user);

    expect(await screen.findByRole("button", { name: "Apply" })).toBeDefined();
  });

  it("does not call addFilter immediately on open", async () => {
    const user = userEvent.setup();
    const control = makeControl({
      filters: [{ field: "enabled", operator: "eq", value: true }],
    });
    render(<TestFilters control={control} columns={[booleanColumn]} />, {
      wrapper,
    });

    await openValueEditor(user);
    await screen.findByRole("button", { name: "Apply" });

    expect(control.addFilter).not.toHaveBeenCalled();
  });

  it("Apply button calls addFilter with the current value", async () => {
    const user = userEvent.setup();
    const control = makeControl({
      filters: [{ field: "enabled", operator: "eq", value: true }],
    });
    render(<TestFilters control={control} columns={[booleanColumn]} />, {
      wrapper,
    });

    await openValueEditor(user);
    await user.click(await screen.findByRole("button", { name: "Apply" }));

    expect(control.addFilter).toHaveBeenCalledWith("enabled", "eq", true);
  });

  it("Apply button calls addFilter with false when value is false", async () => {
    const user = userEvent.setup();
    const control = makeControl({
      filters: [{ field: "enabled", operator: "eq", value: false }],
    });
    render(<TestFilters control={control} columns={[booleanColumn]} />, {
      wrapper,
    });

    await openValueEditor(user);
    await user.click(await screen.findByRole("button", { name: "Apply" }));

    expect(control.addFilter).toHaveBeenCalledWith("enabled", "eq", false);
  });

  it("Apply button calls addFilter with ne operator when filter has ne", async () => {
    const user = userEvent.setup();
    const control = makeControl({
      filters: [{ field: "enabled", operator: "ne", value: true }],
    });
    render(<TestFilters control={control} columns={[booleanColumn]} />, {
      wrapper,
    });

    // Operator segment reflects "is not" (ne); the hidden editor operator is
    // seeded from the filter's operator, so Apply preserves ne.
    expect(screen.getByText("is not")).toBeDefined();

    await openValueEditor(user);
    await user.click(await screen.findByRole("button", { name: "Apply" }));

    expect(control.addFilter).toHaveBeenCalledWith("enabled", "ne", true);
  });
});
