import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

/**
 * Color mode — the end-user accessibility preference. `system` follows the OS
 * light/dark setting. Applied to `<html>` as the `.light` / `.dark` class.
 */
export type Mode = "light" | "dark" | "system";

/** Mode after resolving `system` to a concrete value. */
export type ResolvedMode = "light" | "dark";

const ALL_MODES: readonly Mode[] = ["light", "dark", "system"] as const;

/** Switcher entries for the appearance (mode) control. */
export type ModeOption = { readonly value: Mode; readonly label: string };

export const MODE_OPTIONS: readonly ModeOption[] = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "system", label: "System" },
] as const;

/**
 * Color palette / brand — a developer/product configuration (not a user-facing
 * picker). Each palette ships both a light and a dark variant; the active
 * variant is chosen by the {@link Mode} axis. Applied to `<html>` as `data-theme`.
 */
export type Theme = "default" | "cream" | "bloom";

/** Developer-facing palette list (e.g. for a custom brand switcher). */
export type ThemeOption = { readonly value: Theme; readonly label: string };

export const THEME_OPTIONS: readonly ThemeOption[] = [
  { value: "default", label: "Default" },
  { value: "cream", label: "Cream" },
  { value: "bloom", label: "Bloom" },
] as const;

/** Font axis — independent of color. Applied to `<html>` as `data-font`. */
export type Font = "geist" | "inter";

const ALL_FONTS: readonly Font[] = ["geist", "inter"] as const;

export type FontOption = { readonly value: Font; readonly label: string };

export const FONT_OPTIONS: readonly FontOption[] = [
  { value: "geist", label: "Geist" },
  { value: "inter", label: "Inter" },
] as const;

const MODE_STORAGE_KEY = "appshell-ui-mode";
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
  /** Initial color mode (user preference). @default "system" */
  defaultMode?: Mode;
  /** Color palette / brand (developer config). @default "default" */
  defaultTheme?: Theme;
  /** Initial font. @default "geist" */
  defaultFont?: Font;
};

type ThemeProviderState = {
  mode: Mode;
  resolvedMode: ResolvedMode;
  setMode: (mode: Mode) => void;
  theme: Theme;
  setTheme: (theme: Theme) => void;
  font: Font;
  setFont: (font: Font) => void;
};

const ThemeProviderContext = createContext<ThemeProviderState | undefined>(undefined);

export function ThemeProvider({
  children,
  defaultMode = "system",
  defaultTheme = "default",
  defaultFont = "geist",
}: ThemeProviderProps) {
  const [mode, setModeState] = useState<Mode>(() =>
    readStored(MODE_STORAGE_KEY, ALL_MODES, defaultMode),
  );
  // Palette is a developer configuration, not a user preference — it comes from
  // `defaultTheme` (the brand the product chose) and is NOT read from / persisted
  // to localStorage, so a stale stored value can never shadow the configured brand.
  // `setTheme` updates it in-session (e.g. for a product's own brand switcher).
  const [theme, setThemeState] = useState<Theme>(defaultTheme);
  const [font, setFontState] = useState<Font>(() =>
    readStored(FONT_STORAGE_KEY, ALL_FONTS, defaultFont),
  );

  // Track OS color-scheme for live "system" mode resolution.
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

  const resolvedMode: ResolvedMode = (() => {
    if (mode !== "system") return mode;
    return systemDark ? "dark" : "light";
  })();

  // Apply the two axes to <html>: mode → class, palette → data-theme.
  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(resolvedMode);
    root.dataset.theme = theme;
  }, [resolvedMode, theme]);

  // Font axis — applied independently of color.
  useEffect(() => {
    window.document.documentElement.dataset.font = font;
  }, [font]);

  const setMode = useCallback((newMode: Mode) => {
    try {
      localStorage.setItem(MODE_STORAGE_KEY, newMode);
    } catch {
      /* storage full or forbidden */
    }
    setModeState(newMode);
  }, []);

  const setTheme = useCallback((newTheme: Theme) => {
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
    () => ({ mode, resolvedMode, setMode, theme, setTheme, font, setFont }),
    [mode, resolvedMode, setMode, theme, setTheme, font, setFont],
  );

  return <ThemeProviderContext.Provider value={value}>{children}</ThemeProviderContext.Provider>;
}

/** Color mode (light / dark / system) — the end-user accessibility preference. */
export const useMode = () => {
  const context = useContext(ThemeProviderContext);
  if (context === undefined) throw new Error("useMode must be used within a ThemeProvider");

  const { mode, resolvedMode, setMode } = context;
  return useMemo(() => ({ mode, resolvedMode, setMode }), [mode, resolvedMode, setMode]);
};

/** Color palette / brand (default / cream / bloom) — developer configuration. */
export const useTheme = () => {
  const context = useContext(ThemeProviderContext);
  if (context === undefined) throw new Error("useTheme must be used within a ThemeProvider");

  const { theme, setTheme } = context;
  return useMemo(() => ({ theme, setTheme }), [theme, setTheme]);
};

export const useFont = () => {
  const context = useContext(ThemeProviderContext);
  if (context === undefined) throw new Error("useFont must be used within a ThemeProvider");

  const { font, setFont } = context;
  return useMemo(() => ({ font, setFont }), [font, setFont]);
};
