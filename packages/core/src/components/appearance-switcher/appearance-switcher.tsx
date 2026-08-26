import { Monitor, Moon, Palette, Sun } from "lucide-react";

import { Menu } from "@/components/menu";
import { Button } from "@/components/button";
import { cn } from "@/lib/utils";
import { defineI18nLabels } from "@/hooks/i18n";
import { useTheme, type ColorTheme, COLOR_THEME_OPTIONS } from "@/contexts/theme-context";

const appearanceSwitcherLabels = defineI18nLabels({
  en: {
    appearance: "Appearance",
    chooseAppearance: "Choose appearance",
    followingSystem: (props: { resolved: string }) =>
      `Following system — currently ${props.resolved}`,
    light: "Light",
    dark: "Dark",
    system: "System",
  },
  ja: {
    appearance: "外観",
    chooseAppearance: "外観を選択",
    followingSystem: (props: { resolved: string }) => `システムに従う — 現在${props.resolved}`,
    light: "ライト",
    dark: "ダーク",
    system: "システム",
  },
});
const useT = appearanceSwitcherLabels.useT;

const COLOR_THEME_ICON: Record<ColorTheme, typeof Sun | typeof Moon | typeof Monitor> = {
  light: Sun,
  dark: Moon,
  system: Monitor,
};

function isColorTheme(value: string): value is ColorTheme {
  return COLOR_THEME_OPTIONS.some((o) => o.value === value);
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

function ColorThemeIcon({ colorTheme }: { colorTheme: ColorTheme }) {
  const Icon = COLOR_THEME_ICON[colorTheme];
  return (
    <div
      className="astw:flex astw:h-10 astw:w-full astw:max-w-[5.5rem] astw:items-center astw:justify-center astw:rounded-md astw:border astw:border-border/80 astw:bg-card astw:px-2"
      aria-hidden
    >
      <Icon className="astw:size-5 astw:shrink-0 astw:text-foreground" />
    </div>
  );
}

/**
 * Appearance menu. The end-user controls **color theme** (light / dark / system);
 * the color palette/brand is a developer configuration, so it is not shown here.
 */
function AppearanceSwitcher() {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const t = useT();

  const triggerTitle =
    theme === "system"
      ? t("followingSystem", { resolved: t(resolvedTheme) })
      : t("chooseAppearance");

  return (
    <Menu.Root modal={false}>
      <Menu.Trigger
        render={
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="astw:shrink-0"
            aria-label={t("appearance")}
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
          <Menu.GroupLabel className="astw:px-0 astw:pb-2 astw:pt-0">
            {t("appearance")}
          </Menu.GroupLabel>
          <Menu.RadioGroup
            className="astw:grid astw:grid-cols-3 astw:gap-2"
            value={theme}
            onValueChange={(value) => {
              if (typeof value === "string" && isColorTheme(value)) setTheme(value);
            }}
          >
            {COLOR_THEME_OPTIONS.map((opt) => (
              <Menu.RadioItem
                key={opt.value}
                value={opt.value}
                className={radioItemClasses(theme === opt.value)}
              >
                <Menu.RadioItemIndicator className="astw:sr-only">
                  {t(opt.value)}
                </Menu.RadioItemIndicator>
                <ColorThemeIcon colorTheme={opt.value} />
                <span className="astw:block astw:w-full astw:truncate astw:px-0.5">
                  {t(opt.value)}
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
