import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

/** User-selectable theme. `system` follows OS light/dark (default palettes only — not cream/bloom). */
export type Theme = "light" | "dark" | "cream" | "bloom" | "system";

/** Resolved paint after applying `system`. */
export type ResolvedTheme = "light" | "dark" | "cream" | "bloom";

const ALL_THEMES: readonly Theme[] = ["light", "dark", "cream", "bloom", "system"] as const;

/** Dropdown / switcher entries: order matches selectable themes; labels are user-facing. */
export type ThemeOption = { readonly value: Theme; readonly label: string };
export type FontOption = { readonly value: Font; readonly label: string };

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

export const FONT_OPTIONS: readonly FontOption[] = [
  { value: "geist", label: "Geist" },
  { value: "inter", label: "Inter" },
] as const;

const THEME_STORAGE_KEY = "appshell-ui-theme";
const FONT_STORAGE_KEY = "appshell-ui-font";

function readStored<T extends string>(key: string, allowList: readonly T[], fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const v = localStorage.getItem(key);
    return v && (allowList as readonly string[]).includes(v) ? (v as T) : fallback;
  } catch {
    return fallback;
  }
}

type ThemeProviderProps = {
  children: React.ReactNode;
  defaultTheme?: Theme;
  defaultFont?: Font;
};

type ThemeProviderState = {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: Theme) => void;
  font: Font;
  setFont: (font: Font) => void;
};

const ThemeProviderContext = createContext<ThemeProviderState | undefined>(undefined);

export function ThemeProvider({
  children,
  defaultTheme = "bloom",
  defaultFont = "geist",
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(() =>
    readStored(THEME_STORAGE_KEY, ALL_THEMES, defaultTheme),
  );
  const [font, setFontState] = useState<Font>(() =>
    readStored(FONT_STORAGE_KEY, ALL_FONTS, defaultFont),
  );

  // Track OS color-scheme for live "system" theme resolution
  const [systemDark, setSystemDark] = useState(() =>
    typeof window !== "undefined"
      ? window.matchMedia("(prefers-color-scheme: dark)").matches
      : false,
  );

  useEffect(() => {
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);

  const resolvedTheme: ResolvedTheme = (() => {
    if (theme !== "system") return theme;
    return systemDark ? "dark" : "light";
  })();

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(resolvedTheme === "dark" ? "dark" : "light");
    root.dataset.theme = resolvedTheme;
  }, [resolvedTheme]);

  useEffect(() => {
    window.document.documentElement.dataset.font = font;
  }, [font]);

  const setTheme = useCallback((newTheme: Theme) => {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, newTheme);
    } catch {
      /* storage full or forbidden */
    }
    setThemeState(newTheme);
  }, []);

  const setFont = useCallback((newFont: Font) => {
    try {
      localStorage.setItem(FONT_STORAGE_KEY, newFont);
    } catch {
      /* storage full or forbidden */
    }
    setFontState(newFont);
  }, []);

  const value = useMemo<ThemeProviderState>(
    () => ({ theme, resolvedTheme, setTheme, font, setFont }),
    [theme, resolvedTheme, setTheme, font, setFont],
  );

  return <ThemeProviderContext.Provider value={value}>{children}</ThemeProviderContext.Provider>;
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext);
  if (context === undefined) throw new Error("useTheme must be used within a ThemeProvider");
  return context;
};
