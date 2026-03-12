---
title: defineI18nLabels
description: Define internationalized labels for multi-language support
---

# defineI18nLabels

Creates internationalized labels that automatically resolve based on the current locale.

## Signature

```typescript
function defineI18nLabels<T extends Record<string, Record<string, string>>>(
  labels: T
): I18nLabels<T>
```

## Parameters

### `labels`
- **Type:** `Record<string, Record<string, string>>`
- **Required:** Yes
- **Description:** Object mapping label keys to locale-specific strings

## Return Value

```typescript
{
  t: (key: keyof T) => LocalizedString;
}
```

## Usage

### Basic Labels

```typescript
import { defineI18nLabels } from "@tailor-platform/app-shell";

const labels = defineI18nLabels({
  dashboard: {
    en: "Dashboard",
    ja: "ダッシュボード",
  },
  products: {
    en: "Products",
    ja: "商品",
  },
  settings: {
    en: "Settings",
    ja: "設定",
  },
});

// Use in modules
const dashboardModule = defineModule({
  path: "dashboard",
  meta: {
    title: labels.t("dashboard"),
  },
  component: DashboardPage,
});
```

### Multiple Locales

```typescript
const labels = defineI18nLabels({
  welcome: {
    en: "Welcome",
    ja: "ようこそ",
    es: "Bienvenido",
    fr: "Bienvenue",
  },
});
```

### In Components

```typescript
function WelcomeMessage() {
  const labels = defineI18nLabels({
    greeting: {
      en: "Hello",
      ja: "こんにちは",
    },
  });

  return <h1>{labels.t("greeting")}</h1>;
}
```

### With SidebarGroup

```typescript
import { SidebarGroup } from "@tailor-platform/app-shell";

const labels = defineI18nLabels({
  admin: {
    en: "Administration",
    ja: "管理",
  },
});

<SidebarGroup title={labels.t("admin")}>
  <SidebarItem to="/admin/users" />
</SidebarGroup>
```

## Setting Locale

The active locale is controlled by the `locale` prop on `AppShell`:

```typescript
<AppShell locale="ja" modules={modules}>
  <SidebarLayout />
</AppShell>
```

Supported locales: `en`, `ja`

If not specified, auto-detects from browser settings.

## TypeScript

Full type safety:

```typescript
const labels = defineI18nLabels({
  dashboard: { en: "Dashboard", ja: "ダッシュボード" },
  products: { en: "Products", ja: "商品" },
});

labels.t("dashboard"); // ✅ Valid
labels.t("invalid");   // ❌ Type error
```

## Related

- [Internationalization Guide](../guides/internationalization.md) - Complete i18n guide
- [defineModule](./define-module.md) - Use labels in modules
