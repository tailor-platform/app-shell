import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { ReactNode } from "react";
import {
  CommandPaletteProvider,
  useCommandPaletteDispatch,
  useCommandPaletteActions,
  useCommandPaletteState,
  useRegisterCommandPaletteActions,
  type CommandPaletteAction,
} from "./command-palette-context";

const wrapper = ({ children }: { children: ReactNode }) => (
  <CommandPaletteProvider>{children}</CommandPaletteProvider>
);

const createAction = (overrides: Partial<CommandPaletteAction> = {}): CommandPaletteAction => ({
  key: "test-key",
  label: "Test Action",
  group: "Test Group",
  onSelect: vi.fn(),
  ...overrides,
});

// Hook that returns both dispatch and state from the same provider
const useBoth = () => ({
  dispatch: useCommandPaletteDispatch(),
  actions: useCommandPaletteActions(),
});

describe("CommandPaletteProvider", () => {
  describe("useCommandPaletteActions", () => {
    it("returns empty actions initially", () => {
      const { result } = renderHook(() => useCommandPaletteActions(), {
        wrapper,
      });
      expect(result.current).toEqual([]);
    });

    it("throws when used outside provider", () => {
      expect(() => {
        renderHook(() => useCommandPaletteActions());
      }).toThrow("useCommandPaletteActions must be used within CommandPaletteProvider");
    });
  });

  describe("useCommandPaletteDispatch", () => {
    it("throws when used outside provider", () => {
      expect(() => {
        renderHook(() => useCommandPaletteDispatch());
      }).toThrow("useCommandPaletteDispatch must be used within CommandPaletteProvider");
    });
  });

  describe("register / unregister", () => {
    it("registers actions from a single source", () => {
      const { result } = renderHook(() => useBoth(), { wrapper });

      const action = createAction({ key: "a1", label: "Action 1" });

      act(() => {
        result.current.dispatch.register("source-1", [action]);
      });

      expect(result.current.actions).toHaveLength(1);
      expect(result.current.actions[0].key).toBe("a1");
    });

    it("registers actions from multiple sources", () => {
      const { result } = renderHook(() => useBoth(), { wrapper });

      act(() => {
        result.current.dispatch.register("source-1", [createAction({ key: "a1" })]);
        result.current.dispatch.register("source-2", [
          createAction({ key: "b1" }),
          createAction({ key: "b2" }),
        ]);
      });

      expect(result.current.actions).toHaveLength(3);
      expect(result.current.actions.map((a) => a.key)).toEqual(["a1", "b1", "b2"]);
    });

    it("replaces actions when same sourceId registers again", () => {
      const { result } = renderHook(() => useBoth(), { wrapper });

      act(() => {
        result.current.dispatch.register("source-1", [createAction({ key: "old" })]);
      });
      expect(result.current.actions).toHaveLength(1);
      expect(result.current.actions[0].key).toBe("old");

      act(() => {
        result.current.dispatch.register("source-1", [createAction({ key: "new" })]);
      });
      expect(result.current.actions).toHaveLength(1);
      expect(result.current.actions[0].key).toBe("new");
    });

    it("removes actions when calling the returned unregister function", () => {
      const { result } = renderHook(() => useBoth(), { wrapper });

      let unregister1: () => void;
      act(() => {
        unregister1 = result.current.dispatch.register("source-1", [createAction({ key: "a1" })]);
        result.current.dispatch.register("source-2", [createAction({ key: "b1" })]);
      });
      expect(result.current.actions).toHaveLength(2);

      act(() => {
        unregister1();
      });
      expect(result.current.actions).toHaveLength(1);
      expect(result.current.actions[0].key).toBe("b1");
    });

    it("calling unregister for non-existent sourceId is a no-op", () => {
      const { result } = renderHook(() => useBoth(), { wrapper });

      act(() => {
        result.current.dispatch.register("source-1", [createAction({ key: "a1" })]);
      });

      // Register and immediately unregister a different source
      act(() => {
        const unregister = result.current.dispatch.register("source-other", []);
        unregister();
      });

      // Original source should still be intact
      expect(result.current.actions).toHaveLength(1);
      expect(result.current.actions[0].key).toBe("a1");
    });
  });

  describe("useRegisterCommandPaletteActions", () => {
    it("registers actions with the given group", () => {
      const { result } = renderHook(
        () => {
          useRegisterCommandPaletteActions("My Group", [
            { key: "a1", label: "Action 1", onSelect: vi.fn() },
          ]);
          return useCommandPaletteActions();
        },
        { wrapper },
      );

      expect(result.current).toHaveLength(1);
      expect(result.current[0]).toMatchObject({
        key: "a1",
        label: "Action 1",
        group: "My Group",
      });
    });

    it("unregisters actions on unmount", () => {
      const { result, unmount } = renderHook(
        () => {
          useRegisterCommandPaletteActions("Group", [
            { key: "a1", label: "Action 1", onSelect: vi.fn() },
          ]);
          return useCommandPaletteActions();
        },
        { wrapper },
      );

      expect(result.current).toHaveLength(1);

      unmount();

      // Re-render a fresh hook that only reads actions
      const { result: readResult } = renderHook(() => useCommandPaletteActions(), { wrapper });
      expect(readResult.current).toHaveLength(0);
    });

    it("invokes the latest onSelect even after re-render", () => {
      const first = vi.fn();
      const second = vi.fn();
      const { result, rerender } = renderHook(
        ({ onSelect }) => {
          useRegisterCommandPaletteActions("Group", [{ key: "a1", label: "Action", onSelect }]);
          return useCommandPaletteActions();
        },
        { wrapper, initialProps: { onSelect: first } },
      );

      // Re-render with a new callback (unstable reference)
      rerender({ onSelect: second });

      // The registered action should call the latest callback
      result.current[0].onSelect();
      expect(first).not.toHaveBeenCalled();
      expect(second).toHaveBeenCalledOnce();
    });
  });

  describe("global keyboard shortcut (Cmd+K / Ctrl+K)", () => {
    it("opens the palette with Cmd+K", () => {
      const { result } = renderHook(() => useCommandPaletteState(), { wrapper });
      expect(result.current.open).toBe(false);

      act(() => {
        document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }));
      });
      expect(result.current.open).toBe(true);
    });

    it("opens the palette with Ctrl+K", () => {
      const { result } = renderHook(() => useCommandPaletteState(), { wrapper });
      expect(result.current.open).toBe(false);

      act(() => {
        document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", ctrlKey: true }));
      });
      expect(result.current.open).toBe(true);
    });

    it("toggles the palette closed on repeated Cmd+K", () => {
      const { result } = renderHook(() => useCommandPaletteState(), { wrapper });

      act(() => {
        document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }));
      });
      expect(result.current.open).toBe(true);

      act(() => {
        document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }));
      });
      expect(result.current.open).toBe(false);
    });

    it("does not open the palette with plain K (no modifier)", () => {
      const { result } = renderHook(() => useCommandPaletteState(), { wrapper });

      act(() => {
        document.dispatchEvent(new KeyboardEvent("keydown", { key: "k" }));
      });
      expect(result.current.open).toBe(false);
    });
  });
});
