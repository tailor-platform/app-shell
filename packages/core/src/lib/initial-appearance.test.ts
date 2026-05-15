import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { getInitialAppearanceScript } from "./initial-appearance";

function installLocalStorageStub() {
  const map = new Map<string, string>();
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: (k: string) => map.get(k) ?? null,
      setItem: (k: string, v: string) => {
        map.set(k, v);
      },
      removeItem: (k: string) => map.delete(k),
      clear: () => map.clear(),
      key: (i: number) => [...map.keys()][i] ?? null,
      get length() {
        return map.size;
      },
    },
  });
  return map;
}

function installMatchMediaStub(matches: boolean) {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: vi.fn().mockReturnValue({ matches }),
  });
}

let storage: Map<string, string>;

beforeAll(() => {
  storage = installLocalStorageStub();
});

beforeEach(() => {
  storage.clear();
  document.documentElement.removeAttribute("data-theme");
  document.documentElement.removeAttribute("data-font");
  document.documentElement.classList.remove("light", "dark");
});

afterEach(() => {
  vi.restoreAllMocks();
});

/** Run the IIFE source as if a `<script>` tag had inlined it. */
function evalScript(src: string) {
  // eslint-disable-next-line no-new-func
  new Function(src)();
}

describe("getInitialAppearanceScript", () => {
  it("applies the stored theme to <html data-theme> before paint", () => {
    storage.set("appshell-ui-theme", "cream");

    evalScript(getInitialAppearanceScript());

    expect(document.documentElement.dataset.theme).toBe("cream");
    expect(document.documentElement.classList.contains("light")).toBe(true);
  });

  it("applies the stored font to <html data-font>", () => {
    storage.set("appshell-ui-font", "inter");

    evalScript(getInitialAppearanceScript());

    expect(document.documentElement.dataset.font).toBe("inter");
  });

  it("migrates a legacy `tailor-light` value to `cream`", () => {
    storage.set("appshell-ui-theme", "tailor-light");

    evalScript(getInitialAppearanceScript());

    expect(document.documentElement.dataset.theme).toBe("cream");
  });

  it("resolves `system` to dark when prefers-color-scheme: dark matches", () => {
    installMatchMediaStub(true);
    storage.set("appshell-ui-theme", "system");

    evalScript(getInitialAppearanceScript());

    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("falls back to defaultTheme when nothing is stored", () => {
    evalScript(getInitialAppearanceScript({ defaultTheme: "light", defaultFont: "geist" }));

    expect(document.documentElement.dataset.theme).toBe("light");
    expect(document.documentElement.dataset.font).toBe("geist");
  });

  it("honors custom storage keys", () => {
    storage.set("my-theme", "bloom");
    storage.set("my-font", "geist");

    evalScript(getInitialAppearanceScript({ storageKey: "my-theme", fontStorageKey: "my-font" }));

    expect(document.documentElement.dataset.theme).toBe("bloom");
    expect(document.documentElement.dataset.font).toBe("geist");
  });

  it("swallows errors silently so it never blocks paint", () => {
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: {
        getItem: () => {
          throw new Error("storage denied");
        },
      },
    });

    expect(() => evalScript(getInitialAppearanceScript())).not.toThrow();
  });
});
