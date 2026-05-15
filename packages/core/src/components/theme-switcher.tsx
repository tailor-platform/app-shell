import { Palette } from "lucide-react";

import { Menu } from "@/components/menu";
import { Button } from "@/components/button";
import { cn } from "@/lib/utils";
import {
  useTheme,
  useFont,
  type ResolvedTheme,
  type Theme,
  type Font,
  THEME_OPTIONS,
  FONT_OPTIONS,
} from "@/contexts/theme-context";

const RESOLVED_THEME_SHORT: Record<ResolvedTheme, string> = {
  light: "Light",
  dark: "Dark",
  cream: "Cream",
  bloom: "Bloom",
};

/**
 * Decorative dual swatches — approximates each palette pair (accent + neutral) for the picker grid.
 * Kept as static hex previews so the swatches render even before a theme stylesheet has loaded;
 * keep these in sync with the palette tokens in `assets/theme.css`.
 */
const THEME_PREVIEW: Record<Theme, { readonly a: `#${string}`; readonly b: `#${string}` }> = {
  light: { a: "#ffffff", b: "#d4d4d8" },
  dark: { a: "#3f3f46", b: "#d4d4d8" },
  cream: { a: "#f8f3e4", b: "#e2d4fe" },
  bloom: { a: "#535ae8", b: "#f8f3e4" },
  system: { a: "#52525b", b: "#7c73e6" },
};

/** Font preview — `font-family` for the "Aa" sample so users see the face before selecting.
 *  Mirrors the chain in `globals.css` (variable build first, then static family fallback). */
const FONT_PREVIEW: Record<Font, string> = {
  geist: '"Geist Variable", "Geist Sans", ui-sans-serif, system-ui, sans-serif',
  inter: '"Inter Variable", "Inter", ui-sans-serif, system-ui, sans-serif',
};

function isTheme(value: string): value is Theme {
  return THEME_OPTIONS.some((o) => o.value === value);
}

function isFont(value: string): value is Font {
  return FONT_OPTIONS.some((o) => o.value === value);
}

/** Shared radio-item chrome — used by both the color and font grids. */
function radioItemClasses(active: boolean) {
  return cn(
    "astw:relative astw:flex astw:h-auto astw:w-full astw:cursor-default astw:select-none astw:flex-col astw:items-center astw:justify-center astw:gap-1.5 astw:rounded-xl astw:border-0 astw:bg-transparent astw:px-2 astw:py-2 astw:text-center astw:text-xs astw:font-medium astw:leading-tight astw:outline-hidden",
    "astw:data-highlighted:bg-muted/80 astw:data-highlighted:text-foreground",
    "astw:data-disabled:pointer-events-none astw:data-disabled:opacity-50",
    "[&_[data-slot=menu-radio-item-indicator]]:astw:hidden",
    active &&
      "astw:bg-primary/12 astw:ring-1 astw:ring-primary/25 astw:data-highlighted:bg-primary/[0.14]",
  );
}

function ThemePreviewSwatches({ themeId }: { themeId: Theme }) {
  const { a, b } = THEME_PREVIEW[themeId];
  return (
    <div
      className="astw:flex astw:h-10 astw:w-full astw:max-w-[5.5rem] astw:items-center astw:justify-center astw:gap-1.5 astw:rounded-md astw:border astw:border-border/80 astw:bg-card astw:px-2"
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

function FontPreview({ fontId }: { fontId: Font }) {
  return (
    <div
      className="astw:flex astw:h-10 astw:w-full astw:items-center astw:justify-center astw:rounded-md astw:border astw:border-border/80 astw:bg-card astw:px-2"
      aria-hidden
    >
      <span
        className="astw:text-lg astw:font-medium astw:leading-none astw:text-foreground"
        style={{ fontFamily: FONT_PREVIEW[fontId] }}
      >
        Aa
      </span>
    </div>
  );
}

/**
 * Appearance menu: two independent axes — color palette (top) and font (bottom).
 * Bound to stored `theme` and `font`; **System** stays explicit on the color axis.
 */
function ThemeSwitcher() {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const { font, setFont } = useFont();

  const fontLabel = FONT_OPTIONS.find((o) => o.value === font)?.label ?? font;
  const triggerTitle =
    theme === "system"
      ? `Following system — currently ${RESOLVED_THEME_SHORT[resolvedTheme]} · ${fontLabel}`
      : "Choose appearance — color + font";

  return (
    <Menu.Root modal={false}>
      <Menu.Trigger
        render={
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="astw:shrink-0"
            aria-label="Appearance"
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
        <Menu.Group>
          <Menu.GroupLabel className="astw:px-0 astw:pb-2 astw:pt-0">Colors</Menu.GroupLabel>
          <Menu.RadioGroup
            className="astw:grid astw:grid-cols-3 astw:gap-2"
            value={theme}
            onValueChange={(value) => {
              if (typeof value === "string" && isTheme(value)) setTheme(value);
            }}
          >
            {THEME_OPTIONS.map((opt) => (
              <Menu.RadioItem
                key={opt.value}
                value={opt.value}
                className={radioItemClasses(theme === opt.value)}
              >
                <Menu.RadioItemIndicator className="astw:sr-only">
                  {opt.label}
                </Menu.RadioItemIndicator>
                <ThemePreviewSwatches themeId={opt.value} />
                <span className="astw:block astw:w-full astw:truncate astw:px-0.5">
                  {opt.label}
                </span>
              </Menu.RadioItem>
            ))}
          </Menu.RadioGroup>
        </Menu.Group>

        <Menu.Group className="astw:mt-5">
          <Menu.GroupLabel className="astw:px-0 astw:pb-2 astw:pt-0">Font</Menu.GroupLabel>
          <Menu.RadioGroup
            className="astw:grid astw:grid-cols-2 astw:gap-2"
            value={font}
            onValueChange={(value) => {
              if (typeof value === "string" && isFont(value)) setFont(value);
            }}
          >
            {FONT_OPTIONS.map((opt) => (
              <Menu.RadioItem
                key={opt.value}
                value={opt.value}
                className={radioItemClasses(font === opt.value)}
              >
                <Menu.RadioItemIndicator className="astw:sr-only">
                  {opt.label}
                </Menu.RadioItemIndicator>
                <FontPreview fontId={opt.value} />
                <span className="astw:block astw:w-full astw:truncate astw:px-0.5">
                  {opt.label}
                </span>
              </Menu.RadioItem>
            ))}
          </Menu.RadioGroup>
        </Menu.Group>
      </Menu.Content>
    </Menu.Root>
  );
}

export { ThemeSwitcher };
