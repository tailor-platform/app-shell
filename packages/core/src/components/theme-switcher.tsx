import { Palette } from "lucide-react";

import { Menu } from "@/components/menu";
import { Button } from "@/components/button";
import { cn } from "@/lib/utils";
import {
  useMode,
  useFont,
  type ResolvedMode,
  type Mode,
  type Font,
  MODE_OPTIONS,
  FONT_OPTIONS,
} from "@/contexts/theme-context";

const RESOLVED_MODE_SHORT: Record<ResolvedMode, string> = {
  light: "Light",
  dark: "Dark",
};

/**
 * Decorative dual swatches for the mode picker. Light/dark show their surface
 * tones; system splits the two to signal "follows the OS".
 * Kept as static hex previews so they render before any stylesheet loads.
 */
const MODE_PREVIEW: Record<Mode, { readonly a: `#${string}`; readonly b: `#${string}` }> = {
  light: { a: "#ffffff", b: "#d4d4d8" },
  dark: { a: "#3f3f46", b: "#71717a" },
  system: { a: "#ffffff", b: "#3f3f46" },
};

/** Font preview — `font-family` for the "Aa" sample so users see the face before selecting.
 *  Mirrors the chain in `globals.css` (variable build first, then static family fallback). */
const FONT_PREVIEW: Record<Font, string> = {
  geist: '"Geist Variable", "Geist Sans", ui-sans-serif, system-ui, sans-serif',
  inter: '"Inter Variable", "Inter", ui-sans-serif, system-ui, sans-serif',
};

function isMode(value: string): value is Mode {
  return MODE_OPTIONS.some((o) => o.value === value);
}

function isFont(value: string): value is Font {
  return FONT_OPTIONS.some((o) => o.value === value);
}

/** Shared radio-item chrome — used by both the mode and font grids. */
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

function ModePreviewSwatches({ modeId }: { modeId: Mode }) {
  const { a, b } = MODE_PREVIEW[modeId];
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
 * Appearance menu. The end-user controls **mode** (light / dark / system) and
 * **font**; the color palette/brand is a developer configuration, so it is not
 * shown here. **System** stays explicit on the mode axis.
 */
function ThemeSwitcher() {
  const { mode, resolvedMode, setMode } = useMode();
  const { font, setFont } = useFont();

  const fontLabel = FONT_OPTIONS.find((o) => o.value === font)?.label ?? font;
  const triggerTitle =
    mode === "system"
      ? `Following system — currently ${RESOLVED_MODE_SHORT[resolvedMode]} · ${fontLabel}`
      : "Choose appearance — mode + font";

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
          <Menu.GroupLabel className="astw:px-0 astw:pb-2 astw:pt-0">Appearance</Menu.GroupLabel>
          <Menu.RadioGroup
            className="astw:grid astw:grid-cols-3 astw:gap-2"
            value={mode}
            onValueChange={(value) => {
              if (typeof value === "string" && isMode(value)) setMode(value);
            }}
          >
            {MODE_OPTIONS.map((opt) => (
              <Menu.RadioItem
                key={opt.value}
                value={opt.value}
                className={radioItemClasses(mode === opt.value)}
              >
                <Menu.RadioItemIndicator className="astw:sr-only">
                  {opt.label}
                </Menu.RadioItemIndicator>
                <ModePreviewSwatches modeId={opt.value} />
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
