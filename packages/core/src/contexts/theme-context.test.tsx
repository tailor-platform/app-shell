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
  Object.defineProperty(globalThis, "localStorage", { configurable: true, value: ls });
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
  document.documentElement.removeAttribute("data-theme");
  document.documentElement.removeAttribute("data-font");
  document.documentElement.classList.remove("light", "dark");
});

afterEach(() => {
  cleanup();
});

function ThemeProbe() {
  const { theme, resolvedTheme } = useTheme();
  return (
    <div>
      <span data-testid="theme">{theme}</span>
      <span data-testid="resolved">{resolvedTheme}</span>
    </div>
  );
}

function FontProbe() {
  const { font } = useTheme();
  return <span data-testid="font">{font}</span>;
}

describe("ThemeProvider — storage validation", () => {
  it("falls back to defaultTheme for an unrecognized stored value", () => {
    storageMap.set("appshell-ui-theme", "totally-not-a-theme");

    const { getByTestId } = render(
      <ThemeProvider defaultTheme="light">
        <ThemeProbe />
      </ThemeProvider>,
    );

    expect(getByTestId("theme").textContent).toBe("light");
  });

  it("falls back to defaultFont for an unrecognized stored font", () => {
    storageMap.set("appshell-ui-font", "wingdings");

    const { getByTestId } = render(
      <ThemeProvider defaultFont="inter">
        <FontProbe />
      </ThemeProvider>,
    );

    expect(getByTestId("font").textContent).toBe("inter");
  });

  it("reads a valid stored theme", async () => {
    storageMap.set("appshell-ui-theme", "cream");

    const { getByTestId } = render(
      <ThemeProvider>
        <ThemeProbe />
      </ThemeProvider>,
    );

    expect(getByTestId("theme").textContent).toBe("cream");
    await waitFor(() => {
      expect(document.documentElement.dataset.theme).toBe("cream");
    });
  });
});

describe("ThemeProvider — system resolution", () => {
  it("resolves system → dark when prefers-color-scheme: dark matches", async () => {
    installMatchMediaStub(true);
    storageMap.set("appshell-ui-theme", "system");

    const { getByTestId } = render(
      <ThemeProvider>
        <ThemeProbe />
      </ThemeProvider>,
    );

    expect(getByTestId("theme").textContent).toBe("system");
    expect(getByTestId("resolved").textContent).toBe("dark");
    await waitFor(() => {
      expect(document.documentElement.dataset.theme).toBe("dark");
      expect(document.documentElement.classList.contains("dark")).toBe(true);
    });
  });

  it("resolves system → light when prefers-color-scheme: dark does not match", async () => {
    installMatchMediaStub(false);
    storageMap.set("appshell-ui-theme", "system");

    const { getByTestId } = render(
      <ThemeProvider>
        <ThemeProbe />
      </ThemeProvider>,
    );

    expect(getByTestId("resolved").textContent).toBe("light");
    await waitFor(() => {
      expect(document.documentElement.dataset.theme).toBe("light");
      expect(document.documentElement.classList.contains("light")).toBe(true);
    });
  });

  it("reacts to OS color-scheme change while theme is system", async () => {
    installMatchMediaStub(false);
    storageMap.set("appshell-ui-theme", "system");

    const { getByTestId } = render(
      <ThemeProvider>
        <ThemeProbe />
      </ThemeProvider>,
    );

    expect(getByTestId("resolved").textContent).toBe("light");

    // Simulate OS dark mode toggle
    act(() => {
      for (const listener of matchMediaListeners) {
        listener({ matches: true } as MediaQueryListEvent);
      }
    });

    expect(getByTestId("resolved").textContent).toBe("dark");
    await waitFor(() => {
      expect(document.documentElement.dataset.theme).toBe("dark");
    });
  });
});

describe("useTheme — provider guard", () => {
  it("throws when useTheme is called outside ThemeProvider", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<ThemeProbe />)).toThrow(/useTheme must be used within a ThemeProvider/);
    spy.mockRestore();
  });
});
