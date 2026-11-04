import { useState } from "react";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Table } from "@/components/table";
import { createAppShellWrapper } from "../../../../../tests/test-utils";
import { DateEditor, type DateEditorProps } from "./date";

afterEach(cleanup);

function Harness({
  value: initial = "2026-10-02",
  onCommit,
  ...props
}: Omit<DateEditorProps, "ariaLabel">) {
  const [value, setValue] = useState(initial);
  return (
    <>
      <button>Outside the cell</button>
      <button data-testid="error-target">Error details</button>
      <Table.Root>
        <Table.Body>
          <Table.Row>
            <Table.Cell className="astw:relative">
              <span aria-hidden="true">{value ?? "No date"}</span>
              <DateEditor
                {...props}
                value={value}
                ariaLabel="Expected date"
                onCommit={(next) => {
                  setValue(next);
                  onCommit(next);
                }}
              />
            </Table.Cell>
          </Table.Row>
        </Table.Body>
      </Table.Root>
    </>
  );
}

const trigger = () => screen.getByRole("button", { name: /^Expected date/ });
function dayButton(day: string) {
  const popup = document.querySelector<HTMLElement>('[data-slot="table-cell-calendar"]')!;
  return within(popup)
    .getAllByRole("button")
    .find((button) => button.textContent === day && !button.hasAttribute("data-outside-month"))!;
}
function setup(props: Partial<Omit<DateEditorProps, "ariaLabel">> = {}, locale = "en") {
  const onCommit = vi.fn();
  const onCancel = vi.fn();
  const onBegin = vi.fn();
  const view = render(
    <Harness
      value="2026-10-02"
      onCommit={onCommit}
      onCancel={onCancel}
      onBegin={onBegin}
      {...props}
    />,
    { wrapper: createAppShellWrapper(locale) },
  );
  return { ...view, user: userEvent.setup(), onCommit, onCancel, onBegin };
}

describe("DateEditor", () => {
  it("opens a named calendar without committing and confirms a date-only value", async () => {
    const { user, onCommit, onCancel, onBegin } = setup();
    await user.click(trigger());
    expect(screen.getByRole("grid", { name: "Expected date" })).toBeDefined();
    expect(onBegin).toHaveBeenCalledTimes(1);
    expect(onCommit).not.toHaveBeenCalled();
    await user.click(dayButton("20"));
    expect(onCommit).toHaveBeenCalledExactlyOnceWith("2026-10-20");
    expect(onCancel).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.queryByRole("grid")).toBeNull());
    expect(trigger().getAttribute("aria-label")).toBe("Expected date, 2026-10-20");
  });

  it("commits null only for explicit Clear", async () => {
    const { user, onCommit, onCancel } = setup();
    await user.click(trigger());
    await user.click(screen.getByRole("button", { name: "Clear date" }));
    expect(onCommit).toHaveBeenCalledExactlyOnceWith(null);
    expect(onCancel).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.queryByRole("grid")).toBeNull());
    expect(trigger().getAttribute("aria-label")).toBe("Expected date");
  });

  it("Escape cancels rather than clearing or committing the current value", async () => {
    const { user, onCommit, onCancel } = setup();
    await user.click(trigger());
    await user.keyboard("{ArrowRight}{Escape}");
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onCommit).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.queryByRole("grid")).toBeNull());
    expect(trigger().getAttribute("aria-label")).toBe("Expected date, 2026-10-02");
  });

  it("does not bubble popup Escape into the enclosing table", async () => {
    const user = userEvent.setup();
    const onCommit = vi.fn();
    const onCancel = vi.fn();
    const onTableKeyDown = vi.fn();
    render(
      <Table.Root onKeyDown={onTableKeyDown}>
        <Table.Body>
          <Table.Row>
            <Table.Cell>
              <DateEditor
                value="2026-10-02"
                ariaLabel="Expected date"
                onCommit={onCommit}
                onCancel={onCancel}
              />
            </Table.Cell>
          </Table.Row>
        </Table.Body>
      </Table.Root>,
      { wrapper: createAppShellWrapper("en") },
    );
    await user.click(trigger());
    await user.keyboard("{Escape}");
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onCommit).not.toHaveBeenCalled();
    expect(onTableKeyDown).not.toHaveBeenCalled();
  });

  it("outside dismissal cancels once and preserves the current value", async () => {
    const { user, onCommit, onCancel } = setup();
    await user.click(trigger());
    await user.click(screen.getByRole("button", { name: "Outside the cell" }));
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onCommit).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.queryByRole("grid")).toBeNull());
    expect(trigger().getAttribute("aria-label")).toBe("Expected date, 2026-10-02");
  });

  it("keeps the calendar open when focus/pointer moves into the supplied error group", async () => {
    const { user, onCancel, onCommit } = setup({
      containsErrorTarget: (target) =>
        target instanceof Element && target.closest('[data-testid="error-target"]') !== null,
    });
    await user.click(trigger());
    await user.click(screen.getByTestId("error-target"));
    expect(screen.getByRole("grid", { name: "Expected date" })).toBeDefined();
    expect(onCancel).not.toHaveBeenCalled();
    expect(onCommit).not.toHaveBeenCalled();
  });

  it("does not select days outside min/max bounds and permits a boundary day", async () => {
    const { user, onCommit } = setup({ value: "2026-10-15", min: "2026-10-10", max: "2026-10-20" });
    await user.click(trigger());
    const before = dayButton("9");
    const after = dayButton("21");
    expect(before.getAttribute("aria-disabled")).toBe("true");
    expect(after.getAttribute("aria-disabled")).toBe("true");
    fireEvent.click(before);
    fireEvent.click(after);
    expect(onCommit).not.toHaveBeenCalled();
    await user.click(dayButton("20"));
    expect(onCommit).toHaveBeenCalledExactlyOnceWith("2026-10-20");
  });

  it("opens with ArrowDown and forwards invalid state and description", async () => {
    const { user, onBegin } = setup({ invalid: true, describedBy: "date-error" });
    const button = trigger();
    expect(button.getAttribute("aria-invalid")).toBe("true");
    expect(button.getAttribute("aria-describedby")).toBe("date-error");
    button.focus();
    await user.keyboard("{ArrowDown}");
    expect(screen.getByRole("grid", { name: "Expected date" })).toBeDefined();
    expect(onBegin).toHaveBeenCalledTimes(1);
  });

  it("keeps an invalid external value on cancellation instead of guessing a replacement", async () => {
    const { user, onCommit, onCancel } = setup({ value: "not-a-date" });
    await user.click(trigger());
    await user.keyboard("{Escape}");
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onCommit).not.toHaveBeenCalled();
    expect(trigger().getAttribute("aria-label")).toBe("Expected date, not-a-date");
  });

  it("localizes the explicit Clear action in Japanese", async () => {
    const { user, onCommit } = setup({}, "ja");
    await user.click(trigger());
    await user.click(screen.getByRole("button", { name: "日付をクリア" }));
    expect(onCommit).toHaveBeenCalledExactlyOnceWith(null);
  });
});
