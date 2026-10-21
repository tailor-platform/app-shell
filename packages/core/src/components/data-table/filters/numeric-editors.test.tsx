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
  wrapper,
} from "./test-utils";

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
});

const decimalColumn: Column<TestRow> = {
  id: "amount",
  label: "Amount",
  filter: { type: "decimal", field: "amount" },
};

describe("NumericFilterEditor", () => {
  it("shows an Apply button after opening the chip value popover", async () => {
    const user = userEvent.setup();
    const control = makeControl({
      filters: [{ field: "count", operator: "eq", value: 42 }],
    });
    render(<TestFilters control={control} columns={[numberColumn]} />, {
      wrapper,
    });

    await openValueEditor(user);

    expect(await screen.findByRole("button", { name: "Apply" })).toBeDefined();
  });

  it("Apply button calls addFilter with the updated numeric value", async () => {
    const user = userEvent.setup();
    const control = makeControl({
      filters: [{ field: "count", operator: "eq", value: 42 }],
    });
    render(<TestFilters control={control} columns={[numberColumn]} />, {
      wrapper,
    });

    await openValueEditor(user);

    const input = await screen.findByRole("spinbutton");
    await user.clear(input);
    await user.type(input, "99");
    await user.click(screen.getByRole("button", { name: "Apply" }));

    expect(control.addFilter).toHaveBeenCalledWith("count", "eq", 99);
  });

  it("Enter key calls addFilter with the updated numeric value", async () => {
    const user = userEvent.setup();
    const control = makeControl({
      filters: [{ field: "count", operator: "eq", value: 42 }],
    });
    render(<TestFilters control={control} columns={[numberColumn]} />, {
      wrapper,
    });

    await openValueEditor(user);

    const input = await screen.findByRole("spinbutton");
    await user.clear(input);
    await user.type(input, "7");
    await user.keyboard("{Enter}");

    expect(control.addFilter).toHaveBeenCalledWith("count", "eq", 7);
  });
});

describe("Decimal filters", () => {
  const preciseValue = "9007199254740993.123456789";
  const preciseMax = "9007199254740993.123456790";

  it.each(["panel", "chip"] as const)(
    "%s submits scalar decimals as exact strings",
    async (surface) => {
      const user = userEvent.setup();
      const control = makeControl({
        filters: surface === "chip" ? [{ field: "amount", operator: "eq", value: "1" }] : [],
      });
      render(<TestFilters control={control} columns={[decimalColumn]} />, { wrapper });

      if (surface === "panel") await user.click(screen.getByRole("button", { name: "Add filter" }));
      else await openValueEditor(user);

      const input = await screen.findByPlaceholderText("Enter amount");
      expect(input.getAttribute("type")).toBe("text");
      expect(input.getAttribute("inputmode")).toBe("decimal");
      await user.clear(input);
      await user.type(input, preciseValue);
      await user.click(screen.getByRole("button", { name: "Apply" }));

      if (surface === "panel") {
        expect(control.addFilter).toHaveBeenCalledWith("amount", "eq", preciseValue, undefined);
      } else {
        expect(control.addFilter).toHaveBeenCalledWith("amount", "eq", preciseValue);
      }
    },
  );

  it.each(["panel", "chip"] as const)(
    "%s submits precise ranges and rejects reversed bounds",
    async (surface) => {
      const user = userEvent.setup();
      const control = makeControl({
        filters:
          surface === "chip"
            ? [
                {
                  field: "amount",
                  operator: "between",
                  value: { min: preciseValue, max: preciseMax },
                },
              ]
            : [],
      });
      render(<TestFilters control={control} columns={[decimalColumn]} />, { wrapper });

      if (surface === "panel") {
        await user.click(screen.getByRole("button", { name: "Add filter" }));
        await user.click(await screen.findByRole("button", { name: "is between" }));
      } else {
        expect(screen.getByText(`${preciseValue} - ${preciseMax}`)).toBeDefined();
        await openValueEditor(user);
      }

      const min = await screen.findByRole("textbox", { name: "Min" });
      const max = screen.getByRole("textbox", { name: "Max" });
      fireEvent.change(min, { target: { value: "9007199254740993" } });
      fireEvent.change(max, { target: { value: "9007199254740992" } });
      expect((screen.getByRole("button", { name: "Apply" }) as HTMLButtonElement).disabled).toBe(
        true,
      );
      expect(screen.getByText(/must be greater than or equal to/i)).toBeDefined();
      fireEvent.keyDown(max, { key: "Enter" });
      expect(control.addFilter).not.toHaveBeenCalled();

      fireEvent.change(min, { target: { value: preciseValue } });
      fireEvent.change(max, { target: { value: preciseMax } });
      await user.click(screen.getByRole("button", { name: "Apply" }));
      expect(control.addFilter).toHaveBeenCalledWith("amount", "between", {
        min: preciseValue,
        max: preciseMax,
      });
    },
  );

  it("chip editing rejects invalid decimals without clearing the active filter", async () => {
    const user = userEvent.setup();
    const control = makeControl({
      filters: [{ field: "amount", operator: "eq", value: preciseValue }],
    });
    render(<TestFilters control={control} columns={[decimalColumn]} />, { wrapper });
    await openValueEditor(user);

    const input = await screen.findByRole("textbox");
    fireEvent.change(input, { target: { value: "not-a-decimal" } });
    expect((screen.getByRole("button", { name: "Apply" }) as HTMLButtonElement).disabled).toBe(
      true,
    );
    fireEvent.keyDown(input, { key: "Enter" });
    expect(control.addFilter).not.toHaveBeenCalled();
    expect(control.removeFilter).not.toHaveBeenCalled();

    fireEvent.change(input, { target: { value: "-1.23456789123456789e-100" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(control.addFilter).toHaveBeenCalledWith("amount", "eq", "-1.23456789123456789e-100");
  });

  it("operator transitions preserve decimal strings in both directions", async () => {
    const user = userEvent.setup();
    const control = makeControl({
      filters: [{ field: "amount", operator: "eq", value: preciseValue }],
    });
    const { rerender } = render(<TestFilters control={control} columns={[decimalColumn]} />, {
      wrapper,
    });

    await user.click(screen.getByRole("button", { name: "is" }));
    await user.click(await screen.findByRole("button", { name: "is between" }));
    expect(control.addFilter).toHaveBeenCalledWith("amount", "between", {
      min: preciseValue,
      max: preciseValue,
    });

    const rangeControl = makeControl({
      filters: [
        { field: "amount", operator: "between", value: { min: preciseValue, max: preciseMax } },
      ],
    });
    rerender(<TestFilters control={rangeControl} columns={[decimalColumn]} />);
    await user.click(screen.getByRole("button", { name: "is between" }));
    await user.click(await screen.findByRole("button", { name: "is" }));
    expect(rangeControl.addFilter).toHaveBeenCalledWith("amount", "eq", preciseValue);
  });
});

describe("NumericFilterEditor (between)", () => {
  it("shows the between value summary and two number inputs when operator is between", async () => {
    const user = userEvent.setup();
    const control = makeControl({
      filters: [{ field: "count", operator: "between", value: { min: 10, max: 50 } }],
    });
    render(<TestFilters control={control} columns={[numberColumn]} />, {
      wrapper,
    });

    // Chip: operator segment "is between", value segment "10 - 50".
    expect(screen.getByText("is between")).toBeDefined();
    expect(screen.getByText("10 - 50")).toBeDefined();

    await openValueEditor(user);

    const inputs = await screen.findAllByRole("spinbutton");
    expect(inputs.length).toBe(2);
    expect((inputs[0] as HTMLInputElement).value).toBe("10");
    expect((inputs[1] as HTMLInputElement).value).toBe("50");
  });

  it("Apply button calls addFilter with min/max range object", async () => {
    const user = userEvent.setup();
    const control = makeControl({
      filters: [{ field: "count", operator: "between", value: { min: 10, max: 50 } }],
    });
    render(<TestFilters control={control} columns={[numberColumn]} />, {
      wrapper,
    });

    await openValueEditor(user);

    const inputs = await screen.findAllByRole("spinbutton");
    await user.clear(inputs[0]);
    await user.type(inputs[0], "5");
    await user.clear(inputs[1]);
    await user.type(inputs[1], "100");
    await user.click(screen.getByRole("button", { name: "Apply" }));

    expect(control.addFilter).toHaveBeenCalledWith("count", "between", {
      min: 5,
      max: 100,
    });
  });

  it("Apply button does not call addFilter when only min is set and max is empty", async () => {
    const user = userEvent.setup();
    const control = makeControl({
      filters: [{ field: "count", operator: "between", value: { min: 10 } }],
    });
    render(<TestFilters control={control} columns={[numberColumn]} />, {
      wrapper,
    });

    await openValueEditor(user);

    const inputs = await screen.findAllByRole("spinbutton");
    // min should already be "10", max should be empty
    expect((inputs[0] as HTMLInputElement).value).toBe("10");
    expect((inputs[1] as HTMLInputElement).value).toBe("");

    // A half-filled range is invalid, so Apply is disabled and commits nothing.
    await user.click(screen.getByRole("button", { name: "Apply" }));

    expect(control.addFilter).not.toHaveBeenCalled();
  });

  it("Apply button calls removeFilter when both inputs are empty", async () => {
    const user = userEvent.setup();
    const control = makeControl({
      filters: [{ field: "count", operator: "between", value: { min: 10, max: 50 } }],
    });
    render(<TestFilters control={control} columns={[numberColumn]} />, {
      wrapper,
    });

    await openValueEditor(user);

    const inputs = await screen.findAllByRole("spinbutton");
    await user.clear(inputs[0]);
    await user.clear(inputs[1]);
    await user.click(screen.getByRole("button", { name: "Apply" }));

    expect(control.removeFilter).toHaveBeenCalledWith("count");
  });
});
