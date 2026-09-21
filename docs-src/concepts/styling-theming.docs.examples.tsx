import { AppearanceSwitcher, useTheme } from "@tailor-platform/app-shell";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  return (
    <button onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}>
      Switch to {resolvedTheme === "dark" ? "light" : "dark"} mode
    </button>
  );
}

export function AppearanceToggle() {
  return <AppearanceSwitcher />;
}
