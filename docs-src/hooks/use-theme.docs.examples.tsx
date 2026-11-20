import { Moon, Sun } from "lucide-react";
import { Text, useTheme } from "@tailor-platform/app-shell";

export function ThemeDisplay() {
  const { theme } = useTheme();
  return <Text.p>Current theme: {theme}</Text.p>;
}

export function Logo() {
  const { resolvedTheme } = useTheme();
  return (
    <div role="img" aria-label={`${resolvedTheme} mode logo`} className="flex items-center gap-2">
      {resolvedTheme === "dark" ? (
        <Moon aria-hidden className="size-6" />
      ) : (
        <Sun aria-hidden className="size-6" />
      )}
      <Text.span>{resolvedTheme === "dark" ? "Night workspace" : "Day workspace"}</Text.span>
    </div>
  );
}
