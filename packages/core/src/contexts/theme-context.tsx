import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

/** User-selectable theme. `system` follows OS light/dark (default palettes only — not cream/bloom). */
export type Theme = "light" | "dark" | "cream" | "bloom" | "system";

/** Resolved paint after applying `system`. */
export type ResolvedTheme = "light" | "dark" | "cream" | "bloom";

const ALL_THEMES: readonly Theme[] = ["light", "dark", "cream", "bloom", "system"] as const;

/** Dropdown / switcher entries: order matches selectable themes; labels are user-facing. */
export type ThemeOption = { readonly value: Theme; readonly label: string };

export const THEME_OPTIONS: readonly ThemeOption[] = [
  { value: "bloom", label: "Bloom" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "cream", label: "Cream" },
  { value: "system", label: "System" },
] as const;

/** Font axis — independent of color theme. Applied to `<html>` as `data-font`. */
export type Font = "geist" | "inter";

const ALL_FONTS: readonly Font[] = ["geist", "inter"] as const;

export type FontOption = { readonly value: Font; readonly label: string };

export const FONT_OPTIONS: readonly FontOption[] = [
  { value: "geist", label: "Geist" },
  { value: "inter", label: "Inter" },
] as const;

/** Migrate stored values from legacy `tailor-*` ids before the public rename. */
const LEGACY_THEME_IDS: Partial<Record<string, Theme>> = {
  "tailor-light": "cream",
  "tailor-bloom": "bloom",
  "tailor-dark": "dark",
};

function parseStoredTheme(value: string | null, fallback: Theme): Theme {
  if (!value) return fallback;
  const legacy = LEGACY_THEME_IDS[value];
  if (legacy) return legacy;
  if ((ALL_THEMES as readonly string[]).includes(value)) return value as Theme;
  return fallback;
}

function parseStoredFont(value: string | null, fallback: Font): Font {
  if (!value) return fallback;
  if ((ALL_FONTS as readonly string[]).includes(value)) return value as Font;
  return fallback;
}

function readStored<T extends string>(
  storageKey: string,
  fallback: T,
  parse: (value: string | null, fallback: T) => T,
): T {
  if (typeof window === "undefined") return fallback;
  const ls = window.localStorage;
  const getItem = ls && typeof ls.getItem === "function" ? ls.getItem.bind(ls) : null;
  if (!getItem) return fallback;
  try {
    return parse(getItem(storageKey), fallback);
  } catch {
    return fallback;
  }
}

function writeStored<T extends string>(storageKey: string, value: T) {
  if (typeof window === "undefined") return;
  const ls = window.localStorage;
  if (!ls || typeof ls.setItem !== "function") return;
  try {
    ls.setItem(storageKey, value);
  } catch {
    /* storage full or forbidden */
  }
}

type ThemeProviderProps = {
  children: React.ReactNode;
  defaultTheme?: Theme;
  defaultFont?: Font;
  storageKey: string;
  fontStorageKey: string;
};

type ThemeProviderState = {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: Theme) => void;
  font: Font;
  setFont: (font: Font) => void;
};

const ThemeProviderContext = createContext<ThemeProviderState | undefined>(undefined);

function resolveTheme(theme: Theme): ResolvedTheme {
  if (theme !== "system") return theme;
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function ThemeProvider({
  children,
  storageKey,
  fontStorageKey,
  defaultTheme = "bloom",
  defaultFont = "geist",
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(() =>
    readStored(storageKey, defaultTheme, parseStoredTheme),
  );
  const [font, setFontState] = useState<Font>(() =>
    readStored(fontStorageKey, defaultFont, parseStoredFont),
  );

  const resolvedTheme = useMemo(() => resolveTheme(theme), [theme]);

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(resolvedTheme === "dark" ? "dark" : "light");
    root.dataset.theme = resolvedTheme;
  }, [resolvedTheme]);

  useEffect(() => {
    window.document.documentElement.dataset.font = font;
  }, [font]);

  const setTheme = useCallback(
    (newTheme: Theme) => {
      writeStored(storageKey, newTheme);
      setThemeState(newTheme);
    },
    [storageKey],
  );

  const setFont = useCallback(
    (newFont: Font) => {
      writeStored(fontStorageKey, newFont);
      setFontState(newFont);
    },
    [fontStorageKey],
  );

  const value = useMemo<ThemeProviderState>(
    () => ({ theme, resolvedTheme, setTheme, font, setFont }),
    [theme, resolvedTheme, setTheme, font, setFont],
  );

  return <ThemeProviderContext.Provider value={value}>{children}</ThemeProviderContext.Provider>;
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext);
  if (context === undefined) throw new Error("useTheme must be used within a ThemeProvider");

  const { theme, resolvedTheme, setTheme } = context;
  return useMemo(() => ({ theme, resolvedTheme, setTheme }), [theme, resolvedTheme, setTheme]);
};

export const useFont = () => {
  const context = useContext(ThemeProviderContext);
  if (context === undefined) throw new Error("useFont must be used within a ThemeProvider");

  const { font, setFont } = context;
  return useMemo(() => ({ font, setFont }), [font, setFont]);
};
