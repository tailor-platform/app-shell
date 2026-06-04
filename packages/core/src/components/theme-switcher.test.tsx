import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { FONT_OPTIONS, THEME_OPTIONS, ThemeProvider } from "@/contexts/theme-context";

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

let storageMap: Map<string, string>;

beforeAll(() => {
  storageMap = installLocalStorageStub();
});

beforeEach(() => {
  storageMap.clear();
});

afterEach(() => {
  cleanup();
});

describe("ThemeSwitcher", () => {
  it("opens a menu listing every theme and font option", async () => {
    const user = userEvent.setup();

    render(
      <ThemeProvider defaultTheme="light">
        <ThemeSwitcher />
      </ThemeProvider>,
    );

    await user.click(screen.getByRole("button", { name: "Appearance" }));

    await waitFor(() => {
      expect(screen.getAllByRole("menuitemradio").length).toBe(
        THEME_OPTIONS.length + FONT_OPTIONS.length,
      );
    });

    for (const opt of THEME_OPTIONS) {
      expect(screen.getByRole("menuitemradio", { name: opt.label })).toBeDefined();
    }
    for (const opt of FONT_OPTIONS) {
      expect(screen.getByRole("menuitemradio", { name: opt.label })).toBeDefined();
    }
  });

  it("exposes resolved palette on the trigger when system mode is selected", () => {
    render(
      <ThemeProvider defaultTheme="system">
        <ThemeSwitcher />
      </ThemeProvider>,
    );

    const btn = screen.getByRole("button", { name: "Appearance" });
    expect(btn.getAttribute("title")).toMatch(/following system/i);
    expect(btn.getAttribute("title")).toMatch(/currently light|currently dark/i);
  });

  it("applies selected palette when a radio item is activated", async () => {
    const user = userEvent.setup();

    render(
      <ThemeProvider defaultTheme="light">
        <ThemeSwitcher />
      </ThemeProvider>,
    );

    await user.click(screen.getByRole("button", { name: "Appearance" }));

    await waitFor(() => {
      expect(screen.getByRole("menu")).toBeDefined();
    });

    await user.click(screen.getByRole("menuitemradio", { name: "Bloom" }));

    await waitFor(() => {
      expect(document.documentElement.dataset.theme).toBe("bloom");
    });
    expect(localStorage.getItem("appshell-ui-theme")).toBe("bloom");
  });

  it("applies selected font when a font radio item is activated", async () => {
    const user = userEvent.setup();

    render(
      <ThemeProvider defaultTheme="light" defaultFont="geist">
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
