import { Palette } from "lucide-react";

import { Menu } from "@/components/menu";
import { Button } from "@/components/button";
import { cn } from "@/lib/utils";
import {
  useColorMode,
  type ResolvedColorMode,
  type ColorMode,
  COLOR_MODE_OPTIONS,
} from "@/contexts/theme-context";

const RESOLVED_MODE_SHORT: Record<ResolvedColorMode, string> = {
  light: "Light",
  dark: "Dark",
};

/**
 * Decorative dual swatches for the mode picker. Light/dark show their surface
 * tones; system splits the two to signal "follows the OS".
 * Kept as static hex previews so they render before any stylesheet loads.
 */
const MODE_PREVIEW: Record<ColorMode, { readonly a: `#${string}`; readonly b: `#${string}` }> = {
  light: { a: "#ffffff", b: "#d4d4d8" },
  dark: { a: "#3f3f46", b: "#71717a" },
  system: { a: "#ffffff", b: "#3f3f46" },
};

function isMode(value: string): value is ColorMode {
  return COLOR_MODE_OPTIONS.some((o) => o.value === value);
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

function ModePreviewSwatches({ modeId }: { modeId: ColorMode }) {
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

/**
 * Appearance menu. The end-user controls **mode** (light / dark / system);
 * the color palette/brand is a developer configuration, so it is not shown here.
 */
function AppearanceSwitcher() {
  const { mode, resolvedMode, setMode } = useColorMode();

  const triggerTitle =
    mode === "system"
      ? `Following system — currently ${RESOLVED_MODE_SHORT[resolvedMode]}`
      : "Choose appearance";

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
            {COLOR_MODE_OPTIONS.map((opt) => (
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
      </Menu.Content>
    </Menu.Root>
  );
}

export { AppearanceSwitcher };
