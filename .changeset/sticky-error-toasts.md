---
"@tailor-platform/app-shell": minor
---

Error toasts, and toasts with an `action`, now stay until the user closes them. `useToast` gives `toast.error(...)`, the error state of `toast.promise(...)`, and any call with an `action` the defaults `duration: Infinity` and `closeButton: true`. Before, Sonner closed every toast after 4 seconds, so a failed save could disappear before the user read it, and an Undo could vanish while the user reached for it.

This changes what users see after the update. To keep the previous behavior, or to set your own defaults, use the new `toastDefaults` prop of `AppShell`. A field set there replaces that field only; fields and kinds left out keep the new default. An empty object such as `error: {}` is a type error. See the migration guide (`docs/migrations.md`, 1.21.0).

```tsx
// The previous behavior (4 seconds, no close button) for both kinds
<AppShell
  toastDefaults={{
    error: { duration: 4000, closeButton: false },
    action: { duration: 4000, closeButton: false },
  }}
  modules={modules}
/>
```

A `duration` or `closeButton` passed to the call still wins:

```ts
toast.error("Retrying in 5s", { duration: 5000 }); // closes after 5 seconds
```

A call without an `action` that updates one of these toasts by `id` resets `duration` and `closeButton` to Sonner's defaults unless it passes its own. `toast.custom`, toasts with `dismissible: false`, and success, info, warning and plain toasts without an `action` keep Sonner's defaults. The position (bottom right), the number of visible toasts (3) and the z-index are unchanged. A `toast` imported from `sonner` directly does not get the new defaults.

The toast docs (`patterns/interaction-toast`, `api/use-toast`) now describe the real position, count and durations. They used to say top right, one at a time, and 3 seconds for success.
