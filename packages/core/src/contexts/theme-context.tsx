import { createContext, useContext, useEffect, useMemo, useState } from "react";

type Theme = "dark" | "light" | "system";

type ThemeProviderProps = {
  children: React.ReactNode;
  defaultTheme?: Theme;
  storageKey: string;
};

type ThemeProviderState = {
  theme: Theme;
  resolvedTheme: Omit<Theme, "system">;
  setTheme: (theme: Theme) => void;
};

const initialState: ThemeProviderState = {
  resolvedTheme: "light",
  theme: "system",
  setTheme: () => null,
};

const ThemeProviderContext = createContext<ThemeProviderState>(initialState);

function safeGetStoredTheme(storageKey: string): Theme | null {
  try {
    const ls = globalThis.localStorage;
    if (ls && typeof ls.getItem === "function") {
      return ls.getItem(storageKey) as Theme;
    }
  } catch {
    /* private mode / restricted environment */
  }
  return null;
}

function safeSetStoredTheme(storageKey: string, value: Theme) {
  try {
    const ls = globalThis.localStorage;
    if (ls && typeof ls.setItem === "function") {
      ls.setItem(storageKey, value);
    }
  } catch {
    /* ignore */
  }
}

export function ThemeProvider({
  children,
  storageKey,
  defaultTheme = "system",
  ...props
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(() => safeGetStoredTheme(storageKey) ?? defaultTheme);

  const resolvedTheme = useMemo(() => {
    if (theme !== "system") return theme;
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }, [theme]);

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(resolvedTheme);
  }, [resolvedTheme]);

  const value = {
    resolvedTheme,
    theme,
    setTheme: (newTheme: Theme) => {
      safeSetStoredTheme(storageKey, newTheme);
      setTheme(newTheme);
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
