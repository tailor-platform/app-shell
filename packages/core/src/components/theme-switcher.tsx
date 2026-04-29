import { Palette } from "lucide-react";

import { Menu } from "@/components/menu";
import { Button } from "@/components/button";
import { cn } from "@/lib/utils";
import { useTheme, type ResolvedTheme, type Theme, THEME_OPTIONS } from "@/contexts/theme-context";

const RESOLVED_THEME_SHORT: Record<ResolvedTheme, string> = {
  light: "Light",
  dark: "Dark",
  "deep-dark": "Deep dark",
  cream: "Cream",
  bloom: "Bloom",
};

/**
 * Decorative dual swatches — approximates each palette pair (accent + neutral) for the picker grid.
 */
const THEME_PREVIEW: Record<Theme, { readonly a: `#${string}`; readonly b: `#${string}` }> = {
  light: { a: "#ffffff", b: "#d4d4d8" },
  dark: { a: "#3f3f46", b: "#d4d4d8" },
  "deep-dark": { a: "#09090b", b: "#a1a1aa" },
  cream: { a: "#f8f3e4", b: "#e2d4fe" },
  bloom: { a: "#535ae8", b: "#f8f3e4" },
  system: { a: "#52525b", b: "#7c73e6" },
};

function isTheme(value: string): value is Theme {
  return THEME_OPTIONS.some((o) => o.value === value);
}

function ThemePreviewSwatches({ themeId }: { themeId: Theme }) {
  const { a, b } = THEME_PREVIEW[themeId];
  return (
    <div
      className="astw:flex astw:h-10 astw:w-full astw:max-w-[5.5rem] astw:items-center astw:justify-center astw:gap-1.5 astw:rounded-md astw:border astw:border-border/80 astw:bg-card astw:px-2"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "0.375rem",
      }}
      aria-hidden
    >
      <span
        className="astw:size-4 astw:shrink-0 astw:rounded-full astw:border astw:border-black/10 astw:shadow-sm"
        style={{ backgroundColor: a }}
      />
      <span
        className="astw:size-4 astw:shrink-0 astw:rounded-full astw:border astw:border-black/10 astw:shadow-sm"
        style={{ backgroundColor: b }}
      />
    </div>
  );
}

/**
 * Appearance menu: visual grid of every palette plus **System**.
 * Bound to stored `theme` (not resolved paint alone) so **System** stays explicit.
 */
function ThemeSwitcher() {
  const { theme, resolvedTheme, setTheme } = useTheme();

  const triggerTitle =
    theme === "system"
      ? `Following system — currently ${RESOLVED_THEME_SHORT[resolvedTheme]}`
      : "Choose appearance theme";

  return (
    <Menu.Root modal={false}>
      <Menu.Trigger
        render={
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="astw:shrink-0"
            aria-label="Theme"
            title={triggerTitle}
          />
        }
      >
        <Palette className="astw:size-4" aria-hidden />
      </Menu.Trigger>
      <Menu.Content
        position={{ side: "bottom", align: "end", sideOffset: 4 }}
        className="astw:min-w-[16.5rem] astw:rounded-xl astw:p-3"
      >
        <Menu.RadioGroup
          className="astw:grid astw:grid-cols-3 astw:gap-2"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
            gap: "0.5rem",
          }}
          value={theme}
          onValueChange={(value) => {
            if (typeof value === "string" && isTheme(value)) setTheme(value);
          }}
        >
          {THEME_OPTIONS.map((opt) => (
            <Menu.RadioItem
              key={opt.value}
              value={opt.value}
              className={cn(
                "astw:relative astw:flex astw:h-auto astw:w-full astw:cursor-default astw:select-none astw:flex-col astw:items-center astw:justify-center astw:gap-1.5 astw:rounded-xl astw:border-0 astw:bg-transparent astw:px-2 astw:py-2 astw:text-center astw:text-xs astw:font-medium astw:leading-tight astw:outline-hidden",
                "astw:pl-2 astw:pr-2",
                "astw:data-highlighted:bg-muted/80 astw:data-highlighted:text-foreground",
                theme === opt.value &&
                  "astw:bg-primary/12 astw:ring-1 astw:ring-primary/25 astw:data-highlighted:bg-primary/[0.14]",
                "astw:data-disabled:pointer-events-none astw:data-disabled:opacity-50",
                "[&_[data-slot=menu-radio-item-indicator]]:astw:hidden",
              )}
            >
              <Menu.RadioItemIndicator className="astw:sr-only">
                {opt.label}
              </Menu.RadioItemIndicator>
              <ThemePreviewSwatches themeId={opt.value} />
              <span className="astw:block astw:w-full astw:truncate astw:px-0.5">{opt.label}</span>
            </Menu.RadioItem>
          ))}
        </Menu.RadioGroup>
      </Menu.Content>
    </Menu.Root>
  );
}

export { ThemeSwitcher };
