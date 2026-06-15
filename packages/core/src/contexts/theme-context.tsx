import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

/**
 * Color theme — the end-user accessibility preference. `system` follows the OS
 * light/dark setting. Applied to `<html>` as the `.light` / `.dark` class.
 */
export type ColorTheme = "light" | "dark" | "system";

/** Color theme after resolving `system` to a concrete value. */
export type ResolvedColorTheme = "light" | "dark";

const ALL_COLOR_THEMES: readonly ColorTheme[] = ["light", "dark", "system"] as const;

/** Switcher entries for the appearance (color theme) control. */
export type ColorThemeOption = {
  readonly value: ColorTheme;
  readonly label: string;
};

export const COLOR_THEME_OPTIONS: readonly ColorThemeOption[] = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "system", label: "System" },
] as const;

/**
 * Color palette / brand — a developer/product configuration (not a user-facing
 * picker). Each palette ships both a light and a dark variant; the active
 * variant is chosen by the {@link ColorTheme} axis. Applied to `<html>` as `data-theme`.
 */
export type ThemePalette = "default" | "cream" | "bloom";

/** Developer-facing palette list (e.g. for a custom brand switcher). */
export type ThemePaletteOption = {
  readonly value: ThemePalette;
  readonly label: string;
};

export const THEME_PALETTE_OPTIONS: readonly ThemePaletteOption[] = [
  { value: "default", label: "Default" },
  { value: "cream", label: "Cream" },
  { value: "bloom", label: "Bloom" },
] as const;

// This key was chosen in the first release and persisted to users' localStorage.
// Changing it would silently discard every existing user's preference — do not rename.
const COLOR_THEME_STORAGE_KEY = "appshell-ui-theme";

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
  /** Initial color theme (user preference). @default "system" */
  defaultColorTheme?: ColorTheme;
  /** Color palette / brand (developer config). @default "default" */
  defaultThemePalette?: ThemePalette;
};

type ThemeProviderState = {
  colorTheme: ColorTheme;
  resolvedColorTheme: ResolvedColorTheme;
  setColorTheme: (colorTheme: ColorTheme) => void;
  palette: ThemePalette;
};

function resolveColorTheme(m: ColorTheme, dark: boolean): ResolvedColorTheme {
  if (m !== "system") return m;
  return dark ? "dark" : "light";
}

function getSystemDark(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches;
}

const ThemeProviderContext = createContext<ThemeProviderState | undefined>(undefined);

export function ThemeProvider({
  children,
  defaultColorTheme = "system",
  defaultThemePalette = "default",
}: ThemeProviderProps) {
  const [colorTheme, setColorThemeState] = useState<ColorTheme>(() =>
    readStored(COLOR_THEME_STORAGE_KEY, ALL_COLOR_THEMES, defaultColorTheme),
  );

  const [resolvedColorTheme, setResolvedColorTheme] = useState<ResolvedColorTheme>(() =>
    resolveColorTheme(
      readStored(COLOR_THEME_STORAGE_KEY, ALL_COLOR_THEMES, defaultColorTheme),
      getSystemDark(),
    ),
  );

  const applyColorTheme = useCallback(
    (resolved: ResolvedColorTheme) => {
      const root = window.document.documentElement;
      root.classList.remove("light", "dark");
      root.classList.add(resolved);
      root.dataset.theme = defaultThemePalette;
    },
    [defaultThemePalette],
  );

  // Apply the resolved color theme to DOM and subscribe to OS color-scheme changes.
  // Kept as a single effect for simplicity — the listener re-registration cost
  // on OS theme change is negligible (microseconds) given it's a rare user action.
  useEffect(() => {
    applyColorTheme(resolvedColorTheme);
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) => {
      const next = resolveColorTheme(colorTheme, e.matches);
      setResolvedColorTheme(next);
    };
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, [colorTheme, resolvedColorTheme, applyColorTheme]);

  const setColorTheme = useCallback(
    (next: ColorTheme) => {
      try {
        localStorage.setItem(COLOR_THEME_STORAGE_KEY, next);
      } catch {
        /* storage full or forbidden */
      }
      setColorThemeState(next);
      const resolved = resolveColorTheme(next, getSystemDark());
      setResolvedColorTheme(resolved);
      applyColorTheme(resolved);
    },
    [applyColorTheme],
  );

  const value = useMemo<ThemeProviderState>(
    () => ({
      colorTheme,
      resolvedColorTheme,
      setColorTheme,
      palette: defaultThemePalette,
    }),
    [colorTheme, resolvedColorTheme, setColorTheme, defaultThemePalette],
  );

  return <ThemeProviderContext.Provider value={value}>{children}</ThemeProviderContext.Provider>;
}

/** Color theme hook — returns the current color theme and a setter. */
export const useTheme = () => {
  const context = useContext(ThemeProviderContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }

  const { colorTheme, resolvedColorTheme, setColorTheme } = context;
  return useMemo(
    () => ({
      theme: colorTheme,
      resolvedTheme: resolvedColorTheme,
      setTheme: setColorTheme,
    }),
    [colorTheme, resolvedColorTheme, setColorTheme],
  );
};
