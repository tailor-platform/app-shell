---
kind: code-backed
group: define-i18n-labels
title: defineI18nLabels
description: Type-safe locale-first labels for component text and localized navigation metadata
sources:
  - packages/core/src/hooks/i18n.ts
---

# defineI18nLabels

Defines a label catalog and returns two resolvers: a React Hook for rendered text and a `LocalizedString` factory for AppShell configuration. No additional i18n package is required.

## Define a Catalog

Create the catalog once at module scope, not inside a component. The object is **locale-first**: `en` is the required base locale; each locale contains a flat map of label keys to strings or functions that return strings.

```tsx
// i18n-labels.ts
import { defineI18nLabels } from "@tailor-platform/app-shell";

export const labels = defineI18nLabels({
  en: {
    title: "Requests",
    save: "Save",
    greeting: ({ name }: { name: string }) => `Hello, ${name}!`,
    itemCount: ({ count }: { count: number }) => (count === 1 ? "1 item" : `${count} items`),
    "status.PENDING": "Pending",
    unknownStatus: "Unknown status",
  },
  ja: {
    title: "申請一覧",
    save: "保存",
    greeting: ({ name }: { name: string }) => `こんにちは、${name}さん！`,
    itemCount: ({ count }: { count: number }) => `${count}件`,
    "status.PENDING": "承認待ち",
    unknownStatus: "不明な状態",
  },
});

export const useT = labels.useT;
```

`useT` above is exported by **your catalog module**, not directly by `@tailor-platform/app-shell`. The component examples below use this shared setup; import `labels` and `useT` from `./i18n-labels` in application files.

Do not use the old label-first form `{ title: { en: "Requests", ja: "申請一覧" } }`. Nested key objects are not supported; a dotted key such as `"status.PENDING"` is an ordinary flat string key.

## Return Value

| Member                     | Returns                                | Use for                                                                                  |
| -------------------------- | -------------------------------------- | ---------------------------------------------------------------------------------------- |
| `labels.useT()`            | A resolver `t` that returns a `string` | Text rendered by a React component, string-valued props, toasts, and validation messages |
| `t(key, props?)`           | `string`                               | A known label key, with required props for function-valued labels                        |
| `t.dynamic(key, fallback)` | `string`                               | A runtime string key for a **static** label                                              |
| `labels.t(key, props?)`    | `LocalizedString`                      | `meta.title`, `meta.breadcrumbTitle`, and props explicitly accepting `LocalizedString`   |

`LocalizedString` is `string | ((locale: string) => string)`. `labels.t()` creates a locale callback, **not rendered text**. Do not put its result directly into JSX children or pass it to a prop that accepts only `string`.

## In Components: `useT()`

Call the Hook at the top level of a component under `AppShell`. The returned resolver reads the current AppShell locale.

<!-- example: in-components -->

Use the same resolver for string props such as `placeholder`, `aria-label`, or `Layout.Header`'s `title`, and inside event handlers for localized notifications. Do not call a Hook in an event handler; capture `t` during render.

## Function-valued Labels: Typed Props

Use a function for a whole sentence containing runtime values. Its props are inferred from the English definition and checked for the other declared locales. Keep pluralization and word order inside each locale's function rather than concatenating translated fragments.

<!-- example: dynamic-labels -->

Both `t("greeting", { name })` and `labels.t("greeting", { name })` require the correct props. When using `labels.t()` for metadata, props are bound **when `labels.t()` is called**, not fetched at render time. For a breadcrumb depending on a URL segment, see [Routing & Navigation](../concepts/routing-navigation.md#dynamic-breadcrumb-titles).

## Runtime Keys: `t.dynamic()`

`t.dynamic(key: string, fallback: string)` accepts a key constructed at runtime, for example from a server enum. Keep the enum stable and translate only its display label.

<!-- example: runtime-keys -->

Resolution order:

1. Look up the key in the current locale.
2. If absent, look it up in `en`.
3. If the resolved value is missing **or is a function**, return the supplied fallback unchanged.

The fallback is not translated automatically. Prefer another translated label, as above, instead of an English literal. `t.dynamic()` does not accept label props; use typed `t(key, props)` for function-valued labels. Prefer typed `t(key)` whenever the key is known at compile time.

## Navigation Metadata: `labels.t()`

Module and resource definitions are usually outside React components, so they cannot call Hooks. Pass the locale callback to AppShell, which resolves it using the active locale:

```tsx
import { defineModule } from "@tailor-platform/app-shell";
import { labels } from "./i18n-labels";

const requestModule = defineModule({
  path: "requests",
  meta: {
    title: labels.t("title"),
    breadcrumbTitle: labels.t("title"),
  },
  component: InComponents,
  resources: [],
});
```

The same approach works for `defineResource().meta` and `SidebarGroup`, `SidebarSection`, and `SidebarItem` title overrides. For ordinary string-valued component props, use the Hook resolver instead.

## Setting Locale and Fallbacks

Choose the app's UI language explicitly when it is fixed:

```tsx
<AppShell locale="ja-JP" modules={[requestModule]}>
  <SidebarLayout />
</AppShell>
```

- AppShell normalizes a BCP-47 tag such as `ja-JP` to `ja` for label lookup. Use language keys such as `ja` in the catalog, not `ja-JP`.
- If `locale` is omitted, AppShell uses the browser's preferred language. If browser locale information is unavailable or invalid, it uses `en`.
- If a catalog has no definition for the selected language, labels fall back to `en`. A missing localized key also falls back to its English value at runtime.
- Custom catalogs can define other languages such as `fr`; this does **not** translate AppShell's built-in UI. Its shared built-in catalog currently supplies English and Japanese, with English fallback for other languages.
- For regional date and number formatting, use the full tag from [useResolvedLocale](./use-resolved-locale.md); label translation does not format dates, numbers, or time zones automatically.

## TypeScript Contract

With an ordinary inferred definition such as the catalog above:

- `en` is required, even for an app whose selected UI language is Japanese.
- Other explicitly declared locales must supply all base keys and compatible function props. Translation omissions become compile errors.
- `t()` and `labels.t()` reject unknown keys, missing or wrongly typed function props, and props passed to static labels.
- `t.dynamic()` deliberately accepts any string key; unknown keys are handled by its required fallback instead of compile-time validation.

These checks validate structure and call sites, not translation quality or language consistency.

<!-- api -->

## Related

- [i18n Labels Pattern](../patterns/i18n-labels.md) — UI language decisions, key naming, file splitting, and server-originated text
- [defineModule](./define-module.md) — localized navigation metadata
- [defineResource](./define-resource.md) — localized resource metadata
- [useResolvedLocale](./use-resolved-locale.md) — full locale for formatting
