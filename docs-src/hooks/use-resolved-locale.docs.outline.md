---
kind: prose
group: use-resolved-locale
title: useResolvedLocale
description: Hook to access the full BCP-47 locale and language code from AppShell context
---

# useResolvedLocale

React hook that returns the full BCP-47 locale (e.g. `"en-GB"`) and the language code (e.g. `"en"`) from the AppShell context. Use this for `Intl` APIs and date formatting that require a specific locale.

## Signature

```typescript
const useResolvedLocale: () => {
  locale: string;
  language: string;
};
```

## Return Value

### `locale`

- **Type:** `string`
- **Description:** Full BCP-47 locale tag (e.g. `"en-GB"`, `"ja-JP"`). Sourced from the `locale` prop passed to `AppShell`, or auto-detected from the browser when omitted.

### `language`

- **Type:** `string`
- **Description:** Language subtag only (e.g. `"en"`, `"ja"`). Used for resolving built-in UI label tables.

## Usage

Import `Text` and `useResolvedLocale` from `@tailor-platform/app-shell`. These examples format fixed values using the documentation browser's locale.

<!-- example: date-display -->

### Locale-aware number formatting

<!-- example: price-display -->

## Related

- [AppShell](../components/app-shell.md) — configure locale via the `locale` prop
- [useTimeZone](./use-time-zone.md) — access the configured IANA timezone
- [DatePicker](../components/date-picker.md) — date input components that consume this locale automatically
