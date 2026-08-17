import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CalendarDate, parseDate, isSameDay } from "@internationalized/date";
import { createAppShellWrapper } from "../../../tests/test-utils";
import { Field } from "../field";
import { Form } from "../form";
import { DateRangePicker } from "./date-range-picker";

// Behaviour + DOM a11y contract for DateRangePicker: one labelled group with
// start/end segment runs, a single popover trigger, popover lifecycle (stays
// open on the anchor pick, closes on completion), reversed-range validation,
// and the dual standalone / Field.Root composition model. The grid selection
// model itself is covered in ../calendar/range-calendar.test.tsx.

afterEach(() => {
  cleanup();
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

const d = (iso: string) => parseDate(iso) as CalendarDate;

type Field = "start date" | "end date";

const seg = (field: Field, name: string) =>
  screen.getByRole("spinbutton", { name: `${field} ${name}` });

async function typeDate(user: ReturnType<typeof userEvent.setup>, field: Field, iso: string) {
  const [year, month, day] = iso.split("-");
  await user.click(seg(field, "month"));
  await user.keyboard(month);
  await user.click(seg(field, "day"));
  await user.keyboard(day);
  await user.click(seg(field, "year"));
  await user.keyboard(year);
}

const normalizeIds = (html: string) => html.replace(/id="base-ui-[^"]+"/g, 'id="base-ui-ID"');

// ─── Snapshot ─────────────────────────────────────────────────────────────────

describe("snapshots", () => {
  it("DateRangePicker — closed", () => {
    const { container } = render(<DateRangePicker aria-label="Billing period" />);
    expect(normalizeIds(container.innerHTML)).toMatchSnapshot();
  });
});

// ─── Structure ────────────────────────────────────────────────────────────────

describe("DateRangePicker structure", () => {
  it("renders one group with start and end segment runs and a single trigger", () => {
    render(<DateRangePicker aria-label="Billing period" />);

    expect(screen.getByRole("group", { name: "Billing period" })).toBeDefined();
    for (const field of ["start date", "end date"] as const) {
      for (const name of ["month", "day", "year"]) {
        expect(seg(field, name)).toBeDefined();
      }
    }
    expect(screen.getAllByRole("button", { name: "Open calendar" })).toHaveLength(1);
  });

  it("localizes field-scoped segment names and the trigger (ja)", () => {
    render(<DateRangePicker aria-label="請求期間" />, { wrapper: createAppShellWrapper("ja") });
    expect(screen.getByRole("spinbutton", { name: "開始日の月" })).toBeDefined();
    expect(screen.getByRole("spinbutton", { name: "終了日の日" })).toBeDefined();
    expect(screen.getByRole("button", { name: "カレンダーを開く" })).toBeDefined();
  });

  it("serializes both ends into plain hidden inputs via startName/endName", () => {
    const { container } = render(
      <DateRangePicker
        aria-label="Billing period"
        defaultValue={{ start: d("2025-06-10"), end: d("2025-06-15") }}
        startName="from"
        endName="to"
      />,
    );
    expect(container.querySelector<HTMLInputElement>('input[name="from"]')?.value).toBe(
      "2025-06-10",
    );
    expect(container.querySelector<HTMLInputElement>('input[name="to"]')?.value).toBe("2025-06-15");
  });
});

// ─── Typing ───────────────────────────────────────────────────────────────────

describe("DateRangePicker typing", () => {
  it("emits onChange once both ends are complete", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<DateRangePicker aria-label="Billing period" onChange={onChange} />);

    await typeDate(user, "start date", "2025-06-10");
    expect(onChange).not.toHaveBeenCalled();

    await typeDate(user, "end date", "2025-06-15");
    expect(onChange).toHaveBeenCalled();
    const range = onChange.mock.calls.at(-1)![0];
    expect(isSameDay(range.start, d("2025-06-10"))).toBe(true);
    expect(isSameDay(range.end, d("2025-06-15"))).toBe(true);
  });

  it("flags a reversed typed range invalid instead of swapping it (standalone)", async () => {
    const user = userEvent.setup();
    render(<DateRangePicker aria-label="Billing period" />);

    await typeDate(user, "start date", "2025-06-15");
    await typeDate(user, "end date", "2025-06-10");

    // No component-owned error node any more — the invalid state shows on the
    // group + segments, and on the hidden proxy input's native validity.
    expect(screen.getByRole("group").hasAttribute("data-invalid")).toBe(true);
    expect(seg("start date", "month").getAttribute("aria-invalid")).toBe("true");
  });

  it("flags an end typed outside minValue invalid (per-end validation)", async () => {
    const user = userEvent.setup();
    render(<DateRangePicker aria-label="Billing period" minValue={d("2025-06-10")} />);

    await typeDate(user, "start date", "2025-06-05"); // before minValue
    await typeDate(user, "end date", "2025-06-20");

    expect(screen.getByRole("group").hasAttribute("data-invalid")).toBe(true);
  });

  it("flags a typed unavailable date invalid via isDateUnavailable", async () => {
    const user = userEvent.setup();
    const unavailable = d("2025-06-18");
    render(
      <DateRangePicker
        aria-label="Billing period"
        isDateUnavailable={(x) => isSameDay(x, unavailable)}
      />,
    );

    await typeDate(user, "start date", "2025-06-10");
    await typeDate(user, "end date", "2025-06-18"); // unavailable

    expect(screen.getByRole("group").hasAttribute("data-invalid")).toBe(true);
  });

  it("moves focus across the two fields with arrow keys", async () => {
    const user = userEvent.setup();
    render(<DateRangePicker aria-label="Billing period" />);

    seg("start date", "year").focus();
    await user.keyboard("{ArrowRight}");
    expect(document.activeElement).toBe(seg("end date", "month"));

    await user.keyboard("{ArrowLeft}");
    expect(document.activeElement).toBe(seg("start date", "year"));
  });

  it("keeps an externally-controlled value in sync", async () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <DateRangePicker
        aria-label="Billing period"
        value={{ start: d("2025-06-10"), end: d("2025-06-15") }}
        onChange={onChange}
      />,
    );
    expect(seg("start date", "day").textContent).toBe("10");

    rerender(
      <DateRangePicker
        aria-label="Billing period"
        value={{ start: d("2025-07-01"), end: d("2025-07-04") }}
        onChange={onChange}
      />,
    );
    expect(seg("start date", "month").textContent).toBe("07");
    expect(seg("end date", "day").textContent).toBe("04");
    // The external update must not echo back through onChange.
    expect(onChange).not.toHaveBeenCalled();
  });
});

// ─── Standalone ARIA + Field.Root composition ───────────────────────────────

describe("DateRangePicker labeling", () => {
  it("supports manual aria-labelledby / aria-describedby + isInvalid", () => {
    render(
      <>
        <span id="range-label">Period</span>
        <DateRangePicker
          aria-labelledby="range-label"
          aria-describedby="range-help range-error"
          isInvalid
        />
        <p id="range-help">Pick a range</p>
        <p id="range-error">Required</p>
      </>,
    );
    const group = screen.getByRole("group", { name: "Period" });
    expect(group.getAttribute("aria-describedby")).toBe("range-help range-error");
    expect(group.hasAttribute("data-invalid")).toBe(true);
  });

  it("focuses the start's first segment when a Field.Label is clicked", async () => {
    const user = userEvent.setup();
    render(
      <Field.Root name="period">
        <Field.Label>Billing period</Field.Label>
        <DateRangePicker />
      </Field.Root>,
    );

    await user.click(screen.getByText("Billing period"));
    // First segment of the START row is focused (start renders first).
    expect(document.activeElement?.getAttribute("aria-label")).toMatch(/^start date/);
  });

  it("inherits invalid state from Field.Root", () => {
    render(
      <Field.Root name="period" error={{ message: "Required" }}>
        <Field.Label>Billing period</Field.Label>
        <DateRangePicker />
        <Field.Error match={true}>Required</Field.Error>
      </Field.Root>,
    );
    expect(screen.getByRole("group").hasAttribute("data-invalid")).toBe(true);
    expect(screen.getByText("Required")).toBeDefined();
  });
});

// ─── Form validation ─────────────────────────────────────────────────────────

describe("DateRangePicker form validation", () => {
  it("submits the combined range value through Form", async () => {
    const user = userEvent.setup();
    const onFormSubmit = vi.fn();
    render(
      <Form onFormSubmit={onFormSubmit}>
        <Field.Root name="period">
          <Field.Label>Billing period</Field.Label>
          <DateRangePicker defaultValue={{ start: d("2025-06-10"), end: d("2025-06-15") }} />
        </Field.Root>
        <button type="submit">Save</button>
      </Form>,
    );

    await user.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(onFormSubmit).toHaveBeenCalled());
    expect(onFormSubmit.mock.calls[0]?.[0]).toEqual({ period: "2025-06-10/2025-06-15" });
  });

  it("blocks submit for a required, incomplete range (valueMissing)", async () => {
    const user = userEvent.setup();
    const onFormSubmit = vi.fn();
    render(
      <Form onFormSubmit={onFormSubmit}>
        <Field.Root name="period">
          <Field.Label>Billing period</Field.Label>
          <DateRangePicker isRequired />
          <Field.Error match="valueMissing">Select a range.</Field.Error>
        </Field.Root>
        <button type="submit">Save</button>
      </Form>,
    );

    // Only the start is filled → combined value empty → required blocks submit.
    await typeDate(user, "start date", "2025-06-10");
    await user.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(screen.getByText("Select a range.")).toBeDefined());
    expect(onFormSubmit).not.toHaveBeenCalled();
  });

  it("shows a reversed-range message via Field.Error (customError) and blocks submit", async () => {
    const user = userEvent.setup();
    const onFormSubmit = vi.fn();
    render(
      <Form onFormSubmit={onFormSubmit}>
        <Field.Root name="period">
          <Field.Label>Billing period</Field.Label>
          <DateRangePicker />
          <Field.Error match="customError" />
        </Field.Root>
        <button type="submit">Save</button>
      </Form>,
    );

    await typeDate(user, "start date", "2025-06-15");
    await typeDate(user, "end date", "2025-06-10"); // reversed
    await user.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() =>
      expect(screen.getByText("Start date must be before end date.")).toBeDefined(),
    );
    expect(onFormSubmit).not.toHaveBeenCalled();
  });
});

// ─── Popover ──────────────────────────────────────────────────────────────────

describe("DateRangePicker popover", () => {
  const defaultRange = { start: d("2025-03-05"), end: d("2025-03-08") };
  const gridCell = (labelPart: RegExp) => screen.getByRole("button", { name: labelPart });

  it("stays open after the first pick and closes when the range completes", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <DateRangePicker
        aria-label="Billing period"
        defaultValue={defaultRange}
        onChange={onChange}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Open calendar" }));
    await screen.findByRole("dialog");

    await user.click(gridCell(/March 10, 2025/));
    expect(screen.getByRole("dialog")).toBeDefined();
    expect(onChange).not.toHaveBeenCalled();

    await user.click(gridCell(/March 12, 2025/));
    const range = onChange.mock.calls[0][0];
    expect(isSameDay(range.start, d("2025-03-10"))).toBe(true);
    expect(isSameDay(range.end, d("2025-03-12"))).toBe(true);
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(seg("start date", "day").textContent).toBe("10");
    expect(seg("end date", "day").textContent).toBe("12");
  });

  it("opens with Alt+ArrowDown from a segment", async () => {
    const user = userEvent.setup();
    render(<DateRangePicker aria-label="Billing period" defaultValue={defaultRange} />);

    seg("end date", "month").focus();
    await user.keyboard("{Alt>}{ArrowDown}{/Alt}");
    expect(await screen.findByRole("dialog")).toBeDefined();
  });

  it("drops a dangling anchor when the popover is dismissed mid-selection", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <DateRangePicker
        aria-label="Billing period"
        defaultValue={defaultRange}
        onChange={onChange}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Open calendar" }));
    await screen.findByRole("dialog");
    await user.click(gridCell(/March 20, 2025/));
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(onChange).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Open calendar" }));
    await screen.findByRole("dialog");
    await user.click(gridCell(/March 10, 2025/));
    await user.click(gridCell(/March 12, 2025/));
    const range = onChange.mock.calls[0][0];
    expect(isSameDay(range.start, d("2025-03-10"))).toBe(true);
    expect(isSameDay(range.end, d("2025-03-12"))).toBe(true);
  });
});
