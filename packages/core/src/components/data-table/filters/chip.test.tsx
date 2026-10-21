import { afterEach, describe, it, expect, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  TestFilters,
  datetimeColumn,
  makeControl,
  stringColumn,
  timeZoneWrapper,
  wrapper,
} from "./test-utils";

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
});

describe("FilterChip", () => {
  it("focuses the operator search input when the operator popover opens", async () => {
    const user = userEvent.setup();
    const control = makeControl({
      filters: [{ field: "name", operator: "contains", value: "Alice" }],
    });
    render(<TestFilters control={control} columns={[stringColumn]} />, {
      wrapper,
    });

    await user.click(screen.getByRole("button", { name: "contains" }));

    const input = await screen.findByPlaceholderText("Search...");
    expect(document.activeElement).toBe(input);
  });

  it("calls removeFilter when the remove button is clicked", async () => {
    const user = userEvent.setup();
    const control = makeControl({
      filters: [{ field: "name", operator: "contains", value: "Alice" }],
    });
    render(<TestFilters control={control} columns={[stringColumn]} />, {
      wrapper,
    });

    await user.click(screen.getByRole("button", { name: "Remove filter" }));

    expect(control.removeFilter).toHaveBeenCalledWith("name");
  });

  it("normalizes legacy datetime values when switching between single-value operators", async () => {
    const user = userEvent.setup();
    vi.stubEnv("TZ", "UTC");
    const control = makeControl({
      filters: [{ field: "publishedAt", operator: "eq", value: "2025-01-01T10:30:00" }],
    });
    render(<TestFilters control={control} columns={[datetimeColumn]} />, {
      wrapper: timeZoneWrapper,
    });

    await user.click(screen.getByRole("button", { name: "is" }));
    await user.click(await screen.findByRole("button", { name: "greater than" }));

    expect(control.addFilter).toHaveBeenCalledWith(
      "publishedAt",
      "gt",
      "2025-01-01T18:30:00.000Z",
      undefined,
    );
  });

  it("normalizes legacy datetime values when switching from single-value to between", async () => {
    const user = userEvent.setup();
    vi.stubEnv("TZ", "UTC");
    const control = makeControl({
      filters: [{ field: "publishedAt", operator: "eq", value: "2025-01-01T10:30:00" }],
    });
    render(<TestFilters control={control} columns={[datetimeColumn]} />, {
      wrapper: timeZoneWrapper,
    });

    await user.click(screen.getByRole("button", { name: "is" }));
    await user.click(await screen.findByRole("button", { name: "is between" }));

    expect(control.addFilter).toHaveBeenCalledWith("publishedAt", "between", {
      min: "2025-01-01T18:30:00.000Z",
      max: "2025-01-01T18:30:00.000Z",
    });
  });

  it("normalizes legacy datetime values when switching from between to single-value", async () => {
    const user = userEvent.setup();
    vi.stubEnv("TZ", "UTC");
    const control = makeControl({
      filters: [
        {
          field: "publishedAt",
          operator: "between",
          value: { min: "2025-01-01T10:30:00", max: "2025-01-02T11:30:00" },
        },
      ],
    });
    render(<TestFilters control={control} columns={[datetimeColumn]} />, {
      wrapper: timeZoneWrapper,
    });

    await user.click(screen.getByRole("button", { name: "is between" }));
    await user.click(await screen.findByRole("button", { name: "less than" }));

    expect(control.addFilter).toHaveBeenCalledWith("publishedAt", "lt", "2025-01-01T18:30:00.000Z");
  });
});
