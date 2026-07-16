---
"@tailor-platform/app-shell": minor
---

Add a built-in `/__appinfo` page to `AppShell` for exposing app metadata and the current AppShell version.

```tsx
<AppShell
  title="My App"
  appInfo={{
    metadata: [
      { label: "Environment", value: "staging" },
      { label: "Release", value: "2026.07.16" },
    ],
  }}
/>
```

The page stays out of AppShell's built-in auto-generated sidebar navigation, appears in the Command Palette as a page entry, and includes a copy button for the rendered app information.
