import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

type ColorScheme = "light" | "dark";

interface ThemeContextValue {
  colorScheme: ColorScheme;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  colorScheme: "light",
  toggle: () => {},
});

const STORAGE_KEY = "previewer-color-scheme";

function getInitialScheme(): ColorScheme {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "dark" || stored === "light") return stored;
  } catch {
    // SSR or storage unavailable
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [colorScheme, setColorScheme] = useState<ColorScheme>(getInitialScheme);

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute("data-theme", colorScheme);
    root.classList.remove("light", "dark");
    root.classList.add(colorScheme);
    try {
      localStorage.setItem(STORAGE_KEY, colorScheme);
    } catch {
      // storage unavailable
    }
  }, [colorScheme]);

  const toggle = () =>
    setColorScheme((s) => (s === "light" ? "dark" : "light"));

  return (
    <ThemeContext.Provider value={{ colorScheme, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}

export function ThemeToggle() {
  const { colorScheme, toggle } = useTheme();
  return (
    <button
      onClick={toggle}
      aria-label={`Switch to ${colorScheme === "light" ? "dark" : "light"} mode`}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: 32,
        height: 32,
        border: "1px solid var(--border)",
        borderRadius: 6,
        backgroundColor: "transparent",
        cursor: "pointer",
        color: "var(--fg-muted)",
      }}
    >
      {colorScheme === "light" ? (
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M8 1v1m0 12v1m7-7h-1M2 8H1m12.07-4.07-.71.71M3.64 12.36l-.71.71m10.14 0-.71-.71M3.64 3.64l-.71-.71" />
          <circle cx="8" cy="8" r="3" />
        </svg>
      ) : (
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
        </svg>
      )}
    </button>
  );
}
