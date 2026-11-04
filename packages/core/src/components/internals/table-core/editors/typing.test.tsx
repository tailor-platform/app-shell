import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createAppShellWrapper } from "../../../../../tests/test-utils";
import { TypingEditor, type TypingEditorProps } from "./typing";

afterEach(cleanup);
const wrapper = createAppShellWrapper("en");
const props = (): TypingEditorProps => ({
  value: "--",
  editing: true,
  ariaLabel: "Amount",
  numeric: true,
  onBegin: vi.fn(),
  onChange: vi.fn(),
  onCommit: vi.fn(),
  onCancel: vi.fn(),
  onTab: vi.fn(),
});

describe("TypingEditor", () => {
  it("keeps the focused input through parse error and recovery transitions", () => {
    const value = props();
    const view = render(<TypingEditor {...value} />, { wrapper });
    const input = screen.getByRole("textbox", { name: "Amount" });
    act(() => input.focus());
    view.rerender(
      <TypingEditor
        {...value}
        parseError={{ id: "parse-error", message: "Enter a number", hint: "Press Escape to undo" }}
      />,
    );
    expect(screen.getByRole("textbox", { name: "Amount" })).toBe(input);
    expect(input.getAttribute("aria-invalid")).toBe("true");
    expect(input.getAttribute("aria-describedby")).toBe("parse-error");
    expect(document.getElementById("parse-error")?.textContent).toContain("Enter a number");
    view.rerender(<TypingEditor {...value} value="12" />);
    expect(screen.getByRole("textbox", { name: "Amount" })).toBe(input);
    expect(input.getAttribute("aria-invalid")).toBeNull();
    expect(document.activeElement).toBe(input);
  });
  it("routes Tab to the owner's policy and ignores IME confirmation Enter", () => {
    const value = props();
    render(<TypingEditor {...value} />, { wrapper });
    const input = screen.getByRole("textbox", { name: "Amount" });
    fireEvent.compositionStart(input);
    fireEvent.keyDown(input, { key: "Enter", isComposing: true });
    expect(value.onCommit).not.toHaveBeenCalled();
    fireEvent.compositionEnd(input);
    fireEvent.keyDown(input, { key: "Enter" });
    expect(value.onCommit).toHaveBeenCalledTimes(1);
    fireEvent.keyDown(input, { key: "Tab", shiftKey: true });
    expect(value.onTab).toHaveBeenCalledTimes(1);
    expect(value.onCommit).toHaveBeenCalledTimes(1);
    fireEvent.keyDown(input, { key: "Escape" });
    expect(value.onCancel).toHaveBeenCalledTimes(1);
  });
});
