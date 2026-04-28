import { createContext, useContext, useEffect, useMemo, useState } from "react";

/** User-selectable theme. `system` follows OS light/dark (default palettes only — B1). */
export type Theme = "light" | "dark" | "tailor-light" | "tailor-dark" | "system";

/** Resolved paint after applying `system`. */
export type ResolvedTheme = "light" | "dark" | "tailor-light" | "tailor-dark";

const ALL_THEMES: readonly Theme[] = [
  "light",
  "dark",
  "tailor-light",
  "tailor-dark",
  "system",
] as const;

function parseStoredTheme(value: string | null, fallback: Theme): Theme {
  if (value && (ALL_THEMES as readonly string[]).includes(value)) return value as Theme;
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
  resolvedTheme: "light",
  theme: "system",
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
  defaultTheme = "system",
  ...props
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(() => readStoredTheme(storageKey, defaultTheme));

  const resolvedTheme = useMemo(() => resolveTheme(theme), [theme]);

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(
      resolvedTheme === "dark" || resolvedTheme === "tailor-dark" ? "dark" : "light",
    );
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
