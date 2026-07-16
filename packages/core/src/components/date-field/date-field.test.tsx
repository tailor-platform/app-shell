import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CalendarDate, parseDate } from "@internationalized/date";
import { createAppShellWrapper } from "../../../tests/test-utils";
import { Field } from "../field";
import { DateField, DatePicker } from "./date-field";

afterEach(() => {
  cleanup();
});

function getCalendarCells() {
  return screen.getAllByRole("button", { hidden: true }).filter((c) => c.closest('[role="grid"]'));
}

function getEnabledCalendarCells() {
  return getCalendarCells().filter(
    (c) => !c.hasAttribute("data-disabled") && !c.hasAttribute("data-outside-month"),
  );
}

describe("snapshots", () => {
  it("DateField", () => {
    const { container } = render(<DateField aria-label="Invoice date" />);
    expect(container.innerHTML).toMatchSnapshot();
  });

  it("DateField — inside Field.Root", () => {
    const { container } = render(
      <Field.Root invalid>
        <Field.Label>Date</Field.Label>
        <DateField aria-label="Date" />
        <Field.Description>Pick a date</Field.Description>
        <Field.Error match={true}>Required</Field.Error>
      </Field.Root>,
    );
    expect(container.innerHTML).toMatchSnapshot();
  });

  it("DatePicker — closed", () => {
    const { container } = render(<DatePicker aria-label="Ship date" />);
    expect(container.innerHTML).toMatchSnapshot();
  });
});

describe("DateField", () => {
  it("renders standalone with an aria-label", () => {
    render(<DateField aria-label="Invoice date" />);
    expect(screen.getAllByRole("spinbutton").length).toBeGreaterThan(0);
  });

  it("integrates with Field.Label and focuses the first segment when the label is clicked", async () => {
    const user = userEvent.setup();
    render(
      <Field.Root>
        <Field.Label>Date</Field.Label>
        <DateField aria-label="Date" />
      </Field.Root>,
    );

    await user.click(screen.getByText("Date"));
    expect(document.activeElement?.getAttribute("role")).toBe("spinbutton");
  });

  it("wires Field.Description / Field.Error through aria-describedby and invalid state", () => {
    render(
      <Field.Root invalid>
        <Field.Label>Date</Field.Label>
        <DateField aria-label="Date" />
        <Field.Description>Pick a date</Field.Description>
        <Field.Error match={true}>Required</Field.Error>
      </Field.Root>,
    );

    const group = screen.getByRole("group");
    expect(group.getAttribute("aria-describedby")).toBeTruthy();
    expect(group.hasAttribute("data-invalid")).toBe(true);
    expect(screen.getByText("Required")).toBeDefined();
  });

  it("fires onChange once a complete date is typed across the segments", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<DateField aria-label="Date" onChange={onChange} />);

    await user.click(screen.getByRole("spinbutton", { name: "month" }));
    await user.keyboard("06");
    await user.click(screen.getByRole("spinbutton", { name: "day" }));
    await user.keyboard("15");
    await user.click(screen.getByRole("spinbutton", { name: "year" }));
    await user.keyboard("2025");

    await waitFor(() => {
      expect(onChange.mock.calls.at(-1)?.[0]?.toString()).toBe("2025-06-15");
    });
  });

  it("calls onBlur once when focus leaves the whole group", async () => {
    const user = userEvent.setup();
    const onBlur = vi.fn();
    render(
      <>
        <DateField aria-label="Date" onBlur={onBlur} />
        <button type="button">elsewhere</button>
      </>,
    );

    await user.click(screen.getByRole("spinbutton", { name: "month" }));
    await user.click(screen.getByRole("button", { name: "elsewhere" }));

    expect(onBlur).toHaveBeenCalledTimes(1);
  });

  it("clears a controlled DateField when the value is reset to null", () => {
    const { rerender } = render(
      <DateField
        aria-label="Date"
        value={parseDate("2025-06-15") as CalendarDate}
        onChange={() => {}}
      />,
    );
    expect(screen.getByRole("spinbutton", { name: "day" }).textContent).toBe("15");

    rerender(<DateField aria-label="Date" value={null} onChange={() => {}} />);
    expect(screen.getByRole("spinbutton", { name: "day" }).getAttribute("aria-valuetext")).toBe(
      "Empty",
    );
  });

  it("marks the segments required when constraints.required is set", () => {
    render(<DateField aria-label="Date" constraints={{ required: true }} />);
    expect(screen.getByRole("spinbutton", { name: "day" }).getAttribute("aria-required")).toBe(
      "true",
    );
  });

  it("flags a typed date before constraints.min invalid, but still emits it", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <DateField
        aria-label="Date"
        constraints={{ min: new CalendarDate(2025, 6, 10) }}
        onChange={onChange}
      />,
    );

    await user.click(screen.getByRole("spinbutton", { name: "month" }));
    await user.keyboard("06052025");

    await waitFor(() => {
      expect(onChange.mock.calls.at(-1)?.[0]?.toString()).toBe("2025-06-05");
    });
    expect(screen.getByRole("group").hasAttribute("data-invalid")).toBe(true);
  });

  it("flags a typed date invalid when constraints.unavailable rejects it", async () => {
    const user = userEvent.setup();
    render(
      <DateField
        aria-label="Date"
        constraints={{
          unavailable: (d) => d.toString() === "2025-06-12",
        }}
      />,
    );

    await user.click(screen.getByRole("spinbutton", { name: "month" }));
    await user.keyboard("06122025");

    expect(screen.getByRole("group").hasAttribute("data-invalid")).toBe(true);
  });

  it("honours firstDayOfWeek for 'w' in a standalone DateField", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <DateField
        aria-label="Date"
        locale="en-US"
        firstDayOfWeek="mon"
        defaultValue={new CalendarDate(2025, 6, 18)}
        onChange={onChange}
      />,
    );

    await user.click(screen.getByRole("spinbutton", { name: "day" }));
    await user.keyboard("w");

    await waitFor(() => {
      expect(onChange.mock.calls.at(-1)?.[0]?.toString()).toBe("2025-06-16");
    });
  });
});

describe("DatePicker", () => {
  it("renders standalone with an aria-label", () => {
    render(<DatePicker aria-label="Ship date" />);
    expect(screen.getByRole("button", { name: "Open calendar" })).toBeDefined();
  });

  it("opens the popover when the trigger is clicked", async () => {
    const user = userEvent.setup();
    render(<DatePicker aria-label="Date" />);

    await user.click(screen.getByRole("button", { name: "Open calendar" }));

    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeDefined();
    });
  });

  it("fires onChange when a calendar date cell is clicked", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<DatePicker aria-label="Date" onChange={onChange} />);

    await user.click(screen.getByRole("button", { name: "Open calendar" }));
    await waitFor(() => expect(screen.getByRole("grid")).toBeDefined());

    const enabled = getEnabledCalendarCells();
    await user.click(enabled[0]);

    await waitFor(() => {
      expect(onChange).toHaveBeenCalled();
      expect(onChange.mock.calls[0][0]).not.toBeNull();
    });
  });

  it("flags a field shortcut invalid when it lands before constraints.min (popover closed)", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <DatePicker
        aria-label="Date"
        defaultValue={new CalendarDate(2025, 6, 15)}
        constraints={{ min: new CalendarDate(2025, 6, 10) }}
        onChange={onChange}
      />,
    );

    await user.click(screen.getByRole("spinbutton", { name: "day" }));
    await user.keyboard("y");

    await waitFor(() => {
      expect(onChange.mock.calls.at(-1)?.[0]?.toString()).toBe("2025-01-01");
    });
    expect(screen.getByRole("group").hasAttribute("data-invalid")).toBe(true);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("inherits invalid state from Field.Root", () => {
    render(
      <Field.Root invalid>
        <Field.Label>Date</Field.Label>
        <DatePicker aria-label="Date" />
        <Field.Error match={true}>Required</Field.Error>
      </Field.Root>,
    );

    expect(screen.getByRole("group").hasAttribute("data-invalid")).toBe(true);
  });

  it("localizes segment names and chrome from the AppShell locale (ja)", () => {
    render(<DatePicker aria-label="日付" />, { wrapper: createAppShellWrapper("ja") });
    expect(screen.getByRole("spinbutton", { name: "月" })).toBeDefined();
    expect(screen.getByRole("button", { name: "カレンダーを開く" })).toBeDefined();
    expect(screen.getByRole("spinbutton", { name: "月" }).getAttribute("aria-valuetext")).toBe(
      "未入力",
    );
  });
});
