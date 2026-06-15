import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { FONT_OPTIONS, COLOR_MODE_OPTIONS, ThemeProvider } from "@/contexts/theme-context";

import { ThemeSwitcher } from "./theme-switcher";

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
  installMatchMediaStub(false);
  document.documentElement.removeAttribute("data-theme");
  document.documentElement.removeAttribute("data-font");
  document.documentElement.classList.remove("light", "dark");
});

afterEach(() => {
  cleanup();
});

describe("ThemeSwitcher", () => {
  it("opens a menu listing every mode and font option", async () => {
    const user = userEvent.setup();

    render(
      <ThemeProvider defaultColorMode="light">
        <ThemeSwitcher />
      </ThemeProvider>,
    );

    await user.click(screen.getByRole("button", { name: "Appearance" }));

    await waitFor(() => {
      expect(screen.getAllByRole("menuitemradio").length).toBe(
        COLOR_MODE_OPTIONS.length + FONT_OPTIONS.length,
      );
    });

    for (const opt of COLOR_MODE_OPTIONS) {
      expect(screen.getByRole("menuitemradio", { name: opt.label })).toBeDefined();
    }
    for (const opt of FONT_OPTIONS) {
      expect(screen.getByRole("menuitemradio", { name: opt.label })).toBeDefined();
    }
  });

  it("does not list color palettes (palette is a developer config)", async () => {
    const user = userEvent.setup();

    render(
      <ThemeProvider>
        <ThemeSwitcher />
      </ThemeProvider>,
    );

    await user.click(screen.getByRole("button", { name: "Appearance" }));

    await waitFor(() => {
      expect(screen.getByRole("menu")).toBeDefined();
    });

    expect(screen.queryByRole("menuitemradio", { name: "Cream" })).toBeNull();
    expect(screen.queryByRole("menuitemradio", { name: "Bloom" })).toBeNull();
  });

  it("exposes the resolved mode on the trigger when system mode is selected", () => {
    render(
      <ThemeProvider defaultColorMode="system">
        <ThemeSwitcher />
      </ThemeProvider>,
    );

    const btn = screen.getByRole("button", { name: "Appearance" });
    expect(btn.getAttribute("title")).toMatch(/following system/i);
    expect(btn.getAttribute("title")).toMatch(/currently light|currently dark/i);
  });

  it("applies the selected mode when a radio item is activated", async () => {
    const user = userEvent.setup();

    render(
      <ThemeProvider defaultColorMode="light">
        <ThemeSwitcher />
      </ThemeProvider>,
    );

    await user.click(screen.getByRole("button", { name: "Appearance" }));

    await waitFor(() => {
      expect(screen.getByRole("menu")).toBeDefined();
    });

    await user.click(screen.getByRole("menuitemradio", { name: "Dark" }));

    await waitFor(() => {
      expect(document.documentElement.classList.contains("dark")).toBe(true);
    });
    expect(localStorage.getItem("appshell-ui-mode")).toBe("dark");
  });

  it("applies selected font when a font radio item is activated", async () => {
    const user = userEvent.setup();

    render(
      <ThemeProvider defaultColorMode="light" defaultFont="geist">
        <ThemeSwitcher />
      </ThemeProvider>,
    );

    await user.click(screen.getByRole("button", { name: "Appearance" }));

    await waitFor(() => {
      expect(screen.getByRole("menu")).toBeDefined();
    });

    await user.click(screen.getByRole("menuitemradio", { name: "Inter" }));

    await waitFor(() => {
      expect(document.documentElement.dataset.font).toBe("inter");
    });
    expect(localStorage.getItem("appshell-ui-font")).toBe("inter");
  });
});
