import { capitalCase } from "change-case";

export type LocalizedString = string | ((locale: string) => string);

export const DEFAULT_LOCALE = "en";

/**
 * Detects the browser's preferred locale using Intl.Locale.
 * Returns the language code (e.g., "ja" from "ja-JP").
 *
 * @returns The browser's preferred language code, or DEFAULT_LOCALE for SSR
 *
 * @example
 * // navigator.languages = ["ja-JP", "en-US"]
 * detectBrowserLocale()  // "ja"
 */
export const detectBrowserLocale = (): string => {
  try {
    if (typeof navigator === "undefined") {
      return DEFAULT_LOCALE;
    }

    const browserLocale = navigator.languages?.[0] ?? navigator.language;
    if (!browserLocale) {
      return DEFAULT_LOCALE;
    }

    const locale = new Intl.Locale(browserLocale);
    return locale.language;
  } catch {
    return DEFAULT_LOCALE;
  }
};

export const buildLocaleResolver =
  (locale: string) =>
  (value: LocalizedString | undefined, fallback: string) => {
    if (!value) return fallback;
    if (typeof value === "string") return value;
    return value(locale) ?? fallback;
  };

export const buildTitleResolver = (locale: string) => {
  const resolve = buildLocaleResolver(locale);
  return (title: LocalizedString, path: string) =>
    resolve(title, typeof title === "string" ? title : capitalCase(path));
};
