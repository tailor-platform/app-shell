import { useState } from "react";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createAppShellWrapper } from "../../../../../tests/test-utils";
import { ChoiceEditor, type ChoiceEditorConfig, type ChoiceOption } from "./choice";

afterEach(cleanup);
type Row = { name: string };
const row: Row = { name: "Current label" };
const options: ChoiceOption[] = [
  { value: 10, label: "Ten" },
  { value: 20, label: "Twenty" },
];

function deferred() {
  let resolve!: (options: ChoiceOption[]) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<ChoiceOption[]>((accept, fail) => {
    resolve = accept;
    reject = fail;
  });
  return { promise, resolve, reject };
}
function Harness({
  config = { options },
  initial = 10,
  onCommit = () => {},
  onCancel = () => {},
  currentRow = row,
  invalid,
}: {
  config?: ChoiceEditorConfig<Row>;
  initial?: string | number | null;
  onCommit?: (value: string | number | null) => void;
  onCancel?: () => void;
  currentRow?: Row;
  invalid?: boolean;
}) {
  const [value, setValue] = useState(initial);
  return (
    <table>
      <tbody>
        <tr>
          <td>
            <ChoiceEditor
              value={value}
              row={currentRow}
              config={config}
              ariaLabel="Choice"
              invalid={invalid}
              onCommit={(next) => {
                onCommit(next);
                setValue(next);
              }}
              onCancel={onCancel}
            />
          </td>
        </tr>
      </tbody>
    </table>
  );
}
function setup(props: Parameters<typeof Harness>[0] = {}) {
  const user = userEvent.setup();
  const view = render(<Harness {...props} />, { wrapper: createAppShellWrapper("en") });
  const input = screen.getByRole("combobox", { name: "Choice" }) as HTMLInputElement;
  return { user, input, ...view };
}

describe("ChoiceEditor fixed options", () => {
  it("preserves numeric versus string values instead of stringifying selection", async () => {
    const onCommit = vi.fn();
    const { user, input } = setup({
      config: {
        options: [
          { value: 1, label: "Numeric one" },
          { value: "1", label: "Text one" },
        ],
      },
      initial: null,
      onCommit,
    });
    await user.click(input);
    await user.click(screen.getByRole("option", { name: "Numeric one" }));
    expect(onCommit).toHaveBeenLastCalledWith(1);
    await user.click(input);
    await user.click(screen.getByRole("option", { name: "Text one" }));
    expect(onCommit).toHaveBeenLastCalledWith("1");
  });

  it("searches case/full-width insensitively without committing query text or highlights", async () => {
    const onCommit = vi.fn();
    const { user, input } = setup({ onCommit });
    await user.click(input);
    fireEvent.change(input, { target: { value: "ＴＷ" } });
    expect(screen.getByRole("option", { name: "Twenty" })).toBeDefined();
    expect(screen.queryByRole("option", { name: "Ten" })).toBeNull();
    await user.keyboard("{ArrowDown}");
    expect(onCommit).not.toHaveBeenCalled();
    await user.keyboard("{Enter}");
    expect(onCommit).toHaveBeenCalledExactlyOnceWith(20);
  });

  it("clears search without clearing the adopted value, and adopts null only through Clear", async () => {
    const onCommit = vi.fn();
    const { user, input } = setup({ onCommit });
    await user.click(input);
    await user.clear(input);
    expect(onCommit).not.toHaveBeenCalled();
    expect(screen.getAllByRole("option")).toHaveLength(2);
    await user.click(screen.getByRole("button", { name: "Clear value" }));
    expect(onCommit).toHaveBeenCalledExactlyOnceWith(null);
  });

  it("Escape cancels rather than confirming or clearing, including after a query", async () => {
    const onCommit = vi.fn();
    const onCancel = vi.fn();
    const { user, input } = setup({ onCommit, onCancel });
    await user.click(input);
    fireEvent.change(input, { target: { value: "Twenty" } });
    await user.keyboard("{Escape}");
    expect(onCommit).not.toHaveBeenCalled();
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(input.value).toBe("Ten");
  });

  it("Escape from the popup cancels even when the value is invalid", async () => {
    const onCancel = vi.fn();
    const onCommit = vi.fn();
    const { user, input } = setup({ invalid: true, onCancel, onCommit });
    await user.click(input);
    screen.getByRole("button", { name: "Clear value" }).focus();
    await user.keyboard("{Escape}");
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onCommit).not.toHaveBeenCalled();
  });

  it("keeps an unknown current value without injecting a selectable fallback option", async () => {
    const onCommit = vi.fn();
    const { user, input } = setup({ initial: 999, onCommit });
    expect(input.value).toBe("999");
    await user.click(input);
    expect(screen.getAllByRole("option").map((item) => item.textContent)).toEqual([
      "Ten",
      "Twenty",
    ]);
    await user.keyboard("{Escape}");
    expect(input.value).toBe("999");
    expect(onCommit).not.toHaveBeenCalled();
  });

  it("does not confirm a choice while an IME composition is being confirmed", async () => {
    const onCommit = vi.fn();
    const { user, input } = setup({ onCommit });
    await user.click(input);
    fireEvent.compositionStart(input);
    fireEvent.keyDown(input, { key: "Enter", isComposing: true });
    fireEvent.compositionEnd(input);
    expect(onCommit).not.toHaveBeenCalled();
  });
});

describe("ChoiceEditor remote options", () => {
  it("does not fetch for initial or synchronized labels and uses getOptionLabel only in its input", async () => {
    const request = deferred();
    const fn = vi.fn(() => request.promise);
    const config: ChoiceEditorConfig<Row> = {
      fetcher: fn,
      getOptionLabel: (_value, current) => current.name,
    };
    const view = setup({ config, initial: 999 });
    expect(view.input.value).toBe("Current label");
    expect(fn).not.toHaveBeenCalled();
    view.rerender(<Harness config={config} initial={999} currentRow={{ name: "Updated label" }} />);
    expect(view.input.value).toBe("Updated label");
    expect(fn).not.toHaveBeenCalled();
    await view.user.click(view.input);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn.mock.calls[0]).toMatchObject([null, { signal: expect.any(AbortSignal) }]);
    expect(screen.getByText("Loading options...")).toBeDefined();
    await act(async () => request.resolve(options));
    expect(screen.getAllByRole("option")).toHaveLength(2);
    expect(screen.queryByRole("option", { name: "Updated label" })).toBeNull();
  });

  it("shows error/retry while retaining a current fallback label and only retries explicitly", async () => {
    const first = deferred();
    const second = deferred();
    const fn = vi.fn().mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    const { user, input } = setup({
      config: { fetcher: { fn, debounceMs: 0 }, getOptionLabel: () => "Existing item" },
      initial: 999,
    });
    await user.click(input);
    expect(screen.getByText("Loading options...")).toBeDefined();
    await act(async () => first.reject(new Error("Offline")));
    expect(input.value).toBe("Existing item");
    expect(screen.getByText("Could not load options.")).toBeDefined();
    expect(fn).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole("button", { name: "Retry" }));
    expect(fn).toHaveBeenCalledTimes(2);
    await act(async () => second.resolve(options));
    expect(screen.getByRole("option", { name: "Twenty" })).toBeDefined();
    expect(screen.queryByText("Could not load options.")).toBeNull();
  });

  it("does not filter or reorder server results using the local query", async () => {
    const fn = vi.fn(async () => [
      { value: "b", label: "Unrelated result" },
      { value: "a", label: "Alpha result" },
    ]);
    const { user, input } = setup({
      config: { fetcher: { fn, debounceMs: 0 }, getOptionLabel: () => "Existing" },
      initial: "saved",
    });
    await user.click(input);
    await screen.findByRole("option", { name: "Unrelated result" });
    fireEvent.change(input, { target: { value: "server query" } });
    await waitFor(() =>
      expect(fn).toHaveBeenLastCalledWith("server query", { signal: expect.any(AbortSignal) }),
    );
    await screen.findByRole("option", { name: "Unrelated result" });
    expect(screen.getAllByRole("option").map((item) => item.textContent)).toEqual([
      "Unrelated result",
      "Alpha result",
    ]);
  });

  it("blocks stale results even when an older request settles during the next debounce window", async () => {
    const first = deferred();
    const next = deferred();
    const onCommit = vi.fn();
    const fn = vi.fn().mockReturnValueOnce(first.promise).mockReturnValueOnce(next.promise);
    const { user, input } = setup({
      config: { fetcher: { fn, debounceMs: 200 }, getOptionLabel: () => "Existing" },
      initial: "saved",
      onCommit,
    });
    await user.click(input);
    fireEvent.change(input, { target: { value: "new" } });
    await act(async () => first.resolve([{ value: "old", label: "Old result" }]));
    expect(screen.queryByRole("option", { name: "Old result" })).toBeNull();
    expect(screen.getByText("Loading options...")).toBeDefined();
    await user.keyboard("{Enter}");
    expect(onCommit).not.toHaveBeenCalled();
    await waitFor(() => expect(fn).toHaveBeenCalledTimes(2));
    await act(async () => next.resolve([{ value: "new", label: "New result" }]));
    await user.click(screen.getByRole("option", { name: "New result" }));
    expect(onCommit).toHaveBeenCalledExactlyOnceWith("new");
  });

  it("invalidates an old pending source and reloads only when reopened", async () => {
    const oldRequest = deferred();
    const newRequest = deferred();
    const oldSource = vi.fn(() => oldRequest.promise);
    const newSource = vi.fn(() => newRequest.promise);
    const onCommit = vi.fn();
    const view = setup({
      config: { fetcher: oldSource, getOptionLabel: () => "Current" },
      initial: 999,
      onCommit,
    });
    await view.user.click(view.input);
    view.rerender(
      <Harness
        config={{ fetcher: newSource, getOptionLabel: () => "Current" }}
        initial={999}
        onCommit={onCommit}
      />,
    );
    await waitFor(() => expect(view.input.getAttribute("aria-expanded")).toBe("false"));
    expect(newSource).not.toHaveBeenCalled();
    await act(async () => oldRequest.resolve([{ value: "OLD", label: "Old source option" }]));
    await view.user.click(view.input);
    expect(newSource).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("option", { name: "Old source option" })).toBeNull();
    await act(async () => newRequest.resolve([{ value: "NEW", label: "New source option" }]));
    await view.user.click(screen.getByRole("option", { name: "New source option" }));
    expect(onCommit).toHaveBeenCalledExactlyOnceWith("NEW");
  });

  it("drops loaded choices and labels when the source changes", async () => {
    const oldSource = vi.fn(async () => [{ value: 999, label: "Old current label" }]);
    const newRequest = deferred();
    const newSource = vi.fn(() => newRequest.promise);
    const view = setup({
      config: { fetcher: oldSource, getOptionLabel: () => "Old fallback" },
      initial: 999,
    });
    await view.user.click(view.input);
    await screen.findByRole("option", { name: "Old current label" });
    view.rerender(
      <Harness
        config={{ fetcher: newSource, getOptionLabel: () => "New fallback" }}
        initial={999}
      />,
    );
    await waitFor(() => expect(view.input.getAttribute("aria-expanded")).toBe("false"));
    expect(view.input.value).toBe("New fallback");
    await view.user.click(view.input);
    expect(screen.queryByRole("option", { name: "Old current label" })).toBeNull();
    await act(async () => newRequest.resolve([{ value: 10, label: "New option" }]));
    expect(await screen.findByRole("option", { name: "New option" })).toBeDefined();
  });

  it("aborts loading on unmount and never confirms a late result", async () => {
    const request = deferred();
    const onCommit = vi.fn();
    let signal!: AbortSignal;
    const fn = vi.fn((_query: string | null, requestOptions: { signal: AbortSignal }) => {
      signal = requestOptions.signal;
      return request.promise;
    });
    const { user, input, unmount } = setup({
      config: { fetcher: fn, getOptionLabel: () => "Existing" },
      onCommit,
    });
    await user.click(input);
    expect(signal.aborted).toBe(false);
    unmount();
    expect(signal.aborted).toBe(true);
    await act(async () => request.resolve(options));
    expect(onCommit).not.toHaveBeenCalled();
  });
});
