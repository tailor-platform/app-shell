import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

/**
 * Color mode — the end-user accessibility preference. `system` follows the OS
 * light/dark setting. Applied to `<html>` as the `.light` / `.dark` class.
 */
export type ColorMode = "light" | "dark" | "system";

/** Mode after resolving `system` to a concrete value. */
export type ResolvedColorMode = "light" | "dark";

const ALL_COLOR_MODES: readonly ColorMode[] = ["light", "dark", "system"] as const;

/** Switcher entries for the appearance (mode) control. */
export type ColorModeOption = {
  readonly value: ColorMode;
  readonly label: string;
};

export const COLOR_MODE_OPTIONS: readonly ColorModeOption[] = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "system", label: "System" },
] as const;

/**
 * Color palette / brand — a developer/product configuration (not a user-facing
 * picker). Each palette ships both a light and a dark variant; the active
 * variant is chosen by the {@link ColorMode} axis. Applied to `<html>` as `data-theme`.
 */
export type Theme = "default" | "cream" | "bloom";

/** Developer-facing palette list (e.g. for a custom brand switcher). */
export type ThemeOption = { readonly value: Theme; readonly label: string };

export const THEME_OPTIONS: readonly ThemeOption[] = [
  { value: "default", label: "Default" },
  { value: "cream", label: "Cream" },
  { value: "bloom", label: "Bloom" },
] as const;

const MODE_STORAGE_KEY = "appshell-ui-mode";

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
  defaultColorMode?: ColorMode;
  /** Color palette / brand (developer config). @default "default" */
  defaultTheme?: Theme;
};

type ThemeProviderState = {
  mode: ColorMode;
  resolvedMode: ResolvedColorMode;
  setMode: (mode: ColorMode) => void;
  theme: Theme;
};

function resolveMode(m: ColorMode, dark: boolean): ResolvedColorMode {
  if (m !== "system") return m;
  return dark ? "dark" : "light";
}

function getSystemDark(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches;
}

const ThemeProviderContext = createContext<ThemeProviderState | undefined>(undefined);

export function ThemeProvider({
  children,
  defaultColorMode = "system",
  defaultTheme = "default",
}: ThemeProviderProps) {
  const [mode, setModeState] = useState<ColorMode>(() =>
    readStored(MODE_STORAGE_KEY, ALL_COLOR_MODES, defaultColorMode),
  );

  const [resolvedMode, setResolvedMode] = useState<ResolvedColorMode>(() =>
    resolveMode(readStored(MODE_STORAGE_KEY, ALL_COLOR_MODES, defaultColorMode), getSystemDark()),
  );

  const applyMode = useCallback(
    (resolved: ResolvedColorMode) => {
      const root = window.document.documentElement;
      root.classList.remove("light", "dark");
      root.classList.add(resolved);
      root.dataset.theme = defaultTheme;
    },
    [defaultTheme],
  );

  // Listen for OS color-scheme changes.
  useEffect(() => {
    applyMode(resolvedMode);
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) => {
      setResolvedMode((prev) => {
        // Only react if current mode is "system"
        const next = resolveMode(mode, e.matches);
        if (next !== prev) applyMode(next);
        return next;
      });
    };
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, [mode, applyMode, resolvedMode]);

  const setMode = useCallback(
    (newMode: ColorMode) => {
      try {
        localStorage.setItem(MODE_STORAGE_KEY, newMode);
      } catch {
        /* storage full or forbidden */
      }
      setModeState(newMode);
      const next = resolveMode(newMode, getSystemDark());
      setResolvedMode(next);
      applyMode(next);
    },
    [applyMode],
  );

  const value = useMemo<ThemeProviderState>(
    () => ({ mode, resolvedMode, setMode, theme: defaultTheme }),
    [mode, resolvedMode, setMode, defaultTheme],
  );

  return <ThemeProviderContext.Provider value={value}>{children}</ThemeProviderContext.Provider>;
}

/** Color mode (light / dark / system) — the end-user accessibility preference. */
export const useColorMode = () => {
  const context = useContext(ThemeProviderContext);
  if (context === undefined) {
    throw new Error("useColorMode must be used within a ThemeProvider");
  }

  const { mode, resolvedMode, setMode } = context;
  return useMemo(() => ({ mode, resolvedMode, setMode }), [mode, resolvedMode, setMode]);
};

/** Color palette / brand (default / cream / bloom) — developer configuration (read-only). */
export const useTheme = () => {
  const context = useContext(ThemeProviderContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};
