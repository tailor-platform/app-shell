import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import type { ReactNode } from "react";
import { createAppShellWrapper } from "../../../../../tests/test-utils";
import { DataTable } from "../../data-table";
import { useDataTable } from "../../use-data-table";
import { createColumnHelper } from "../../field-helpers";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

type Row = { id: string; warehouse: string | null };
const { column } = createColumnHelper<Row>();
const OPTIONS = [
  { value: "north", label: "North Tokyo DC" },
  { value: "annex", label: "Tokyo DC Annex" },
  { value: "tokyo", label: "Tokyo DC" },
  { value: "extra", label: "Tokyo DC Extra" },
  { value: "south", label: "South Tokyo DC" },
  { value: "osaka", label: "Osaka" },
  { value: "initial", label: "Initial" },
];

function Harness({
  value = "initial",
  onDraft,
  onCommit,
  badge = false,
}: {
  value?: string | null;
  onDraft: (row: Row, value: string | null) => void;
  onCommit: (row: Row, value: string | null) => void;
  badge?: boolean;
}) {
  const edit = { options: OPTIONS, onValueChange: onDraft, onValueCommitted: onCommit };
  const table = useDataTable<Row>({
    data: {
      rows: [
        { id: "1", warehouse: value },
        { id: "2", warehouse: "initial" },
      ],
    },
    columns: [
      badge
        ? column({ id: "warehouse", label: "Warehouse", type: "badge", edit })
        : column({ id: "warehouse", label: "Warehouse", type: "text", edit }),
    ],
  });
  return (
    <DataTable.Root value={table}>
      <DataTable.Table />
    </DataTable.Root>
  );
}

const AppShellWrapper = createAppShellWrapper("en");
function Wrapper({ children }: { children: ReactNode }) {
  return (
    <MemoryRouter>
      <AppShellWrapper>{children}</AppShellWrapper>
    </MemoryRouter>
  );
}

function setup({ badge = false }: { badge?: boolean } = {}) {
  const onDraft = vi.fn();
  const onCommit = vi.fn();
  const view = render(<Harness onDraft={onDraft} onCommit={onCommit} badge={badge} />, {
    wrapper: Wrapper,
  });
  const user = userEvent.setup();
  const [input, next] = screen.getAllByRole("combobox", {
    name: "Warehouse",
  }) as HTMLInputElement[];
  const search = async (text: string) => {
    await user.click(input);
    await user.clear(input);
    await user.keyboard(text);
  };
  return { user, input, next, onDraft, onCommit, search, ...view };
}

function hoverOption(item: HTMLElement) {
  fireEvent.pointerMove(item, { pointerType: "mouse" });
  // Base UI ignores stationary WebKit mousemoves; happy-dom defaults movement to zero.
  fireEvent.mouseMove(item, { movementX: 1, movementY: 1 });
}

describe("DataTable dropdown confirmation", () => {
  it("ranks exact, prefix, then substring matches, keeping original order within each rank", async () => {
    const { search, onDraft, onCommit } = setup();
    await search("Tokyo DC");
    expect((await screen.findAllByRole("option")).map((item) => item.textContent)).toEqual([
      "Tokyo DC",
      "Tokyo DC Annex",
      "Tokyo DC Extra",
      "North Tokyo DC",
      "South Tokyo DC",
    ]);
    expect(onDraft).not.toHaveBeenCalled();
    expect(onCommit).not.toHaveBeenCalled();
  });

  it.each(["Enter", "Tab"])("confirms a fully typed exact label on %s", async (confirmation) => {
    const { user, input, next, onDraft, onCommit, search } = setup();
    await search("TOKYO DC");
    await screen.findByRole("option", { name: "Tokyo DC" });
    await user.keyboard(`{${confirmation}}`);
    expect(onDraft).toHaveBeenCalledExactlyOnceWith({ id: "1", warehouse: "initial" }, "tokyo");
    expect(onCommit).toHaveBeenCalledExactlyOnceWith({ id: "1", warehouse: "initial" }, "tokyo");
    expect(onDraft.mock.invocationCallOrder[0]).toBeLessThan(onCommit.mock.invocationCallOrder[0]);
    if (confirmation === "Enter") {
      expect(document.activeElement).toBe(input);
      expect(input.readOnly).toBe(true);
      expect(input.closest("td")?.querySelector(":scope > span")?.className).not.toContain(
        "astw:invisible",
      );
    }
    if (confirmation === "Tab") expect(document.activeElement).toBe(next);
  });

  it.each(["Enter", "Tab"])(
    "respects an explicit highlight instead of the exact match on %s",
    async (confirmation) => {
      const { user, onDraft, onCommit, search } = setup();
      await search("Tokyo DC");
      await screen.findByRole("option", { name: "Tokyo DC" });
      await user.keyboard("{ArrowDown}");
      const annex = screen.getByRole("option", { name: "Tokyo DC Annex" });
      expect(annex.hasAttribute("data-highlighted")).toBe(true);
      expect(onDraft).not.toHaveBeenCalled();
      expect(onCommit).not.toHaveBeenCalled();
      await user.keyboard(`{${confirmation}}`);
      expect(onCommit).toHaveBeenCalledExactlyOnceWith({ id: "1", warehouse: "initial" }, "annex");
    },
  );

  describe.each(["outside click", "blur"])("cancelling via %s", (dismissal) => {
    it.each(["exact label", "keyboard highlight", "hover"])(
      "discards %s without callbacks and restores the latest data",
      async (candidate) => {
        const { user, input, onDraft, onCommit, search, rerender } = setup();
        await search("Tokyo DC");
        const annex = await screen.findByRole("option", { name: "Tokyo DC Annex" });
        if (candidate === "keyboard highlight") await user.keyboard("{ArrowDown}");
        if (candidate === "hover") hoverOption(annex);
        if (candidate !== "exact label") {
          expect(annex.hasAttribute("data-highlighted")).toBe(true);
        }
        rerender(<Harness value="osaka" onDraft={onDraft} onCommit={onCommit} />);
        if (dismissal === "outside click") await user.click(document.body);
        else act(() => input.blur());
        expect(input.value).toBe("Osaka");
        expect(input.readOnly).toBe(true);
        expect(input.getAttribute("aria-expanded")).toBe("false");
        expect(onDraft).not.toHaveBeenCalled();
        expect(onCommit).not.toHaveBeenCalled();
      },
    );
  });

  it.each([false, true])(
    "opens on the first Enter after Tab navigation, including badge=%s",
    async (badge) => {
      const { user, input, next, onDraft, onCommit } = setup({ badge });
      act(() => input.focus());
      await user.tab();
      expect(document.activeElement).toBe(next);
      expect(next.getAttribute("aria-expanded")).toBe("false");
      await user.keyboard("{Enter}");
      expect(next.getAttribute("aria-expanded")).toBe("true");
      expect(next.readOnly).toBe(false);
      await user.keyboard("{Escape}");
      await user.tab({ shift: true });
      expect(document.activeElement).toBe(input);
      expect(input.getAttribute("aria-expanded")).toBe("false");
      await user.keyboard("{Enter}");
      expect(input.getAttribute("aria-expanded")).toBe("true");
      expect(input.readOnly).toBe(false);
      expect(onDraft).not.toHaveBeenCalled();
      expect(onCommit).not.toHaveBeenCalled();
    },
  );

  it("does not treat a hovered choice as an explicit Tab selection", async () => {
    const { user, input, next, onDraft, onCommit } = setup();
    await user.click(input);
    const osaka = await screen.findByRole("option", { name: "Osaka" });
    hoverOption(osaka);
    expect(osaka.hasAttribute("data-highlighted")).toBe(true);
    await user.keyboard("{Tab}");
    expect(document.activeElement).toBe(next);
    expect(onDraft).not.toHaveBeenCalled();
    expect(onCommit).not.toHaveBeenCalled();
  });

  it.each(["Enter", "Tab"])(
    "does not let hover override a ranked search match on %s",
    async (key) => {
      const { user, onCommit, search } = setup();
      await search("Tokyo DC");
      const annex = await screen.findByRole("option", { name: "Tokyo DC Annex" });
      hoverOption(annex);
      expect(annex.hasAttribute("data-highlighted")).toBe(true);
      await user.keyboard(`{${key}}`);
      expect(onCommit).toHaveBeenCalledExactlyOnceWith({ id: "1", warehouse: "initial" }, "tokyo");
    },
  );

  it("does not notify again when a confirmed cell loses focus", async () => {
    const { user, next, onDraft, onCommit, search } = setup();
    await search("Tokyo DC");
    await user.keyboard("{Enter}");
    await user.click(next);
    expect(onDraft).toHaveBeenCalledExactlyOnceWith({ id: "1", warehouse: "initial" }, "tokyo");
    expect(onCommit).toHaveBeenCalledExactlyOnceWith({ id: "1", warehouse: "initial" }, "tokyo");
  });

  it.each(["o", "n", "e", "no", "on"])(
    "excludes the clearing option while searching for %s",
    async (text) => {
      const { user, onCommit, search } = setup();
      await search(text);
      expect(screen.queryByRole("option", { name: "None" })).toBeNull();
      await user.keyboard("{Tab}");
      expect(onCommit.mock.calls.every(([, value]) => value !== null)).toBe(true);
    },
  );

  it("keeps None available for an empty query and notifies before explicitly clearing", async () => {
    const { user, input, onDraft, onCommit } = setup();
    await user.click(input);
    await user.clear(input);
    await user.click(await screen.findByRole("option", { name: "None" }));
    expect(onDraft).toHaveBeenCalledExactlyOnceWith({ id: "1", warehouse: "initial" }, null);
    expect(onCommit).toHaveBeenCalledExactlyOnceWith({ id: "1", warehouse: "initial" }, null);
    expect(onDraft.mock.invocationCallOrder[0]).toBeLessThan(onCommit.mock.invocationCallOrder[0]);
  });

  it.each([false, true])("notifies only a changed selection, including badge=%s", async (badge) => {
    const { user, input, onDraft, onCommit } = setup({ badge });
    await user.click(input);
    await user.click(await screen.findByRole("option", { name: "Initial" }));
    expect(onDraft).not.toHaveBeenCalled();
    expect(onCommit).not.toHaveBeenCalled();
    await user.click(input);
    await user.click(await screen.findByRole("option", { name: "Osaka" }));
    expect(onDraft).toHaveBeenCalledExactlyOnceWith({ id: "1", warehouse: "initial" }, "osaka");
    expect(onCommit).toHaveBeenCalledExactlyOnceWith({ id: "1", warehouse: "initial" }, "osaka");
  });

  it("preserves active search across an external update, then cancels to the latest data without callbacks", async () => {
    const { user, input, onDraft, onCommit, search, rerender } = setup();
    await search("Tokyo");
    rerender(<Harness value="osaka" onDraft={onDraft} onCommit={onCommit} />);
    expect(input.value).toBe("Tokyo");
    expect(onDraft).not.toHaveBeenCalled();
    expect(onCommit).not.toHaveBeenCalled();
    await user.keyboard("{Escape}");
    expect(input.value).toBe("Osaka");
    expect(onDraft).not.toHaveBeenCalled();
    expect(onCommit).not.toHaveBeenCalled();
  });

  it("compares a confirmed selection with the latest data", async () => {
    const { user, onDraft, onCommit, search, rerender } = setup();
    await search("Tokyo DC");
    rerender(<Harness value="tokyo" onDraft={onDraft} onCommit={onCommit} />);
    await user.keyboard("{Enter}");
    expect(onDraft).not.toHaveBeenCalled();
    expect(onCommit).not.toHaveBeenCalled();
  });

  it("ends editing on Shift+Enter, and Enter or clicking the focused display starts editing again", async () => {
    const { user, input, search } = setup();
    await search("Tokyo DC");
    await user.keyboard("{Shift>}{Enter}{/Shift}");
    expect(document.activeElement).toBe(input);
    expect(input.readOnly).toBe(true);
    expect(input.getAttribute("aria-expanded")).toBe("false");
    await user.keyboard("{Enter}");
    expect(input.readOnly).toBe(false);
    expect(input.getAttribute("aria-expanded")).toBe("true");
    await user.keyboard("{Escape}");
    expect(input.readOnly).toBe(true);
    await user.click(input);
    expect(input.readOnly).toBe(false);
    expect(input.getAttribute("aria-expanded")).toBe("true");
  });

  it("does not confirm an IME conversion Enter", async () => {
    const { user, input, onDraft, onCommit, search } = setup();
    await search("Tokyo DC");
    fireEvent.compositionStart(input);
    fireEvent.keyDown(input, { key: "Enter", isComposing: true });
    expect(onDraft).not.toHaveBeenCalled();
    expect(onCommit).not.toHaveBeenCalled();
    expect(input.readOnly).toBe(false);
    fireEvent.compositionEnd(input);
    await user.keyboard("{Enter}");
    expect(onCommit).toHaveBeenCalledExactlyOnceWith({ id: "1", warehouse: "initial" }, "tokyo");
  });

  it("keeps the cell context menu available while the dropdown is at rest", async () => {
    const { input } = setup();
    fireEvent.contextMenu(input);
    expect(await screen.findByRole("menuitem", { name: "Copy value" })).toBeDefined();
  });

  it("preserves native context menus and touch interactions while searching", async () => {
    const { input, onDraft, onCommit, search } = setup();
    await search("Tokyo");
    const contextMenu = new MouseEvent("contextmenu", { bubbles: true, cancelable: true });
    fireEvent(input, contextMenu);
    expect(contextMenu.defaultPrevented).toBe(false);
    expect(screen.queryByRole("menu")).toBeNull();
    vi.useFakeTimers();
    fireEvent.touchStart(input, { touches: [{ clientX: 10, clientY: 10 }] });
    act(() => vi.advanceTimersByTime(600));
    expect(screen.queryByRole("menu")).toBeNull();
    expect(input.value).toBe("Tokyo");
    expect(onDraft).not.toHaveBeenCalled();
    expect(onCommit).not.toHaveBeenCalled();
  });

  it("silently discards the search on unmount", async () => {
    const { search, unmount, onDraft, onCommit } = setup();
    await search("Tokyo DC");
    unmount();
    expect(onDraft).not.toHaveBeenCalled();
    expect(onCommit).not.toHaveBeenCalled();
  });
});
