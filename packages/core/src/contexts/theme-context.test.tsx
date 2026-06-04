import { cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { ThemeProvider, useTheme, useFont } from "./theme-context";

const storageKey = "theme-context-test-theme";
const fontStorageKey = "theme-context-test-font";

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

/** `matchMedia` is not implemented in some test runtimes — stub to a controllable shape. */
function installMatchMediaStub(matches: boolean) {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
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
  const { font } = useFont();
  return <span data-testid="font">{font}</span>;
}

describe("ThemeProvider — legacy id migration", () => {
  it.each([
    ["tailor-light", "cream"],
    ["tailor-bloom", "bloom"],
    ["tailor-dark", "dark"],
  ])("maps stored %s → %s on first render", async (stored, expected) => {
    storageMap.set(storageKey, stored);

    const { getByTestId } = render(
      <ThemeProvider storageKey={storageKey} fontStorageKey={fontStorageKey} defaultTheme="bloom">
        <ThemeProbe />
      </ThemeProvider>,
    );

    expect(getByTestId("theme").textContent).toBe(expected);
    await waitFor(() => {
      expect(document.documentElement.dataset.theme).toBe(expected);
    });
  });

  it("falls back to defaultTheme for an unrecognized stored value", () => {
    storageMap.set(storageKey, "totally-not-a-theme");

    const { getByTestId } = render(
      <ThemeProvider storageKey={storageKey} fontStorageKey={fontStorageKey} defaultTheme="light">
        <ThemeProbe />
      </ThemeProvider>,
    );

    expect(getByTestId("theme").textContent).toBe("light");
  });

  it("falls back to defaultFont for an unrecognized stored font", () => {
    storageMap.set(fontStorageKey, "wingdings");

    const { getByTestId } = render(
      <ThemeProvider storageKey={storageKey} fontStorageKey={fontStorageKey} defaultFont="inter">
        <FontProbe />
      </ThemeProvider>,
    );

    expect(getByTestId("font").textContent).toBe("inter");
  });
});

describe("ThemeProvider — system resolution", () => {
  it("resolves system → dark when prefers-color-scheme: dark matches", async () => {
    installMatchMediaStub(true);
    storageMap.set(storageKey, "system");

    const { getByTestId } = render(
      <ThemeProvider storageKey={storageKey} fontStorageKey={fontStorageKey}>
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
    storageMap.set(storageKey, "system");

    const { getByTestId } = render(
      <ThemeProvider storageKey={storageKey} fontStorageKey={fontStorageKey}>
        <ThemeProbe />
      </ThemeProvider>,
    );

    expect(getByTestId("resolved").textContent).toBe("light");
    await waitFor(() => {
      expect(document.documentElement.dataset.theme).toBe("light");
      expect(document.documentElement.classList.contains("light")).toBe(true);
    });
  });
});

describe("useTheme / useFont — provider guard", () => {
  it("throws when useTheme is called outside ThemeProvider", () => {
    // Silence React's expected error log for this assertion.
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<ThemeProbe />)).toThrow(/useTheme must be used within a ThemeProvider/);
    spy.mockRestore();
  });

  it("throws when useFont is called outside ThemeProvider", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<FontProbe />)).toThrow(/useFont must be used within a ThemeProvider/);
    spy.mockRestore();
  });
});
