import { cleanup, render, act, waitFor } from "@testing-library/react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { ThemeProvider, useMode, useTheme, useFont } from "./theme-context";

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
  document.documentElement.removeAttribute("data-theme");
  document.documentElement.removeAttribute("data-font");
  document.documentElement.classList.remove("light", "dark");
});

afterEach(() => {
  cleanup();
});

function Probe() {
  const { mode, resolvedMode } = useMode();
  const { theme } = useTheme();
  return (
    <div>
      <span data-testid="mode">{mode}</span>
      <span data-testid="resolved">{resolvedMode}</span>
      <span data-testid="theme">{theme}</span>
    </div>
  );
}

function FontProbe() {
  const { font } = useFont();
  return <span data-testid="font">{font}</span>;
}

describe("ThemeProvider — storage validation", () => {
  it("falls back to defaultMode for an unrecognized stored mode", () => {
    storageMap.set("appshell-ui-mode", "totally-not-a-mode");

    const { getByTestId } = render(
      <ThemeProvider defaultMode="dark">
        <Probe />
      </ThemeProvider>,
    );

    expect(getByTestId("mode").textContent).toBe("dark");
  });

  it("uses the defaultTheme palette and ignores any stored value", () => {
    // Palette is a developer config — a stale stored value must not shadow it.
    storageMap.set("appshell-ui-theme", "bloom");

    const { getByTestId } = render(
      <ThemeProvider defaultTheme="cream">
        <Probe />
      </ThemeProvider>,
    );

    expect(getByTestId("theme").textContent).toBe("cream");
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

  it("applies the configured palette as data-theme", async () => {
    const { getByTestId } = render(
      <ThemeProvider defaultTheme="cream">
        <Probe />
      </ThemeProvider>,
    );

    expect(getByTestId("theme").textContent).toBe("cream");
    await waitFor(() => {
      expect(document.documentElement.dataset.theme).toBe("cream");
    });
  });

  it("reads a valid stored mode and applies it as the html class", async () => {
    storageMap.set("appshell-ui-mode", "dark");

    const { getByTestId } = render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );

    expect(getByTestId("mode").textContent).toBe("dark");
    await waitFor(() => {
      expect(document.documentElement.classList.contains("dark")).toBe(true);
    });
  });
});

describe("ThemeProvider — axes are independent", () => {
  it("applies palette to data-theme and mode to the class (e.g. cream + dark)", async () => {
    storageMap.set("appshell-ui-mode", "dark");

    render(
      <ThemeProvider defaultTheme="cream">
        <Probe />
      </ThemeProvider>,
    );

    await waitFor(() => {
      expect(document.documentElement.dataset.theme).toBe("cream");
      expect(document.documentElement.classList.contains("dark")).toBe(true);
    });
  });
});

describe("ThemeProvider — system mode resolution", () => {
  it("resolves system → dark when prefers-color-scheme: dark matches", async () => {
    installMatchMediaStub(true);
    storageMap.set("appshell-ui-mode", "system");

    const { getByTestId } = render(
      <ThemeProvider defaultTheme="default">
        <Probe />
      </ThemeProvider>,
    );

    expect(getByTestId("mode").textContent).toBe("system");
    expect(getByTestId("resolved").textContent).toBe("dark");
    await waitFor(() => {
      expect(document.documentElement.classList.contains("dark")).toBe(true);
      // palette stays put — system only resolves the mode axis
      expect(document.documentElement.dataset.theme).toBe("default");
    });
  });

  it("resolves system → light when prefers-color-scheme: dark does not match", async () => {
    installMatchMediaStub(false);
    storageMap.set("appshell-ui-mode", "system");

    const { getByTestId } = render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );

    expect(getByTestId("resolved").textContent).toBe("light");
    await waitFor(() => {
      expect(document.documentElement.classList.contains("light")).toBe(true);
    });
  });

  it("reacts to OS color-scheme change while mode is system", async () => {
    installMatchMediaStub(false);
    storageMap.set("appshell-ui-mode", "system");

    const { getByTestId } = render(
      <ThemeProvider>
        <Probe />
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
      expect(document.documentElement.classList.contains("dark")).toBe(true);
    });
  });
});

describe("provider guards", () => {
  it("throws when useMode is called outside ThemeProvider", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const ModeProbe = () => {
      useMode();
      return null;
    };
    expect(() => render(<ModeProbe />)).toThrow(/useMode must be used within a ThemeProvider/);
    spy.mockRestore();
  });

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
