import { useAppShellConfig } from "@/contexts/appshell-context";
import { buildLocaleResolver, type LocalizedString } from "@/lib/i18n";

export const DEFAULT_LOCALE = "en";

/**
 * Hook to get the function to resolve `LocalizedString` instance.
 *
 * This is for internal use cases where you need to resolve them in AppShell configuration.
 */
export const useTitleResolver = () => {
  const { configurations } = useAppShellConfig();
  const resolve = buildLocaleResolver(configurations.locale);

  return (value: LocalizedString | undefined, fallback: string) =>
    resolve(value, fallback);
};

/**
 * Label value can be either a static string or a dynamic function that takes props.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LabelValue = string | ((props: any) => string);

type DynamicLocales<Def extends Record<string, LabelValue>> = {
  [locale: string]: Partial<LabelDefinition<Def>> | undefined;
};

/**
 * Ensures that other locales have the same label structure as the base definition.
 * For dynamic labels (functions), the props type must match.
 */
type LabelDefinition<Def extends Record<string, LabelValue>> = {
  [K in keyof Def]: Def[K] extends (props: infer P) => string
    ? (props: P) => string
    : string;
};

export type I18nLabels<
  Def extends Record<string, LabelValue> = Record<string, LabelValue>,
  L extends string = never,
> = {
  en: Def;
} & { [K in L]: LabelDefinition<Def> } & DynamicLocales<Def>;

/**
 * Defines internationalization labels for multiple locales.
 *
 * `en` locale is required as the default locale.
 * Labels can be either static strings or dynamic functions that take props.
 *
 * @example
 * ```tsx
 * import { defineI18nLabels } from "@tailor-platform/app-shell";
 *
 * export const labels = defineI18nLabels({
 *   en: {
 *     hello: "Hello",
 *     welcome: (props: { name: string }) => `Welcome, ${props.name}!`,
 *   },
 *   ja: {
 *     hello: "こんにちは",
 *     welcome: (props: { name: string }) => `ようこそ、${props.name}さん！`,
 *   },
 * });
 *
 * // Hook to get the translated label resolver function
 * export const useT = labels.useT;
 *
 * // Usage in component
 * const t = useT();
 * t("hello");                        // "Hello"
 * t("welcome", { name: "John" });    // "Welcome, John!"
 * ```
 */
export const defineI18nLabels = <
  const L extends Exclude<string, "en">,
  const Def extends Record<string, LabelValue>,
>(
  labels: { en: Def } & {
    [K in L]: LabelDefinition<Def>;
  } & DynamicLocales<Def>,
) => {
  type T = keyof Def & string;

  const resolveLabel = (locale: string) => (key: T) =>
    (labels[locale] as LabelDefinition<Def> | undefined)?.[key] ??
    labels.en[key];

  /**
   * Type helper to determine if props are required for a given key.
   * If the label is a function, props are required with the correct type.
   * If the label is a string, props should not be passed.
   */
  type TFunctionArgs<K extends T> = Def[K] extends (props: infer P) => string
    ? [props: P]
    : [];

  type TFunction = (<K extends T>(
    key: K,
    ...args: TFunctionArgs<K>
  ) => string) & {
    /**
     * Resolve a label with a dynamic key.
     * This is useful when the key is constructed at runtime.
     *
     * @param key - The dynamic key to resolve
     * @param fallback - The fallback value if the key is not found
     * @returns The resolved label or the fallback value
     *
     * @example
     * ```tsx
     * const employeeType = "STAFF";
     * t.dynamic(`employees.${employeeType}`, "Unknown");  // "Staff"
     * t.dynamic("unknown.key", "Default");                // "Default"
     * ```
     */
    dynamic: (key: string, fallback: string) => string;
  };

  return {
    /**
     * Hook to get the translated label resolver function.
     *
     * @example
     * ```tsx
     * import { useT } from "./i18n-labels";
     *
     * const YourComponent = () => {
     *   const t = useT();
     *
     *   return (
     *     <div>
     *       {t("staticLabel")}
     *       {t("dynamicLabel", { name: "John" })}
     *     </div>
     *   );
     * }
     * ```
     */
    useT: () => {
      const { configurations } = useAppShellConfig();
      const resolve = resolveLabel(configurations.locale);

      const tFunction = (<K extends T>(key: K, ...args: TFunctionArgs<K>) => {
        const label = resolve(key);
        if (typeof label === "function") {
          return label(args[0]);
        }
        return label;
      }) as TFunction;

      tFunction.dynamic = (key: string, fallback: string) => {
        const label =
          (
            labels[configurations.locale] as
              | Record<string, LabelValue>
              | undefined
          )?.[key] ?? (labels.en as Record<string, LabelValue>)[key];
        if (label === undefined || typeof label === "function") {
          return fallback;
        }
        return label;
      };

      return tFunction;
    },

    /**
     * A function to get the translater for a specific label key.
     * This is expected to be used in `meta.title` in module/resource definitions.
     *
     * Note: When using dynamic labels with props in meta.title, the props are
     * bound at definition time (when calling labels.t), not at render time.
     *
     * @example
     * ```tsx
     * import { labels } from "./i18n-labels";
     *
     * const resource = defineResource({
     *   path: "example",
     *   meta: {
     *     title: labels.t("someLabelKey"),
     *     // or with props for dynamic labels
     *     title: labels.t("dynamicKey", { id: "123" }),
     *   },
     *   component: ExampleComponent,
     * });
     * ```
     */
    t:
      <K extends T>(key: K, ...args: TFunctionArgs<K>): LocalizedString =>
      (locale: string) => {
        const label = resolveLabel(locale)(key);
        if (typeof label === "function") {
          return label(args[0]);
        }
        return label;
      },
  };
};
