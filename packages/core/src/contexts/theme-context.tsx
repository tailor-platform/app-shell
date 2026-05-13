import { createContext, useContext, useEffect, useMemo, useState } from "react";

/** User-selectable theme. `system` follows OS light/dark (default palettes only — not cream/bloom). */
export type Theme = "light" | "dark" | "cream" | "bloom" | "system";

/** Resolved paint after applying `system`. */
export type ResolvedTheme = "light" | "dark" | "cream" | "bloom";

const ALL_THEMES: readonly Theme[] = ["light", "dark", "cream", "bloom", "system"] as const;

/** Dropdown / switcher entries: order matches selectable themes; labels are user-facing. */
export type ThemeOption = { readonly value: Theme; readonly label: string };

export const THEME_OPTIONS: readonly ThemeOption[] = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "cream", label: "Cream" },
  { value: "bloom", label: "Bloom" },
  { value: "system", label: "System" },
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

function readStoredTheme(storageKey: string, fallback: Theme): Theme {
  if (typeof window === "undefined") return fallback;
  const ls = window.localStorage;
  const getItem = ls && typeof ls.getItem === "function" ? ls.getItem.bind(ls) : null;
  if (!getItem) return fallback;
  try {
    return parseStoredTheme(getItem(storageKey), fallback);
  } catch {
    return fallback;
  }
}

function writeStoredTheme(storageKey: string, theme: Theme) {
  if (typeof window === "undefined") return;
  const ls = window.localStorage;
  if (!ls || typeof ls.setItem !== "function") return;
  try {
    ls.setItem(storageKey, theme);
  } catch {
    /* storage full or forbidden */
  }
}

type ThemeProviderProps = {
  children: React.ReactNode;
  defaultTheme?: Theme;
  storageKey: string;
};

type ThemeProviderState = {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: Theme) => void;
};

const initialState: ThemeProviderState = {
  resolvedTheme: "bloom",
  theme: "bloom",
  setTheme: () => null,
};

const ThemeProviderContext = createContext<ThemeProviderState>(initialState);

function resolveTheme(theme: Theme): ResolvedTheme {
  if (theme !== "system") return theme;
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function ThemeProvider({
  children,
  storageKey,
  defaultTheme = "bloom",
  ...props
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(() => readStoredTheme(storageKey, defaultTheme));

  const resolvedTheme = useMemo(() => resolveTheme(theme), [theme]);

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(resolvedTheme === "dark" ? "dark" : "light");
    root.dataset.theme = resolvedTheme;
  }, [resolvedTheme]);

  const value = {
    resolvedTheme,
    theme,
    setTheme: (newTheme: Theme) => {
      writeStoredTheme(storageKey, newTheme);
      setThemeState(newTheme);
    },
  };

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext);

  if (context === undefined) throw new Error("useTheme must be used within a ThemeProvider");

  return context;
};
