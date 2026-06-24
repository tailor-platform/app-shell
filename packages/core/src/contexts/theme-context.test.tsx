import { cleanup, render, act, waitFor } from "@testing-library/react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { ThemeProvider, useTheme } from "./theme-context";

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

function Probe() {
  const { theme, resolvedTheme } = useTheme();
  return (
    <div>
      <span data-testid="color-theme">{theme}</span>
      <span data-testid="resolvedTheme">{resolvedTheme}</span>
    </div>
  );
}

describe("ThemeProvider — storage validation", () => {
  it("falls back to defaultColorTheme for an unrecognized stored color theme", () => {
    storageMap.set("appshell-ui-theme", "totally-not-a-mode");

    const { getByTestId } = render(
      <ThemeProvider defaultColorTheme="dark">
        <Probe />
      </ThemeProvider>,
    );

    expect(getByTestId("color-theme").textContent).toBe("dark");
  });

  it("useTheme returns color theme values", () => {
    storageMap.set("appshell-ui-theme", "dark");

    const { getByTestId } = render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );

    expect(getByTestId("color-theme").textContent).toBe("dark");
    expect(getByTestId("resolvedTheme").textContent).toBe("dark");
  });

  it("reads a valid stored color theme and applies it as the html class", async () => {
    storageMap.set("appshell-ui-theme", "dark");

    const { getByTestId } = render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );

    expect(getByTestId("color-theme").textContent).toBe("dark");
    await waitFor(() => {
      expect(document.documentElement.classList.contains("dark")).toBe(true);
    });
  });
});

describe("ThemeProvider — system color theme resolution", () => {
  it("resolves system → dark when prefers-color-scheme: dark matches", async () => {
    installMatchMediaStub(true);
    storageMap.set("appshell-ui-theme", "system");

    const { getByTestId } = render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );

    expect(getByTestId("color-theme").textContent).toBe("system");
    expect(getByTestId("resolvedTheme").textContent).toBe("dark");
    await waitFor(() => {
      expect(document.documentElement.classList.contains("dark")).toBe(true);
    });
  });

  it("resolves system → light when prefers-color-scheme: dark does not match", async () => {
    installMatchMediaStub(false);
    storageMap.set("appshell-ui-theme", "system");

    const { getByTestId } = render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );

    expect(getByTestId("resolvedTheme").textContent).toBe("light");
    await waitFor(() => {
      expect(document.documentElement.classList.contains("light")).toBe(true);
    });
  });

  it("reacts to OS color-scheme change while color theme is system", async () => {
    installMatchMediaStub(false);
    storageMap.set("appshell-ui-theme", "system");

    const { getByTestId } = render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );

    expect(getByTestId("resolvedTheme").textContent).toBe("light");

    // Simulate OS dark mode toggle
    act(() => {
      for (const listener of matchMediaListeners) {
        listener({ matches: true } as MediaQueryListEvent);
      }
    });

    expect(getByTestId("resolvedTheme").textContent).toBe("dark");
    await waitFor(() => {
      expect(document.documentElement.classList.contains("dark")).toBe(true);
    });
  });
});

describe("provider guards", () => {
  it("throws when useTheme is called outside ThemeProvider", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const TP = () => {
      useTheme();
      return null;
    };
    expect(() => render(<TP />)).toThrow(/useTheme must be used within a ThemeProvider/);
    spy.mockRestore();
  });
});
