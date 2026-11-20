import { StrictMode, Suspense, type ReactNode } from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createCellEditSession } from "../cell-session";
import { CellEditError } from "../cell-edit-error";
import { numberEditor, textEditor } from "./typing";
import { choiceEditor } from "./choice";
import { dateEditor } from "./date";
import type { CellEditor, CellEditorLabels, CellEditorProps } from "./props";

afterEach(cleanup);

const labels: CellEditorLabels = {
  notANumber: "Not a number",
  revertHint: "Press Escape to revert",
  callbackError: "Could not confirm",
  errorHint: "Check the value",
  showError: "Show error",
  errorDialog: "Cell error",
  closeError: "Close error",
  none: "None",
  noMatches: "No matches",
  chooseTime: "Time",
  clear: "Clear",
  done: "Done",
};

function setup<TOptions, TOutput>(
  editor: CellEditor<TOptions, TOutput>,
  options: TOptions,
  current: unknown,
  commit = vi.fn(),
) {
  const session = createCellEditSession<unknown>();
  const props: CellEditorProps<TOptions, TOutput> = {
    options,
    current,
    session,
    commit,
    labels,
    slotPrefix: "test",
    rowKey: "A",
    colKey: "value",
    label: "Value",
    align: "left",
    children: ({ input, onEditorLeave }) => <section onBlur={onEditorLeave}>{input}</section>,
  };
  const view = render(<editor.Editor {...props} />, { wrapper: StrictMode });
  return { ...view, session, commit, props };
}

async function confirm(session: ReturnType<typeof createCellEditSession<unknown>>) {
  let result!: boolean;
  await act(async () => {
    result = await session.confirmPending();
  });
  return result;
}

describe("editor-driven save preparation", () => {
  it("confirms a focused text draft without relying on blur", async () => {
    const { session, commit } = setup(textEditor, {}, "Original");
    const input = screen.getByRole("textbox", { name: "Value" });
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "Changed" } });
    act(() => session.setLocked(true));
    expect(input.getAttribute("readOnly")).not.toBeNull();
    expect(input.getAttribute("aria-disabled")).toBe("true");
    expect(await confirm(session)).toBe(true);
    expect(commit).toHaveBeenCalledExactlyOnceWith("Changed");
  });

  it("retains the confirmation handler after its external view detaches", async () => {
    const { session, commit, unmount } = setup(numberEditor, {}, 10);
    const input = screen.getByRole("textbox", { name: "Value" });
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "23.5" } });
    unmount();
    session.setLocked(true);
    expect(await session.confirmPending()).toBe(true);
    expect(commit).toHaveBeenCalledExactlyOnceWith(23.5);
  });

  it("keeps malformed numeric input after blur and allows correction", async () => {
    const { session, commit } = setup(numberEditor, {}, 10);
    const input = screen.getByRole("textbox", { name: "Value" }) as HTMLInputElement;
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "-" } });
    fireEvent.blur(input);
    expect(input.value).toBe("-");
    expect(input.getAttribute("aria-invalid")).toBe("true");
    expect(await confirm(session)).toBe(false);
    expect(commit).not.toHaveBeenCalled();
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "15" } });
    expect(await confirm(session)).toBe(true);
    expect(commit).toHaveBeenCalledExactlyOnceWith(15);
  });

  it.each(["old", null])(
    "does not select a search result or clear query-only value %s",
    async (current) => {
      const { session, commit } = setup(
        choiceEditor,
        {
          options: [
            { value: "old", label: "Old" },
            { value: "new", label: "New" },
          ],
        },
        current,
      );
      const input = screen.getByRole("combobox", { name: "Value" });
      fireEvent.focus(input);
      fireEvent.change(input, { target: { value: "New" } });
      act(() => session.setLocked(true));
      expect(input.hasAttribute("disabled")).toBe(true);
      expect(await confirm(session)).toBe(true);
      expect(commit).not.toHaveBeenCalled();
    },
  );

  it("confirms a retained selected choice, not its search text", async () => {
    const { session, commit, unmount } = setup(
      choiceEditor,
      {
        options: [
          { value: "old", label: "Old" },
          { value: "new", label: "New" },
        ],
      },
      "old",
    );
    act(() => session.change({ value: "new", label: "New", notified: true }));
    unmount();
    session.setLocked(true);
    expect(await session.confirmPending()).toBe(true);
    expect(commit).toHaveBeenCalledExactlyOnceWith("new");
  });

  it("does not clear an unchanged empty date draft", async () => {
    const { session, commit } = setup(dateEditor, { timeZone: "UTC", withTime: true }, null);
    act(() => session.begin({ day: null, time: null }));
    expect(await confirm(session)).toBe(true);
    expect(commit).not.toHaveBeenCalled();
  });

  it("rejects an incomplete retained date-time draft instead of clearing it", async () => {
    const { session, commit, unmount } = setup(
      dateEditor,
      { timeZone: "UTC", withTime: true },
      null,
    );
    act(() => session.change({ day: "2026-10-20", time: null }));
    unmount();
    session.setLocked(true);
    expect(await session.confirmPending()).toBe(false);
    expect(commit).not.toHaveBeenCalled();
    expect(session.getFailure()).toMatchObject({
      draft: { day: "2026-10-20", time: null },
      source: "commit",
      error: expect.any(CellEditError),
    });
    session.setLocked(false);
    session.change({ day: "2026-10-20", time: "09:30" });
    expect(await session.confirmPending()).toBe(true);
    expect(commit).toHaveBeenCalledExactlyOnceWith("2026-10-20T09:30:00.000Z");
  });

  it("rejects an unavailable date with retained feedback", async () => {
    const { session, commit } = setup(
      dateEditor,
      { timeZone: "UTC", isDateUnavailable: () => true },
      null,
    );
    act(() => session.change({ day: "2026-10-20", time: null }));
    expect(await confirm(session)).toBe(false);
    expect(commit).not.toHaveBeenCalled();
    expect(
      screen.getByRole("button", { name: "Value, 2026-10-20" }).getAttribute("aria-invalid"),
    ).toBe("true");
  });

  it("does not adopt a confirmation callback from an abandoned render", async () => {
    const { session, props, rerender, commit } = setup(textEditor, {}, "Original");
    const suspendedCommit = vi.fn();
    const waiting = new Promise<void>(() => {});
    function Suspend(): ReactNode {
      throw waiting;
    }
    fireEvent.focus(screen.getByRole("textbox", { name: "Value" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Value" }), {
      target: { value: "Changed" },
    });
    rerender(
      <Suspense fallback={<span>Waiting</span>}>
        <textEditor.Editor {...props} commit={suspendedCommit} />
        <Suspend />
      </Suspense>,
    );
    expect(await confirm(session)).toBe(true);
    expect(commit).toHaveBeenCalledExactlyOnceWith("Changed");
    expect(suspendedCommit).not.toHaveBeenCalled();
  });
});
