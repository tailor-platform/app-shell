---
"@tailor-platform/app-shell": minor
---

Add typography role tokens. A role sets font size, line height, font weight, and letter spacing together. Ten `text-*` utilities are available after you import `@tailor-platform/app-shell/styles`: `text-heading-lg`, `text-heading-md`, `text-heading-sm`, `text-body-md`, `text-body-sm`, `text-label-md`, `text-label-sm`, `text-code-sm`, `text-body-md-relaxed`, and `text-body-sm-relaxed`.

```tsx
<h2 className="text-heading-md">Purchase orders</h2>
<p className="text-body-md text-muted-foreground">Orders sent to suppliers this month.</p>
```

Each role reads four CSS variables named `--app-shell-type-<role>-<size|line-height|weight|letter-spacing>`, which you can override on `:root`. AppShell's `cn()` now keeps a role together with a text color class, for example in `className="text-label-md text-muted-foreground"` passed to an AppShell component. If your app has its own `tailwind-merge` setup, see the Typography section of the styling guide.
