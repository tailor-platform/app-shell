import { cleanup, renderHook, act, waitFor } from "@testing-library/react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";

import { ThemeProvider, useTheme, type ColorTheme } from "./theme-context";

/** happy-dom / Node can omit a full `localStorage`; ThemeProvider persists via it. */
function installLocalStorageStub() {
  const map = new Map<string, string>();
  const ls = {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => {
      map.set(k, v);
    },
    removeItem: (k: string) => {
      map.delete(k);
    },
    clear: () => map.clear(),
    key: (i: number) => [...map.keys()][i] ?? null,
    get length() {
      return map.size;
    },
  };
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: ls,
  });
  return map;
}

type MatchMediaListener = (e: MediaQueryListEvent) => void;
let matchMediaListeners: MatchMediaListener[] = [];

/** `matchMedia` is not implemented in some test runtimes — stub to a controllable shape. */
function installMatchMediaStub(matches: boolean) {
  matchMediaListeners = [];
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: (_: string, fn: MatchMediaListener) => {
        matchMediaListeners.push(fn);
      },
      removeEventListener: (_: string, fn: MatchMediaListener) => {
        matchMediaListeners = matchMediaListeners.filter((l) => l !== fn);
      },
      dispatchEvent: vi.fn(),
    })),
  });
}

const wrapper =
  (props?: { defaultColorTheme?: ColorTheme }) =>
  ({ children }: { children: ReactNode }) => <ThemeProvider {...props}>{children}</ThemeProvider>;

let storageMap: Map<string, string>;

beforeAll(() => {
  storageMap = installLocalStorageStub();
});

beforeEach(() => {
  storageMap.clear();
  matchMediaListeners = [];
  installMatchMediaStub(false);
  document.documentElement.classList.remove("light", "dark");
});

afterEach(() => {
  cleanup();
});

describe("ThemeProvider — storage validation", () => {
  it("falls back to defaultColorTheme for an unrecognized stored color theme", () => {
    storageMap.set("appshell-ui-theme", "totally-not-a-mode");

    const { result } = renderHook(() => useTheme(), {
      wrapper: wrapper({ defaultColorTheme: "dark" }),
    });

    expect(result.current.theme).toBe("dark");
  });

  it("useTheme returns color theme values", () => {
    storageMap.set("appshell-ui-theme", "dark");

    const { result } = renderHook(() => useTheme(), {
      wrapper: wrapper(),
    });

    expect(result.current.theme).toBe("dark");
    expect(result.current.resolvedTheme).toBe("dark");
  });

  it("reads a valid stored color theme and applies it as the html class", async () => {
    storageMap.set("appshell-ui-theme", "dark");

    const { result } = renderHook(() => useTheme(), {
      wrapper: wrapper(),
    });

    expect(result.current.theme).toBe("dark");
    await waitFor(() => {
      expect(document.documentElement.classList.contains("dark")).toBe(true);
    });
  });
});

describe("ThemeProvider — system color theme resolution", () => {
  it("resolves system → dark when prefers-color-scheme: dark matches", async () => {
    installMatchMediaStub(true);
    storageMap.set("appshell-ui-theme", "system");

    const { result } = renderHook(() => useTheme(), {
      wrapper: wrapper(),
    });

    expect(result.current.theme).toBe("system");
    expect(result.current.resolvedTheme).toBe("dark");
    await waitFor(() => {
      expect(document.documentElement.classList.contains("dark")).toBe(true);
    });
  });

  it("resolves system → light when prefers-color-scheme: dark does not match", async () => {
    installMatchMediaStub(false);
    storageMap.set("appshell-ui-theme", "system");

    const { result } = renderHook(() => useTheme(), {
      wrapper: wrapper(),
    });

    expect(result.current.resolvedTheme).toBe("light");
    await waitFor(() => {
      expect(document.documentElement.classList.contains("light")).toBe(true);
    });
  });

  it("reacts to OS color-scheme change while color theme is system", async () => {
    installMatchMediaStub(false);
    storageMap.set("appshell-ui-theme", "system");

    const { result } = renderHook(() => useTheme(), {
      wrapper: wrapper(),
    });

    expect(result.current.resolvedTheme).toBe("light");

    act(() => {
      for (const listener of matchMediaListeners) {
        listener({ matches: true } as MediaQueryListEvent);
      }
    });

    expect(result.current.resolvedTheme).toBe("dark");
    await waitFor(() => {
      expect(document.documentElement.classList.contains("dark")).toBe(true);
    });
  });
});

describe("provider guards", () => {
  it("throws when useTheme is called outside ThemeProvider", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => renderHook(() => useTheme())).toThrow(
      /useTheme must be used within a ThemeProvider/,
    );
    spy.mockRestore();
  });
});
